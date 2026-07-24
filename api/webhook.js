// api/webhook.js
const crypto = require('crypto');
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');

function ensureFirebase() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }
}

// Grava/le no Realtime DB via API REST (evita o websocket do SDK admin, que é
// lento/instável no serverless).
async function dbRest(method, path, value) {
  const token = (await getApp().options.credential.getAccessToken()).access_token;
  const url = `${process.env.FIREBASE_DATABASE_URL}/${path}.json?access_token=${token}`;
  const opts = { method };
  if (value !== undefined) opts.body = JSON.stringify(value);
  const r = await fetch(url, opts);
  const text = await r.text();
  if (!r.ok) throw new Error(`DB ${method} ${r.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) {
    // still run comparison to avoid length-based timing leak
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

const handler = async (req, res) => {
  // Webhook não precisa de CORS — é chamado server-to-server pelo AbacatePay
  res.setHeader('Access-Control-Allow-Origin', 'https://api.abacatepay.com');

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // AbacatePay envia o segredo como query string: ?webhookSecret=... (não em header).
  // Mantém fallback para o header caso a origem envie por lá.
  const token = req.query?.webhookSecret || req.headers['x-webhook-secret'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!token || !secret || !timingSafeEqual(token, secret)) {
    console.warn('Webhook auth falhou:', JSON.stringify({
      temQuery: !!req.query?.webhookSecret,
      temHeader: !!req.headers['x-webhook-secret'],
      tokenLen: token ? String(token).length : 0,
      secretLen: secret ? String(secret).length : 0,
      match: (token && secret) ? String(token) === String(secret) : false,
    }));
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const event = req.body;
  const eventType = event?.event || event?.data?.status || 'unknown';
  console.log('Webhook recebido:', eventType, 'id:', event?.data?.id || 'N/A');

  const isPaid = (
    event?.event === 'billing.paid' ||
    event?.data?.status === 'PAID' ||
    event?.data?.status === 'COMPLETED'
  );

  if (!isPaid) return res.status(200).json({ ok: true, ignored: true });

  const chargeId = event?.data?.id || null;

  try {
    ensureFirebase();

    // Descobre o uid: primeiro via metadata/externalId (se a AbacatePay ecoar),
    // senão pelo mapa chargeId -> uid gravado no create-charge (fonte confiável).
    let uid = event?.data?.metadata?.firebaseUid || event?.data?.externalId;
    if (!uid && chargeId) {
      const pc = await dbRest('GET', `pendingCharges/${chargeId}`);
      uid = pc?.uid;
    }
    if (!uid) return res.status(400).json({ error: 'firebaseUid não encontrado' });

    const now = Date.now();
    const planExpiresAt = now + (30 * 24 * 60 * 60 * 1000);
    const currentYM = new Date().toISOString().slice(0, 7);

    await dbRest('PATCH', `users/${uid}/plan`, {
      plan: 'premium',
      planExpiresAt,
      planActivatedAt: now,
      lastChargeId: chargeId,
      notesCreatedThisMonth: 0,
      lastReset: currentYM,
    });

    // Remove o mapa temporário depois de ativar.
    if (chargeId) dbRest('DELETE', `pendingCharges/${chargeId}`).catch(() => {});

    console.log('Premium ativado para uid:', uid.slice(0, 8) + '...');
    return res.status(200).json({ ok: true, planExpiresAt });

  } catch (err) {
    console.error('Firebase error:', err.message);
    return res.status(500).json({ error: 'Erro Firebase' });
  }
};

module.exports = handler;

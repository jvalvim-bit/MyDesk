// api/webhook.js
const crypto = require('crypto');
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');

function getFirebase() {
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
  return getDatabase();
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

  // Secret apenas via header, nunca via query string (evita vazamento em logs)
  const token = req.headers['x-webhook-secret'];
  const secret = process.env.WEBHOOK_SECRET;

  if (!token || !secret || !timingSafeEqual(token, secret)) {
    console.warn('Webhook: token inválido ou ausente');
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

  // metadata nem sempre é ecoada de volta pelo webhook — externalId é o
  // campo garantido pela AbacatePay no payload, então serve de fallback.
  const uid = event?.data?.metadata?.firebaseUid || event?.data?.externalId;
  if (!uid) return res.status(400).json({ error: 'firebaseUid não encontrado' });

  try {
    const db = getFirebase();
    const now = Date.now();
    const planExpiresAt = now + (30 * 24 * 60 * 60 * 1000);
    const currentYM = new Date().toISOString().slice(0, 7);

    await db.ref(`users/${uid}/plan`).update({
      plan: 'premium',
      planExpiresAt,
      planActivatedAt: now,
      lastChargeId: event?.data?.id || null,
      notesCreatedThisMonth: 0,
      lastReset: currentYM,
    });

    console.log('Premium ativado para uid:', uid.slice(0, 8) + '...');
    return res.status(200).json({ ok: true, planExpiresAt });

  } catch (err) {
    console.error('Firebase error:', err.message);
    return res.status(500).json({ error: 'Erro Firebase' });
  }
};

module.exports = handler;

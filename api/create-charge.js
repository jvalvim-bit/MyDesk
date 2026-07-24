// api/create-charge.js
const { initializeApp, cert, getApps, getApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Grava/le no Realtime DB via API REST. O SDK admin usa websocket, que é lento
// e instável em funções serverless (causava "FIREBASE WARNING" + timeout).
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

const ALLOWED_ORIGINS = [
  'https://jvalvim-bit.github.io',
  'https://mydesk-eta.vercel.app',
];

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

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

const handler = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Nunca confiar em um uid enviado pelo cliente — verifica o ID token do
  // Firebase Auth e usa o uid que vem de dentro dele. Sem isso, qualquer um
  // podia mandar o uid de outra pessoa e gerar cobranças/ativar premium na
  // conta de outro usuário.
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) return res.status(401).json({ error: 'Não autenticado' });

  let uid, email, name;
  try {
    ensureFirebase();
    const decoded = await getAuth().verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email || `user-${uid}@mydesk.app`;
    name  = decoded.name || (decoded.email ? decoded.email.split('@')[0] : null) || 'Assinante MyDesk';
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  const ABACATE_KEY = process.env.ABACATE_API_KEY;
  if (!ABACATE_KEY) return res.status(500).json({ error: 'API key não configurada' });

  const BASE = 'https://api.abacatepay.com/v1';
  const headers = {
    'Authorization': `Bearer ${ABACATE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    // Usa billing/create (checkout) para a cobrança APARECER no painel do
    // AbacatePay ("Cobranças") e poder ser simulada/gerida por lá. Exige um
    // customer (os dados reais do pagador são coletados na página de checkout).
    // Quando pago, dispara billing.paid. A correlação com o uid é feita pelo
    // mapa chargeId -> uid gravado no Realtime DB (abaixo), lido no webhook.
    const chargeRes = await fetch(`${BASE}/billing/create`, {
      method: 'POST', headers,
      body: JSON.stringify({
        frequency: 'ONE_TIME',
        methods: ['PIX'],
        products: [{
          externalId: 'mydesk-premium-monthly',
          name: 'MyDesk Premium — 1 mês',
          description: 'Notas ilimitadas por 30 dias',
          quantity: 1,
          price: 1000,
        }],
        customer: { name, email, cellphone: '', taxId: '' },
        returnUrl: 'https://jvalvim-bit.github.io/MyDesk/',
        completionUrl: 'https://jvalvim-bit.github.io/MyDesk/?premium=activated',
      }),
    });
    const chargeData = await chargeRes.json();
    if (!chargeRes.ok || chargeData.error) {
      return res.status(500).json({ error: 'Erro cobrança', details: chargeData });
    }

    const bill = chargeData.data;
    console.log('Billing created:', bill?.id);

    // Guarda o mapeamento chargeId -> uid para o webhook saber qual usuário pagou.
    if (bill?.id) {
      try {
        await dbRest('PUT', `pendingCharges/${bill.id}`, { uid, createdAt: Date.now() });
        console.log('pendingCharges gravado:', bill.id);
      } catch (e) {
        console.error('Falha ao gravar pendingCharges:', e.message);
      }
    }

    return res.status(200).json({ ok: true, id: bill?.id, url: bill?.url });

  } catch (err) {
    console.error('Error creating charge:', err.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

module.exports = handler;

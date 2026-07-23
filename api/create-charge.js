// api/create-charge.js
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

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

function getFirebaseAdmin() {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId:   process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }
  return getAuth();
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

  let uid;
  try {
    const decoded = await getFirebaseAdmin().verifyIdToken(idToken);
    uid = decoded.uid;
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
    // Cria a cobrança diretamente — sem etapa de cliente (customer é opcional
    // no /billing/create, e exigiria cellphone/taxId que o app não coleta).
    // externalId + metadata carregam o uid do Firebase pra correlacionar
    // com o evento billing.paid recebido no webhook.
    const chargeRes = await fetch(`${BASE}/billing/create`, {
      method: 'POST', headers,
      body: JSON.stringify({
        frequency: 'ONE_TIME',
        methods: ['PIX'],
        externalId: uid,
        products: [{
          externalId: 'mydesk-premium-monthly',
          name: 'MyDesk Premium — 1 mês',
          description: 'Notas ilimitadas por 30 dias',
          quantity: 1,
          price: 1000,
        }],
        metadata: { firebaseUid: uid },
        returnUrl: 'https://jvalvim-bit.github.io/mydesk/',
        completionUrl: 'https://jvalvim-bit.github.io/mydesk/?premium=activated',
      }),
    });
    const chargeData = await chargeRes.json();
    if (!chargeRes.ok || chargeData.error) {
      return res.status(500).json({ error: 'Erro cobrança', details: chargeData });
    }

    const bill = chargeData.data;
    console.log('Charge created:', bill?.id);

    return res.status(200).json({ ok: true, url: bill?.url, chargeId: bill?.id });

  } catch (err) {
    console.error('Error creating charge:', err.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
};

module.exports = handler;

// api/create-charge.js
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
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

const handler = async (req, res) => {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const origin = req.headers.origin || '';
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const { uid, email, name } = req.body || {};
  if (!uid || !email) return res.status(400).json({ error: 'uid e email obrigatórios' });

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

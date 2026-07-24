// api/dev-simulate.js — TEMPORÁRIO (remover após teste).
// Simula o pagamento de um pixQrCode usando a ABACATE_API_KEY do runtime.
// Protegido por ?secret= (DEV_SIM_SECRET). Só funciona com chave dev.
const handler = async (req, res) => {
  const secret = process.env.DEV_SIM_SECRET;
  if (!secret || req.query.secret !== secret) return res.status(401).json({ error: 'Unauthorized' });

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'informe ?id=' });

  const key = process.env.ABACATE_API_KEY || '';
  const mode = (key.match(/^abc_(dev|prod)_/) || [])[0] || 'desconhecido';

  try {
    const r = await fetch(`https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ metadata: {} }),
    });
    const text = await r.text();
    return res.status(200).json({ keyMode: mode, abacateStatus: r.status, abacateResp: text.slice(0, 600) });
  } catch (e) {
    return res.status(500).json({ keyMode: mode, error: e.message });
  }
};
module.exports = handler;

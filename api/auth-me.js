const { createHmac, timingSafeEqual } = require('node:crypto');
const parseCookies = (cookie = '') => Object.fromEntries(cookie.split(';').map(v => v.trim()).filter(Boolean).map(v => { const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))]; }));
const sign = value => createHmac('sha256', process.env.RSO_SESSION_SECRET).update(value).digest('base64url');
module.exports = async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.rso_session || !process.env.RSO_SESSION_SECRET) return res.status(200).json({ ok: true, signedIn: false });
  try {
    const [payload, signature] = cookies.rso_session.split('.');
    const expected = sign(payload);
    if (!payload || !signature || signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return res.status(200).json({ ok: true, signedIn: false });
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!session.account || session.exp <= Date.now()) return res.status(200).json({ ok: true, signedIn: false });
    return res.status(200).json({ ok: true, signedIn: true, account: session.account });
  } catch {
    return res.status(200).json({ ok: true, signedIn: false });
  }
};

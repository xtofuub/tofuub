const parseCookies = (cookie = '') => Object.fromEntries(cookie.split(';').map(v => v.trim()).filter(Boolean).map(v => { const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))]; }));
module.exports = async function handler(req, res) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies.rso_session) return res.status(200).json({ ok: true, signedIn: false });
  try {
    const session = JSON.parse(Buffer.from(cookies.rso_session, 'base64url').toString('utf8'));
    if (!session.accessToken || session.expiresAt <= Date.now()) return res.status(200).json({ ok: true, signedIn: false });
    return res.status(200).json({ ok: true, signedIn: true, account: session.account });
  } catch {
    return res.status(200).json({ ok: true, signedIn: false });
  }
};

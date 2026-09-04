function handler(req, res) {
  const clientId = process.env.RSO_CLIENT_ID;
  const base = process.env.APP_BASE_URL || `https://${req.headers.host}`;
  const redirectUri = process.env.RSO_REDIRECT_URI || `${base}/api/auth-callback`;
  if (!clientId) return res.status(503).json({ ok: false, error: 'Riot Sign On is not configured yet.' });
  const state = crypto.randomUUID();
  res.setHeader('Set-Cookie', `rso_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  const url = new URL('https://auth.riotgames.com/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid offline_access');
  return res.redirect(302, url.toString());
}
module.exports = handler;

const { createHmac } = require('node:crypto');
const parseCookies = (cookie = '') => Object.fromEntries(cookie.split(';').map(v => v.trim()).filter(Boolean).map(v => { const i = v.indexOf('='); return [decodeURIComponent(v.slice(0, i)), decodeURIComponent(v.slice(i + 1))]; }));
const sessionSecret = () => process.env.RSO_SESSION_SECRET;
const sign = value => createHmac('sha256', sessionSecret()).update(value).digest('base64url');
const makeSession = account => { const payload = Buffer.from(JSON.stringify({ account, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url'); return `${payload}.${sign(payload)}`; };
const sessionCookie = value => `rso_session=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 30}`;
module.exports = async function handler(req, res) {
  try {
    const code = req.query?.code;
    const state = req.query?.state;
    const cookies = parseCookies(req.headers.cookie);
    if (!code || !state || state !== cookies.rso_state) return res.status(400).send('Invalid Riot Sign On callback.');
    const clientId = process.env.RSO_CLIENT_ID;
    const clientSecret = process.env.RSO_CLIENT_SECRET;
    const secret = sessionSecret();
    const base = process.env.APP_BASE_URL || `https://${req.headers.host}`;
    const redirectUri = process.env.RSO_REDIRECT_URI || `${base}/api/auth-callback`;
    if (!clientId || !clientSecret || !secret) return res.status(503).send('RSO is not configured on this deployment.');
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const tokenRes = await fetch('https://auth.riotgames.com/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri })
    });
    if (!tokenRes.ok) return res.status(502).send('Riot Sign On token exchange failed.');
    const token = await tokenRes.json();
    const accountRes = await fetch('https://europe.api.riotgames.com/riot/account/v1/accounts/me', { headers: { Authorization: `Bearer ${token.access_token}` } });
    if (!accountRes.ok) return res.status(502).send('Unable to verify the Riot account.');
    const account = await accountRes.json();
    const safeAccount = { puuid: account.puuid, gameName: account.gameName, tagLine: account.tagLine };
    res.setHeader('Set-Cookie', ['rso_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0', sessionCookie(makeSession(safeAccount))]);
    return res.redirect(302, '/?signed_in=1');
  } catch {
    return res.status(500).send('Unexpected Riot Sign On error.');
  }
};

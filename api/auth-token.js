const { sealSession } = require('./_session');

const RATE = new Map();
function allowed(ip) {
  const now = Date.now();
  const entry = RATE.get(ip) || [];
  const active = entry.filter(t => now - t < 60_000);
  if (active.length >= 5) return false;
  active.push(now);
  RATE.set(ip, active);
  return true;
}

function extractTokens(input) {
  let value = String(input || '').trim();
  if (!value) throw new Error('Paste the full Riot redirect URL.');
  if (!value.includes('://')) value = 'http://localhost/redirect#' + value.replace(/^#/, '');
  let u;
  try { u = new URL(value); } catch { throw new Error('That does not look like a valid redirect URL.'); }
  const fragment = u.hash ? u.hash.slice(1) : (u.search ? u.search.slice(1) : '');
  const params = new URLSearchParams(fragment);
  const accessToken = params.get('access_token');
  const idToken = params.get('id_token') || '';
  if (!accessToken) throw new Error('No access token was found. Copy the entire URL, including everything after #.');
  return { accessToken, idToken };
}

async function riotFetch(url, options = {}) {
  const r = await fetch(url, options);
  if (r.status === 429) throw new Error('Riot rate-limited the request. Please wait a little and try again.');
  if (!r.ok) throw new Error(`Riot request failed (${r.status}).`);
  return r.json();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'POST required' });
  if (!allowed(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')) {
    return res.status(429).json({ ok: false, error: 'Too many login attempts. Try again in a minute.' });
  }

  try {
    const { url } = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { accessToken, idToken } = extractTokens(url);
    const entitlements = await riotFetch('https://entitlements.auth.riotgames.com/api/token/v1', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: '{}'
    });
    const userinfo = await riotFetch('https://auth.riotgames.com/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const geo = await riotFetch('https://riot-geo.pas.si.riotgames.com/pas/v1/product/valorant', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: idToken })
    });

    const region = geo?.affinities?.live || 'eu';
    const account = userinfo?.acct || {};
    const session = sealSession({
      accessToken,
      entitlementsToken: entitlements.entitlements_token,
      idToken,
      puuid: userinfo.sub,
      region,
      shard: ['na', 'latam', 'br'].includes(region) ? 'na' : region,
      account: { gameName: account.game_name || '', tagLine: account.tag_line || '' }
    });

    res.status(200).json({ ok: true, session, account: { gameName: account.game_name || '', tagLine: account.tag_line || '' }, region });
  } catch (error) {
    console.error('Riot auth error:', error.message);
    res.status(400).json({ ok: false, error: error.message || 'Authentication failed.' });
  }
};

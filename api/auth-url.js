module.exports = function handler(req, res) {
  const url = new URL('https://auth.riotgames.com/authorize');
  url.searchParams.set('redirect_uri', 'http://localhost/redirect');
  url.searchParams.set('client_id', 'riot-client');
  url.searchParams.set('response_type', 'token id_token');
  url.searchParams.set('nonce', '1');
  url.searchParams.set('scope', 'openid link ban lol_region account');
  url.searchParams.set('prompt', 'login');
  res.status(200).json({ ok: true, authUrl: url.toString() });
};

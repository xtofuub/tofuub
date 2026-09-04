const { openSession, bearer, SESSION_TTL_MS } = require('./_session');
module.exports = function handler(req, res) {
  const session = openSession(bearer(req));
  if (!session) return res.status(200).json({ ok: true, signedIn: false });
  res.status(200).json({ ok: true, signedIn: true, account: session.account, region: session.region, expiresAt: Date.now() + SESSION_TTL_MS });
};

const crypto = require('crypto');

const SESSION_TTL_MS = 55 * 60 * 1000;

function key() {
  // Canonical secret for the app. Keep SESSION_SECRET as a backwards-compatible fallback.
  const secret = process.env.RSO_SESSION_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error('RSO_SESSION_SECRET is not configured');
  return crypto.createHash('sha256').update(secret).digest();
}

function sealSession(data) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const plaintext = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + SESSION_TTL_MS }));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString('base64url');
}

function openSession(token) {
  if (!token) return null;
  try {
    const buf = Buffer.from(token, 'base64url');
    if (buf.length < 29) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const session = JSON.parse(plaintext.toString('utf8'));
    if (!session.exp || session.exp <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function bearer(req) {
  const header = req.headers?.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

module.exports = { sealSession, openSession, bearer, SESSION_TTL_MS };

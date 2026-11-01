import crypto from 'node:crypto';

function key() {
  const secret = process.env.AUTH_SECRET || '';
  if (secret.length < 32) throw new Error('AUTH_SECRET is required to protect stored secrets.');
  return crypto.createHash('sha256').update(secret).digest();
}

/** AES-256-GCM. Output is not a secret by itself, but it must still stay off the client. */
export function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64');
}

export function decryptSecret(payload: string) {
  const buf = Buffer.from(payload, 'base64');
  if (buf.length < 29) throw new Error('Stored secret is incomplete.');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
}

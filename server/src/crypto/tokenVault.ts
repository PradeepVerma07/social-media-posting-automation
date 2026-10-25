import crypto from 'crypto';

// Default 32-byte key fallback if not provided in env (for local dev / seed)
const DEFAULT_KEY_BASE64 = Buffer.from('ci360_production_master_key_2026_32bytes!').toString('base64');
const KEY_VERSION = Number(process.env.TOKEN_ENCRYPTION_KEY_VERSION) || 1;

function getEncryptionKey(): Buffer {
  const envKey = process.env.TOKEN_ENCRYPTION_KEY || DEFAULT_KEY_BASE64;
  const buf = Buffer.from(envKey, 'base64');
  if (buf.length !== 32) {
    // If not exactly 32 bytes, derive via sha256
    return crypto.createHash('sha256').update(envKey).digest();
  }
  return buf;
}

export interface EncryptedTokenData {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

export function encryptToken(plainToken: string): EncryptedTokenData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // Recommended 12 bytes for AES-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let ciphertext = cipher.update(plainToken, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag,
    version: KEY_VERSION,
  };
}

export function decryptToken(encrypted: {
  ciphertext: string;
  iv: string;
  tag: string;
  version?: number;
}): string {
  const key = getEncryptionKey();
  const iv = Buffer.from(encrypted.iv, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(Buffer.from(encrypted.tag, 'hex'));

  let decrypted = decipher.update(encrypted.ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Constant-time comparison for HMAC signatures
 */
export function verifyHmacSignature(payload: string, signatureHex: string, secret: string): boolean {
  try {
    const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    const cleanSig = signatureHex.replace(/^sha256=/, '');
    const sigBuffer = Buffer.from(cleanSig, 'hex');
    const computedBuffer = Buffer.from(computed, 'hex');
    if (sigBuffer.length !== computedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, computedBuffer);
  } catch {
    return false;
  }
}

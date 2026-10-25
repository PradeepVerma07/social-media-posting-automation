import test from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import { encryptToken, decryptToken, verifyHmacSignature } from '../src/crypto/tokenVault';

test('Token Vault: Encrypts and decrypts OAuth tokens via AES-256-GCM', () => {
  const plainToken = 'EAGVJejn6LZAgBS9ti94Az8VqSZBuAaLYYdLLLKVB4YdWAGWjmNXipYQJuC5pQjgZCn2Om1B5RJg';
  const encrypted = encryptToken(plainToken);

  assert.notStrictEqual(encrypted.ciphertext, plainToken);
  assert.ok(encrypted.iv);
  assert.ok(encrypted.tag);

  const decrypted = decryptToken(encrypted);
  assert.strictEqual(decrypted, plainToken);
});

test('Token Vault: Verifies valid HMAC-SHA256 signatures with constant-time check', () => {
  const secret = 'ci360_test_secret_key';
  const timestamp = '1729838400000';
  const payload = '{"status":"ok"}';
  const toSign = timestamp + '.' + payload;
  const validSig = 'sha256=' + crypto.createHmac('sha256', secret).update(toSign).digest('hex');

  assert.strictEqual(verifyHmacSignature(toSign, validSig, secret), true);
  assert.strictEqual(verifyHmacSignature(toSign, 'sha256=invalid_hex_string_1234', secret), false);
});

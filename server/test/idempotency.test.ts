import test from 'node:test';
import assert from 'node:assert';
import { computeIdempotencyKey } from '../src/utils/idGenerator';

test('Idempotency: Same target, schedule and version produce identical key', () => {
  const key1 = computeIdempotencyKey('TGT-001', '2026-10-24T20:45:00.000Z', 1);
  const key2 = computeIdempotencyKey('TGT-001', '2026-10-24T20:45:00.000Z', 1);
  assert.strictEqual(key1, key2);
});

test('Idempotency: Editing content or schedule generates a new key', () => {
  const keyOriginal = computeIdempotencyKey('TGT-001', '2026-10-24T20:45:00.000Z', 1);
  const keyRescheduled = computeIdempotencyKey('TGT-001', '2026-10-24T21:00:00.000Z', 1);
  const keyVersionBumped = computeIdempotencyKey('TGT-001', '2026-10-24T20:45:00.000Z', 2);

  assert.notStrictEqual(keyOriginal, keyRescheduled);
  assert.notStrictEqual(keyOriginal, keyVersionBumped);
});

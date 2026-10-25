import test from 'node:test';
import assert from 'node:assert';
import { fromZone, toZone, parseToUtc } from '../src/utils/time';

test('Timezone Engine: IST local time converts accurately to UTC without drift', () => {
  // 02:15:40 on Oct 25 in Asia/Kolkata (UTC+5:30) is 20:45:40 on Oct 24 in UTC
  const res = fromZone('2026-10-25', '02:15:40', 'Asia/Kolkata');
  assert.strictEqual(res.scheduledUtc, '2026-10-24T20:45:40.000Z');
  assert.strictEqual(res.normalizedTime, '02:15:40');
});

test('Timezone Engine: UTC converts to IST display format matching n8n UI exactly', () => {
  const utcStr = '2026-10-24T20:45:40.044Z';
  const res = toZone(utcStr, 'Asia/Kolkata');
  assert.strictEqual(res.displayDateTime, 'Oct 25, 02:15:40');
  assert.strictEqual(res.displayTime, '02:15:40');
  assert.strictEqual(res.localDate, '2026-10-25');
});

test('Timezone Engine: Correctly parses n8n SQLite timestamps lacking Z or offset', () => {
  const n8nDbTimestamp = '2026-10-24 20:45:40.044';
  const dt = parseToUtc(n8nDbTimestamp);
  assert.ok(dt);
  assert.strictEqual(dt.toISO(), '2026-10-24T20:45:40.044Z');
});

test('Timezone Engine: Handles non-IST timezones correctly (America/New_York)', () => {
  const res = fromZone('2026-10-28', '14:00:00', 'America/New_York');
  // 14:00 EDT (UTC-4) is 18:00 UTC
  assert.strictEqual(res.scheduledUtc, '2026-10-28T18:00:00.000Z');
});

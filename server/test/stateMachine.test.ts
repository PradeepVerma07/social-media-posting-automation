import test from 'node:test';
import assert from 'node:assert';
import { canTransition } from '../src/services/stateMachine';

test('State Machine: Permitted lifecycle transitions', () => {
  assert.strictEqual(canTransition('Draft', 'Scheduled'), true);
  assert.strictEqual(canTransition('Scheduled', 'Processing'), true);
  assert.strictEqual(canTransition('Scheduled', 'Cancelled'), true);
  assert.strictEqual(canTransition('Scheduled', 'Missed'), true);
  assert.strictEqual(canTransition('Processing', 'Posted'), true);
  assert.strictEqual(canTransition('Processing', 'Retrying'), true);
  assert.strictEqual(canTransition('Processing', 'Failed'), true);
  assert.strictEqual(canTransition('Processing', 'NeedsVerification'), true);
  assert.strictEqual(canTransition('NeedsVerification', 'Posted'), true);
  assert.strictEqual(canTransition('NeedsVerification', 'Retrying'), true);
  assert.strictEqual(canTransition('Failed', 'Scheduled'), true);
});

test('State Machine: Prohibited and terminal transitions', () => {
  // Posted and Cancelled are strictly terminal
  assert.strictEqual(canTransition('Posted', 'Processing'), false);
  assert.strictEqual(canTransition('Posted', 'Draft'), false);
  assert.strictEqual(canTransition('Cancelled', 'Processing'), false);

  // Cannot jump directly from Draft to Posted without approval/claim
  assert.strictEqual(canTransition('Draft', 'Posted'), false);
  assert.strictEqual(canTransition('Draft', 'Processing'), false);
});

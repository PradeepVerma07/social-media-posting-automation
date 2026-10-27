import test from 'node:test';
import assert from 'node:assert';
import { canTransitionPost } from '../src/services/stateMachine';
import { PLATFORM_METRICS_CONFIG } from '../src/services/social/platform_metrics.config';

test('Post Lifecycle: Valid transitions', () => {
  assert.strictEqual(canTransitionPost('DRAFT', 'AI_REVIEW_PENDING'), true);
  assert.strictEqual(canTransitionPost('AI_REVIEW_PENDING', 'AI_REVIEWED'), true);
  assert.strictEqual(canTransitionPost('AI_REVIEWED', 'SCHEDULED'), true);
  assert.strictEqual(canTransitionPost('SCHEDULED', 'PUBLISHING'), true);
  assert.strictEqual(canTransitionPost('PUBLISHING', 'PUBLISHED'), true);
});

test('Post Lifecycle: Invariants and terminal states', () => {
  assert.strictEqual(canTransitionPost('PUBLISHED', 'DRAFT'), false);
  assert.strictEqual(canTransitionPost('PUBLISHED', 'PUBLISHING'), false);
  assert.strictEqual(canTransitionPost('DRAFT', 'PUBLISHED'), false);
});

test('Platform Metrics Config: Never fabricates unsupported metrics', () => {
  const ig = PLATFORM_METRICS_CONFIG.instagram;
  assert.strictEqual(ig.metrics.likes.supported, true);
  assert.strictEqual(ig.metrics.shares.supported, false);
  assert.strictEqual(ig.metrics.clicks.supported, false);

  const li = PLATFORM_METRICS_CONFIG.linkedin;
  assert.strictEqual(li.metrics.impressions.supported, true);
  assert.strictEqual(li.metrics.saved.supported, false);
});

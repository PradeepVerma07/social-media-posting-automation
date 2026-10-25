import test from 'node:test';
import assert from 'node:assert';
import { classifyMetaError } from '../src/services/metaErrors';

test('Meta Error Classifier: Token expiration (Code 190) classified as auth', () => {
  const res = classifyMetaError(190, 463, 400, 'Error validating access token: Session has expired');
  assert.strictEqual(res.category, 'auth');
  assert.strictEqual(res.isRetryable, false);
});

test('Meta Error Classifier: Rate limits (Codes 4, 17, 32, 613) classified as retryable', () => {
  const res = classifyMetaError(4, 0, 400, 'Application request limit reached');
  assert.strictEqual(res.category, 'retryable');
  assert.strictEqual(res.isRetryable, true);
});

test('Meta Error Classifier: Policy violation (Code 368) classified as policy', () => {
  const res = classifyMetaError(368, 0, 400, 'Your content was blocked for violating Meta community standards');
  assert.strictEqual(res.category, 'policy');
  assert.strictEqual(res.isRetryable, false);
});

test('Meta Error Classifier: Bad parameters (Code 100) classified as validation', () => {
  const res = classifyMetaError(100, 0, 400, 'Invalid parameter: image aspect ratio must be between 4:5 and 1.91:1');
  assert.strictEqual(res.category, 'validation');
  assert.strictEqual(res.isRetryable, false);
});

test('Meta Error Classifier: HTTP 500 transient server errors classified as retryable', () => {
  const res = classifyMetaError(1, 0, 500, 'An unknown transient error occurred');
  assert.strictEqual(res.category, 'retryable');
  assert.strictEqual(res.isRetryable, true);
});

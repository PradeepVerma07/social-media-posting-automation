import { ulid } from 'ulid';
import crypto from 'crypto';

export function generatePostId(): string {
  return `POST-${ulid()}`;
}

export function generateTargetId(): string {
  return `TGT-${ulid()}`;
}

export function generateAttemptId(): string {
  return `ATT-${ulid()}`;
}

export function generateClientId(): string {
  return `CL-${ulid()}`;
}

export function generateBrandId(): string {
  return `BR-${ulid()}`;
}

export function generateAccountId(): string {
  return `ACC-${ulid()}`;
}

export function generateOutboxId(): string {
  return `OUT-${ulid()}`;
}

export function generateAuditId(): string {
  return `AUD-${ulid()}`;
}

export function generateEventId(): string {
  return `EVT-${ulid()}`;
}

/**
 * Idempotency Key calculation: SHA-256 of target_id + scheduled_utc + content_version
 * A unique DB index guarantees duplicate claims are impossible at the database level.
 */
export function computeIdempotencyKey(targetId: string, scheduledUtc: string, contentVersion: number): string {
  return crypto
    .createHash('sha256')
    .update(`${targetId}_${scheduledUtc}_${contentVersion}`)
    .digest('hex');
}

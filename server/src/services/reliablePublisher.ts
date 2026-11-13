import { db } from '../db/sqlite';
import { decryptToken } from '../crypto/tokenVault';
import { beginPublishing, claimDueTargets, DeliveryConflict, loadDelivery } from './deliveryClaims';
import { transitionTarget } from './stateMachine';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';

export class ProviderError extends Error {
  constructor(message: string, public code: string, public unknownOutcome = false,
    public retryable = false, public retryAfterSeconds?: number) { super(message); }
}
export interface ProviderReceipt { id: string; url?: string; confirmedPublished: true }
export type PublishAdapter = (delivery: any, token: string) => Promise<ProviderReceipt>;

const graphVersion = () => /^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION || '')
  ? process.env.META_GRAPH_VERSION! : 'v21.0';

async function graphRequest(path: string, token: string, values?: Record<string, any>, publishing = false): Promise<any> {
  let response: globalThis.Response;
  try {
    response = await fetch(`https://graph.facebook.com/${graphVersion()}/${path}`, {
      method: values ? 'POST' : 'GET',
      headers: { Authorization: `Bearer ${token}`, ...(values ? { 'Content-Type': 'application/json' } : {}) },
      body: values ? JSON.stringify(values) : undefined,
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    throw new ProviderError('The provider response was not received. Check publication before retrying.', 'PROVIDER_TIMEOUT', publishing, !publishing);
  }
  let body: any;
  try { body = await response.json(); } catch {
    throw new ProviderError('The provider returned an unreadable response.', 'INVALID_PROVIDER_RESPONSE', publishing, !publishing);
  }
  if (!response.ok || body.error) {
    const code = Number(body.error?.code);
    const rateLimited = response.status === 429 || [4, 17, 32, 613].includes(code);
    const unknown = publishing && (response.status >= 500 || response.status === 408);
    const retryAfter = Number(response.headers.get('retry-after'));
    throw new ProviderError(
      code === 190 ? 'Reconnect this social account before publishing.' : rateLimited
        ? 'The provider rate limit was reached.' : 'The provider rejected this publication request.',
      code === 190 ? 'AUTH_EXPIRED' : String(code || response.status), unknown,
      rateLimited || (!publishing && response.status >= 500),
      Number.isFinite(retryAfter) ? retryAfter : undefined,
    );
  }
  return body;
}

function mediaAndPlacement(delivery: any): { urls: string[]; placement: string } {
  let urls: unknown; let placements: unknown;
  try { urls = JSON.parse(delivery.media_urls || '[]'); placements = JSON.parse(delivery.placement || '["feed"]'); }
  catch { throw new ProviderError('Media or placement data is invalid.', 'INVALID_MEDIA'); }
  if (typeof placements === 'string') placements = [placements];
  if (!Array.isArray(placements) || placements.length !== 1)
    throw new ProviderError('Schedule each placement separately so partial delivery can be retried safely.', 'MULTIPLE_PLACEMENTS_UNSUPPORTED');
  if (!Array.isArray(urls) || urls.length !== 1)
    throw new ProviderError('This publisher supports one media item per delivery. Carousel delivery is not enabled.', 'UNSUPPORTED_MEDIA');
  for (const value of urls) {
    let url: URL;
    try { url = new URL(value); } catch { throw new ProviderError('Use a public HTTPS media URL.', 'INVALID_MEDIA'); }
    if (url.protocol !== 'https:' || url.username || url.password || /^(localhost|127\.|10\.|192\.168\.|169\.254\.|\[|0\.)/i.test(url.hostname))
      throw new ProviderError('Use a public HTTPS media URL.', 'INVALID_MEDIA');
  }
  return { urls: urls as string[], placement: String(placements[0]) };
}

export const metaPublishAdapter: PublishAdapter = async (delivery, token) => {
  const { urls, placement } = mediaAndPlacement(delivery);
  let override: string | undefined;
  try {
    const revision = JSON.parse(delivery.revision_data || '{}');
    override = revision.platforms?.find((entry: any) => entry.platform === delivery.platform)?.captionOverride;
  } catch { /* Older records have no structured revision. */ }
  const caption = [typeof override === 'string' ? override : delivery.caption, delivery.hashtags].filter(Boolean).join('\n\n');
  if (!/^[0-9_]+$/.test(delivery.external_id || '')) throw new ProviderError('The connected provider account ID is invalid.', 'INVALID_ACCOUNT');
  if (delivery.platform === 'facebook') {
    if (delivery.media_type === 'video') {
      const result = await graphRequest(`${delivery.external_id}/videos`, token,
        { file_url: urls[0], description: caption }, true);
      const id = String(result.id || result.post_id || '');
      if (!id) throw new ProviderError('The provider did not confirm a live post ID.', 'UNCONFIRMED_PUBLICATION', true);
      return { id, url: `https://www.facebook.com/${encodeURIComponent(id)}`, confirmedPublished: true };
    }
    if (placement !== 'feed' || delivery.media_type !== 'image')
      throw new ProviderError('Facebook publishing currently supports image and video posts. This format is unavailable.', 'UNSUPPORTED_FORMAT');
    const result = await graphRequest(`${delivery.external_id}/photos`, token,
      { url: urls[0], caption, published: true }, true);
    // A photo/container ID alone is not evidence of a published feed post.
    if (!result.post_id) throw new ProviderError('The provider did not confirm a live post ID.', 'UNCONFIRMED_PUBLICATION', true);
    const id = String(result.post_id);
    return { id, url: `https://www.facebook.com/${encodeURIComponent(id)}`, confirmedPublished: true };
  }
  if (delivery.platform === 'instagram') {
    if (!['feed', 'story', 'reels_shorts'].includes(placement) || !['image', 'video'].includes(delivery.media_type))
      throw new ProviderError('This Instagram format is unavailable.', 'UNSUPPORTED_FORMAT');
    if (placement === 'reels_shorts' && delivery.media_type !== 'video')
      throw new ProviderError('Instagram reels require a video.', 'UNSUPPORTED_FORMAT');
    const params: Record<string, any> = delivery.media_type === 'video'
      ? { video_url: urls[0], media_type: placement === 'story' ? 'STORIES' : 'REELS' }
      : { image_url: urls[0], ...(placement === 'story' ? { media_type: 'STORIES' } : {}) };
    if (placement !== 'story') params.caption = caption;
    const container = await graphRequest(`${delivery.external_id}/media`, token, params);
    if (!container.id) throw new ProviderError('The provider did not create a media container.', 'INVALID_PROVIDER_RESPONSE');
    if (delivery.media_type === 'video') {
      let ready = false;
      for (let attempt = 0; attempt < 12; attempt++) {
        const status = await graphRequest(`${encodeURIComponent(container.id)}?fields=status_code`, token);
        if (status.status_code === 'FINISHED') { ready = true; break; }
        if (['ERROR', 'EXPIRED'].includes(status.status_code)) throw new ProviderError('The provider could not process the video.', 'MEDIA_PROCESSING_FAILED');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      if (!ready) throw new ProviderError('Video processing is still pending. Publication was not submitted.', 'MEDIA_PROCESSING_PENDING', false, true);
    }
    const result = await graphRequest(`${delivery.external_id}/media_publish`, token, { creation_id: container.id }, true);
    if (!result.id) throw new ProviderError('The provider did not confirm a live media ID.', 'UNCONFIRMED_PUBLICATION', true);
    let url: string | undefined;
    try {
      const media = await graphRequest(`${encodeURIComponent(result.id)}?fields=permalink`, token);
      if (typeof media.permalink === 'string' && media.permalink.startsWith('https://')) url = media.permalink;
    } catch { /* The publish response already confirmed the live ID. */ }
    return { id: String(result.id), url, confirmedPublished: true };
  }
  throw new ProviderError(`Publishing to ${delivery.platform} is not configured.`, 'UNSUPPORTED_PLATFORM');
};

export async function publishDelivery(targetId: string, executionId: string, adapter: PublishAdapter = metaPublishAdapter, options:{allowAutomaticRetry?:boolean}={}) {
  let current = loadDelivery(targetId);
  if (!current) throw new DeliveryConflict('Delivery not found');
  if (current.status !== 'Processing') {
    const [claimed] = claimDueTargets(executionId, [targetId], 1);
    if (!claimed) throw new DeliveryConflict('Delivery is not due, approved, active, or retryable');
  }
  current = beginPublishing(targetId, executionId);
  let receipt: ProviderReceipt | undefined;
  let failure: ProviderError | undefined;
  try {
    if (!current.token_ciphertext) throw new ProviderError('Connect this social account before publishing.', 'AUTH_MISSING');
    if (current.token_expires_at && Date.parse(current.token_expires_at) <= Date.now())
      throw new ProviderError('Reconnect this social account before publishing.', 'AUTH_EXPIRED');
    let token: string;
    try { token = decryptToken({ ciphertext: current.token_ciphertext, iv: current.token_iv, tag: current.token_tag, version: current.token_version }); }
    catch { throw new ProviderError('The account credential could not be decrypted.', 'AUTH_UNAVAILABLE'); }
    receipt = await adapter(current, token);
    if (!receipt?.confirmedPublished || !receipt.id) throw new ProviderError('The provider has not confirmed publication.', 'UNCONFIRMED_PUBLICATION', true);
  } catch (error) {
    failure = error instanceof ProviderError ? error : new ProviderError('Publication outcome is unknown. Verify before retrying.', 'UNKNOWN_OUTCOME', true);
  }
  const now = new Date().toISOString();
  const fresh = loadDelivery(targetId);
  if (!fresh || fresh.status !== 'Processing' || fresh.lock_execution_id !== executionId)
    throw new DeliveryConflict('Delivery claim expired; reconcile the provider outcome before retrying');
  const retry = options.allowAutomaticRetry!==false && failure?.retryable && !failure.unknownOutcome && fresh.attempt_count < fresh.max_retries;
  const status = receipt ? 'Posted' : failure?.unknownOutcome ? 'NeedsVerification' : retry ? 'Retrying' : 'Failed';
  const delaySeconds = Math.max(failure?.retryAfterSeconds || 0, Math.min(2 ** fresh.attempt_count * 60, 3600) + Math.random() * 30);
  db.exec('BEGIN IMMEDIATE');
  try {
    transitionTarget(fresh, status, 'publisher', receipt ? 'Provider confirmed publication' : failure!.message, {
      platform_post_id: receipt?.id || null, post_url: receipt?.url || null, posted_at: receipt ? now : null,
      error_code: failure?.code || null, error_category: failure ? failure.unknownOutcome ? 'unknown' : retry ? 'retryable' : failure.code.startsWith('AUTH') ? 'auth' : 'validation' : null,
      error_message: failure?.message || null,
      next_retry_at: retry ? new Date(Date.now() + delaySeconds * 1000).toISOString() : null,
      lock_execution_id: status === 'NeedsVerification' ? executionId : null,
      lock_stage: status === 'NeedsVerification' ? 'publishing' : null,
      locked_at: status === 'NeedsVerification' ? fresh.locked_at : null,
    });
    db.prepare(`UPDATE publish_attempts SET finished_at = ?, result = ?, error_code = ?, raw_response_redacted = ?
      WHERE target_id = ? AND execution_id = ? AND result = 'running'`)
      .run(now, receipt ? 'success' : status === 'NeedsVerification' ? 'unknown' : 'failed', failure?.code || null,
        JSON.stringify(receipt ? { platform_post_id: receipt.id, post_url: receipt.url } : { code: failure?.code }), targetId, executionId);
    if (failure?.code === 'AUTH_EXPIRED') db.prepare(`UPDATE social_accounts SET status = 'needs_reauth' WHERE account_id = ?`).run(fresh.account_id);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
  sheetsOutboxWorker.enqueueTargetUpsert(targetId, fresh.client_id);
  sseManager.emit('target.status_changed', fresh.client_id, { targetId, status, postUrl: receipt?.url });
  sseManager.emit('post.updated', fresh.client_id, { postId: fresh.post_id });
  return { result: receipt ? 'succeeded' : status === 'NeedsVerification' ? 'partial' : 'failed',
    targetStatus: status, platformPostId: receipt?.id, postUrl: receipt?.url, error: failure?.message,
    placementReports: [{ placement: JSON.parse(fresh.placement || '["feed"]')[0], platform: fresh.platform,
      status: receipt ? 'posted' : status === 'NeedsVerification' ? 'unknown' : 'failed', id: receipt?.id, url: receipt?.url, error: failure?.message }] };
}

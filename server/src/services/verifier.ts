import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { decryptToken } from '../crypto/tokenVault';
import { transitionTarget } from './stateMachine';
import { loadDelivery } from './deliveryClaims';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';

export type VerifyProvider = (target: any, token: string) => Promise<{ id: string; url?: string } | null>;

// Reconcile only an exact provider ID. Caption-prefix search cannot establish
// identity and an empty feed can never prove that an uncertain post was not sent.
export const verifyExactMetaPost: VerifyProvider = async (target, token) => {
  if (!['facebook', 'instagram'].includes(target.platform) || !/^[0-9_]+$/.test(target.platform_post_id || '')) return null;
  const version = process.env.META_GRAPH_VERSION || 'v21.0';
  if (!/^v\d+\.\d+$/.test(version)) return null;
  const id = encodeURIComponent(target.platform_post_id);
  const fields = target.platform === 'facebook' ? 'id,from,is_published,permalink_url' : 'id,owner,permalink';
  const response = await fetch(`https://graph.facebook.com/${version}/${id}?fields=${fields}`, {
    headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) return null;
  const body: any = await response.json();
  if (body.error || String(body.id) !== target.platform_post_id) return null;
  const owner = target.platform === 'facebook' ? body.from?.id : body.owner?.id;
  if (String(owner || '') !== String(target.external_id)) return null;
  if (target.platform === 'facebook' && body.is_published !== true) return null;
  const url = target.platform === 'facebook' ? body.permalink_url : body.permalink;
  if (typeof url !== 'string' || !url.startsWith('https://')) return null;
  return { id: String(body.id), url };
};

export class MetaVerifierService {
  private active = new Set<string>();
  async verifyTarget(targetId: string, provider: VerifyProvider = verifyExactMetaPost): Promise<boolean> {
    if (this.active.has(targetId)) return false;
    this.active.add(targetId);
    try {
      const target = loadDelivery(targetId);
      if (!target || target.status !== 'NeedsVerification' || !target.platform_post_id
        || target.account_client_id !== target.client_id || target.account_brand_id !== target.brand_id
        || target.account_status !== 'active') return false;
      const token = decryptToken({ ciphertext: target.token_ciphertext, iv: target.token_iv, tag: target.token_tag, version: target.token_version });
      const receipt = await provider(target, token);
      if (!receipt || receipt.id !== target.platform_post_id) return false;
      const now = new Date().toISOString();
      db.exec('BEGIN IMMEDIATE');
      try {
        transitionTarget(target, 'Posted', 'provider_verifier', 'Exact provider ID and account ownership confirmed', {
          post_url: receipt.url || null, posted_at: target.posted_at || now,
          lock_execution_id: null, lock_stage: null, locked_at: null,
          error_code: null, error_category: null, error_message: null,
        });
        db.prepare(`UPDATE publish_attempts SET result = 'success', finished_at = ?, error_code = NULL
          WHERE target_id = ? AND execution_id = ? AND result = 'unknown'`).run(now, targetId, target.lock_execution_id);
        db.exec('COMMIT');
      } catch { db.exec('ROLLBACK'); return false; }
      sheetsOutboxWorker.enqueueTargetUpsert(targetId, target.client_id);
      sseManager.emit('target.status_changed', target.client_id, { targetId, status: 'Posted', postUrl: receipt.url });
      return true;
    } catch {
      logger.warn({ targetId }, 'Provider verification unavailable; delivery remains unresolved');
      return false;
    } finally { this.active.delete(targetId); }
  }
}
export const metaVerifierService = new MetaVerifierService();

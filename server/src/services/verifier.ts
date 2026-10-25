import https from 'https';
import { db } from '../db/sqlite';
import { logger } from '../logging/logger';
import { decryptToken } from '../crypto/tokenVault';
import { transitionTarget } from './stateMachine';
import { alertService } from './alerts';
import { sheetsOutboxWorker } from './sheetsOutboxWorker';
import { sseManager } from './sseManager';

export class MetaVerifierService {
  async verifyTarget(targetId: string): Promise<boolean> {
    const target = db.prepare(`
      SELECT t.*, p.caption, p.client_id, a.external_id, a.token_ciphertext, a.token_iv, a.token_tag, a.token_version
      FROM post_targets t
      JOIN posts p ON t.post_id = p.post_id
      JOIN social_accounts a ON t.account_id = a.account_id
      WHERE t.target_id = ? AND t.status = 'NeedsVerification'
    `).get(targetId) as any;

    if (!target) return false;

    try {
      const accessToken = decryptToken({
        ciphertext: target.token_ciphertext,
        iv: target.token_iv,
        tag: target.token_tag,
        version: target.token_version,
      });

      const prefixMatch = target.caption.trim().substring(0, 80);
      const graphVersion = process.env.META_GRAPH_VERSION || 'v21.0';

      if (target.platform === 'facebook') {
        const published = await this.fetchFacebookPosts(target.external_id, accessToken, graphVersion);
        const match = published.find((p: any) => p.message && p.message.startsWith(prefixMatch));
        if (match) {
          const postUrl = match.permalink_url || `https://facebook.com/${match.id}`;
          transitionTarget(target, 'Posted', 'meta_verifier', 'Found confirmed post on Facebook during verification', {
            platform_post_id: match.id,
            post_url: postUrl,
            posted_at: match.created_time || new Date().toISOString(),
          });
          sheetsOutboxWorker.enqueueTargetUpsert(targetId, target.client_id);
          sseManager.emit('target.status_changed', target.client_id, { targetId, status: 'Posted', postUrl });
          return true;
        }
      } else if (target.platform === 'instagram') {
        const mediaList = await this.fetchInstagramMedia(target.external_id, accessToken, graphVersion);
        const match = mediaList.find((m: any) => m.caption && m.caption.startsWith(prefixMatch));
        if (match) {
          const postUrl = match.permalink || `https://instagram.com/p/${match.id}`;
          transitionTarget(target, 'Posted', 'meta_verifier', 'Found confirmed post on Instagram during verification', {
            platform_post_id: match.id,
            post_url: postUrl,
            posted_at: match.timestamp || new Date().toISOString(),
          });
          sheetsOutboxWorker.enqueueTargetUpsert(targetId, target.client_id);
          sseManager.emit('target.status_changed', target.client_id, { targetId, status: 'Posted', postUrl });
          return true;
        }
      }

      // Not found yet -> allow retry if retries remain
      if (target.attempt_count < target.max_retries) {
        transitionTarget(target, 'Retrying', 'meta_verifier', 'Confirmed not on Meta after verification check', {
          next_retry_at: new Date(Date.now() + 60000).toISOString(),
        });
        sheetsOutboxWorker.enqueueTargetUpsert(targetId, target.client_id);
        sseManager.emit('target.status_changed', target.client_id, { targetId, status: 'Retrying' });
      } else {
        transitionTarget(target, 'Failed', 'meta_verifier', 'Post not found and retries exhausted', {
          error_category: 'unknown',
          error_message: 'Verification check failed to locate post on Meta.',
        });
        sheetsOutboxWorker.enqueueTargetUpsert(targetId, target.client_id);
      }
      return false;

    } catch (err) {
      logger.error({ err, targetId }, 'Error running Meta verification');
      alertService.notify(`verify_${targetId}`, 'High', 'Meta verifier API call failed', { targetId, err: String(err) });
      return false;
    }
  }

  private fetchFacebookPosts(pageId: string, token: string, graphVersion: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/${graphVersion}/${pageId}/published_posts?fields=id,message,created_time,permalink_url&limit=10&access_token=${token}`,
        method: 'GET',
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json.data || []);
          } catch (e) {
            resolve([]);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  private fetchInstagramMedia(igUserId: string, token: string, graphVersion: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'graph.facebook.com',
        path: `/${graphVersion}/${igUserId}/media?fields=id,caption,timestamp,permalink&limit=10&access_token=${token}`,
        method: 'GET',
      };
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => (body += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json.data || []);
          } catch (e) {
            resolve([]);
          }
        });
      });
      req.on('error', reject);
      req.end();
    });
  }
}

export const metaVerifierService = new MetaVerifierService();

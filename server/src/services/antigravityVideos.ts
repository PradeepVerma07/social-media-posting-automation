import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import { db } from '../db/sqlite';
import { canAccessBrand, canApprove, canEdit, resolveBrand, audit, type Principal } from './access';
import { generatePostId, generateTargetId, computeIdempotencyKey } from '../utils/idGenerator';
import { PUBLISHING_CAPABILITIES } from './publishingCapabilities';
import { sseManager } from './sseManager';

export const videoError = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
export const videoTx = <T>(fn: () => T): T => {
  db.exec('BEGIN IMMEDIATE');
  try { const result = fn(); db.exec('COMMIT'); return result; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
};
export const videoSetting = (key: string): any => {
  const row: any = db.prepare('SELECT value_json FROM antigravity_video_settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value_json) : null;
};
export function setVideoSetting(key: string, value: unknown) {
  db.prepare('INSERT INTO antigravity_video_settings (key,value_json) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json').run(key, JSON.stringify(value));
}
export function videoPrincipal(userId: number): Principal {
  const user: any = db.prepare('SELECT * FROM users WHERE user_id = ? AND is_active = 1').get(userId);
  if (!user || (!user.client_id && user.role !== 'Super Admin')) return videoError('The video author no longer has workspace access.', 403);
  return { id: user.user_id, email: user.email, fullName: user.full_name, role: user.role, clientId: user.client_id || 'CL-001', global: user.role === 'Super Admin' };
}
// Every generated version requires a human review before it can publish.
export const canAutoPublishVideo = (_principal: Principal) => false;
export function videoAccounts(principal: Principal, brandId: unknown, accountIds: unknown): { brand: any; accounts: any[] } {
  const brand = resolveBrand(brandId);
  if (!canAccessBrand(principal, brand)) return videoError('Brand not found or access denied.', 404);
  if (!Array.isArray(accountIds) || !accountIds.length || accountIds.length > 10 || accountIds.some(id => typeof id !== 'string')) return videoError('Select connected video destinations.');
  const accounts = [...new Set(accountIds)].map(id => {
    const account: any = db.prepare("SELECT * FROM social_accounts WHERE account_id = ? AND brand_id = ? AND client_id = ? AND status = 'active'").get(String(id), brand.brand_id, brand.client_id);
    const capabilities: any = account && PUBLISHING_CAPABILITIES[account.platform as keyof typeof PUBLISHING_CAPABILITIES];
    if (!account || !capabilities?.available || !capabilities?.placements?.reels_shorts?.includes('video')) return videoError('A selected account does not have an implemented video publishing adapter.');
    if (account.token_expires_at && Date.parse(account.token_expires_at) <= Date.now()) return videoError('Reconnect the selected social account before generating.');
    return account;
  });
  return { brand, accounts };
}
export function formatVideoJob(row: any) {
  if (!row) return null;
  const input = JSON.parse(row.input_json);
  const review: any = db.prepare('SELECT action,notes,reviewer_name AS reviewerName,created_at AS createdAt,replacement_job_id AS replacementJobId FROM antigravity_video_reviews WHERE job_id=?').get(row.id);
  const post: any = row.post_id && db.prepare('SELECT version,approval_status,deleted_at FROM posts WHERE post_id=?').get(row.post_id);
  return { id: row.id, topic: input.topic, title: input.title, caption: input.caption, language: input.language,
    parentJobId: input.parentJobId || null, revisionNumber: input.revisionNumber || 1,
    revisionNotes: input.revisionNotes || '', revisionHistory: input.revisionHistory || [], review: review || null,
    postVersion: post?.version, approvalStatus: post?.approval_status, authorId: row.user_id,
    aspectRatio: input.aspectRatio, platforms: input.platforms, brandId: row.brand_id, status: row.status,
    dispatched: !!row.dispatched, autoPublish: input.autoPublish, fileUrl: row.file_url,
    readyAt: row.ready_at, publishAt: row.publish_at, postId: row.post_id, error: row.error, createdAt: row.created_at };
}
export function createVideoJob(principal: Principal, raw: any, manual = false) {
  if (!canEdit(principal)) return videoError('Content editing permission is required.', 403);
  const { brand, accounts } = videoAccounts(principal, raw.brandId, raw.accountIds);
  const topic = String(raw.topic || '').trim();
  const requestId = String(raw.requestId || '');
  const title = String(raw.title || topic).trim().slice(0, 255);
  const caption = String(raw.caption || topic.slice(0, 5000)).trim();
  if (topic.length < 10 || topic.length > 12000 || !title || !caption || caption.length > 5000 || requestId.length < 8 || requestId.length > 200) return videoError('Enter a topic (10–12,000 characters), a caption up to 5,000 characters, and a request ID.');
  if (!['9:16', '16:9', '1:1'].includes(raw.aspectRatio || '9:16')) return videoError('Choose a supported aspect ratio.');
  const autoPublish = raw.autoPublish === true;
  if (autoPublish && !canAutoPublishVideo(principal)) return videoError('Automatic video publishing requires approval permission and the video automation setting.', 403);
  const input = { topic, title, caption, language: String(raw.language || 'English').slice(0, 50), aspectRatio: raw.aspectRatio || '9:16',
    accountIds: accounts.map(a => a.account_id).sort(), platforms: [...new Set(accounts.map(a => a.platform))], autoPublish, manual };
  const inputJson = JSON.stringify(input);
  return videoTx(() => {
    const previous: any = db.prepare('SELECT * FROM antigravity_video_jobs WHERE request_id = ?').get(requestId);
    if (previous) {
      if (previous.user_id !== principal.id || previous.input_json !== inputJson) return videoError('This request ID was already used for a different video.', 409);
      return previous;
    }
    const since = new Date(Date.now() - 86400000).toISOString();
    const count: any = db.prepare('SELECT count(*) AS n FROM antigravity_video_jobs WHERE client_id = ? AND created_at > ?').get(brand.client_id, since);
    if (count.n >= 100) return videoError('The workspace daily video limit has been reached.', 429);
    const id = crypto.randomUUID(); const now = new Date().toISOString();
    db.prepare('INSERT INTO antigravity_video_jobs (id,request_id,input_json,client_id,brand_id,user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
      .run(id, requestId, inputJson, brand.client_id, brand.brand_id, principal.id, now, now);
    audit(principal, 'antigravity_video', id, manual ? 'discover' : 'queue', { brandId: brand.brand_id, autoPublish });
    return db.prepare('SELECT * FROM antigravity_video_jobs WHERE id = ?').get(id);
  });
}
export function claimVideoJob(workerId: string) {
  const now = new Date().toISOString();
  setVideoSetting('worker', { workerId: workerId.slice(0, 100), lastSeenAt: now });
  return videoTx(() => {
    db.prepare("UPDATE antigravity_video_jobs SET status='NEEDS_ATTENTION',error='Worker lease expired. Inspect the local output before retrying.',updated_at=? WHERE status='GENERATING' AND lease_until < ?").run(now, now);
    const row: any = db.prepare("SELECT * FROM antigravity_video_jobs WHERE status='QUEUED' AND dispatched=1 ORDER BY created_at LIMIT 1").get();
    if (!row) return { job: null };
    const leaseToken = crypto.randomBytes(32).toString('hex');
    db.prepare("UPDATE antigravity_video_jobs SET status='GENERATING',lease_token=?,lease_until=?,updated_at=? WHERE id=? AND status='QUEUED'")
      .run(leaseToken, new Date(Date.now() + 120000).toISOString(), now, row.id);
    return { job: formatVideoJob({ ...row, status: 'GENERATING' }), leaseToken };
  });
}
export function leasedVideoJob(jobId: string, leaseToken: string): any {
  if (!/^[a-f0-9-]{36}$/.test(String(jobId))) return videoError('Invalid job ID.');
  const row: any = db.prepare('SELECT * FROM antigravity_video_jobs WHERE id = ?').get(jobId);
  if (!row?.lease_token || !/^[a-f0-9]{64}$/.test(String(leaseToken)) || !crypto.timingSafeEqual(Buffer.from(row.lease_token), Buffer.from(leaseToken))) return videoError('The video upload lease is invalid.', 403);
  return row;
}
export function scheduleNextVideo() {
  let tenant: string | undefined;
  const result = videoTx(() => {
    const row: any = db.prepare("SELECT * FROM antigravity_video_jobs WHERE status='READY' ORDER BY ready_at LIMIT 1").get();
    if (!row) return { job: null };
    try {
      const principal = videoPrincipal(row.user_id); const input = JSON.parse(row.input_json);
      if (!canEdit(principal)) return videoError('The author no longer has editing permission.', 403);
      const { brand, accounts } = videoAccounts(principal, row.brand_id, input.accountIds);
      const auto = false;
      if (!row.file_url || !row.publish_at) return videoError('Completed video metadata is missing.');
      if (auto && Date.parse(row.publish_at) <= Date.now()) return videoError('The publication target was missed. Review and reschedule this video.');
      const at = DateTime.fromISO(row.publish_at, { setZone: true }).setZone(brand.default_timezone || 'Asia/Kolkata');
      if (!at.isValid) return videoError('Invalid publication target.');
      const now = new Date().toISOString(); const postId = generatePostId();
      const media = [{ mediaType: 'video', fileUrl: row.file_url, originalFileName: `${row.id}.mp4`, mimeType: 'video/mp4' }];
      const platforms = accounts.map(a => ({ platform: a.platform, accountId: a.account_id }));
      db.prepare(`INSERT INTO posts (post_id,client_id,brand_id,title,caption,hashtags,media_type,media_urls,link_url,
        schedule_local_date,schedule_local_time,timezone,scheduled_utc,approval_status,approved_by,approved_at,approved_version,
        source,placement,created_by_user_id,revision_data,created_at,updated_at)
        VALUES (?,?,?,?,?,'','video',?,'',?,?,?,?,?,?,?,?,'antigravity',?,?,?,?,?)`)
        .run(postId,brand.client_id,brand.brand_id,input.title,input.caption,JSON.stringify([row.file_url]),at.toISODate()!,at.toFormat('HH:mm:ss'),brand.default_timezone || 'Asia/Kolkata',row.publish_at,
          auto ? 'Approved' : 'PendingApproval',auto ? principal.email : null,auto ? now : null,auto ? 1 : null,JSON.stringify(['reels_shorts']),principal.id,
          JSON.stringify({ platforms, media, antigravityJobId: row.id, unscheduled: false }),now,now);
      for (const account of accounts) {
        const targetId = generateTargetId();
        db.prepare('INSERT INTO post_targets (target_id,post_id,account_id,platform,status,idempotency_key,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
          .run(targetId,postId,account.account_id,account.platform,auto ? 'Scheduled' : 'Draft',computeIdempotencyKey(targetId,row.publish_at,1),now,now);
      }
      db.prepare('INSERT INTO post_revision_snapshots (post_id,version,snapshot,actor,created_at) VALUES (?,1,?,?,?)')
        .run(postId,JSON.stringify(db.prepare('SELECT * FROM posts WHERE post_id=?').get(postId)),principal.email,now);
      db.prepare('UPDATE antigravity_video_jobs SET status=?,post_id=?,error=NULL,updated_at=? WHERE id=?').run(auto ? 'SCHEDULED' : 'AWAITING_APPROVAL',postId,now,row.id);
      audit(principal,'antigravity_video',row.id,auto ? 'schedule' : 'submit_for_approval',{ postId, publishAt: row.publish_at });
      tenant = brand.client_id;
      return { job: formatVideoJob(db.prepare('SELECT * FROM antigravity_video_jobs WHERE id=?').get(row.id)) };
    } catch (error: any) {
      // All writes are in this transaction; fail before post insertion or roll back.
      throw Object.assign(error, { videoJobId: row.id });
    }
  });
  if (tenant && result.job?.postId) sseManager.emit('post.created',tenant,{ postId: result.job.postId });
  return result;
}

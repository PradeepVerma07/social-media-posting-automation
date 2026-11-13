import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { DateTime } from 'luxon';
import { db } from '../db/sqlite';
import { audit, canApprove, canEdit, isAdmin, ownBrand, resolveBrand, safeUser, tenantBrands, hashSync, compareSync, roles } from '../services/access';
import { getFormattedPostById, publishTargetDirectly } from './publicRoutes';
import { generatePostId, generateTargetId, computeIdempotencyKey } from '../utils/idGenerator';
import { sseManager } from '../services/sseManager';
import { buildAnalyticsReport, parseReportFilters } from '../services/reporting';
import { reviewVideoJob } from '../services/videoReviews';
import {saveCreatorSchedule,submitCreatorForApproval} from '../services/creatorSchedule';

export const enterpriseRouter = Router();
const wrap = (fn: (req: Request, res: Response) => any) => (req: Request, res: Response) => Promise.resolve().then(() => fn(req, res)).catch(error => res.status(error.status || 400).json({ error: error.status === 500 ? 'The operation could not be completed.' : error.message }));
const fail = (message: string, status = 400): never => { throw Object.assign(new Error(message), { status }); };
const tx = <T>(fn: () => T): T => { db.exec('BEGIN IMMEDIATE'); try { const result = fn(); db.exec('COMMIT'); return result; } catch (error) { db.exec('ROLLBACK'); throw error; } };
const json = (value: any, fallback: any) => { try { return JSON.parse(value); } catch { return fallback; } };
const postById = (req: Request) => {
  const post: any = db.prepare('SELECT * FROM posts WHERE post_id = ? AND deleted_at IS NULL').get(req.params.id);
  if (!post || (!req.principal.global && post.client_id !== req.principal.clientId)) fail('Post not found.', 404);
  return post;
};
function formatPost(id: string) {
  const data: any = getFormattedPostById(id);
  if (!data) return null;
  const row: any = db.prepare('SELECT * FROM posts WHERE post_id = ?').get(id);
  const brand = resolveBrand(row.brand_id);
  const targets: any[] = db.prepare('SELECT * FROM post_targets WHERE post_id = ?').all(id);
  const revision = json(row.revision_data, {});
  const statuses = targets.map(t => t.status);
  data.publishingStatus = statuses.length && statuses.every(s => s === 'Posted') ? 'published'
    : statuses.includes('Posted') ? 'partially_published'
    : statuses.includes('NeedsVerification') ? 'needs_reconciliation'
    : statuses.includes('Processing') ? 'processing'
    : statuses.some(s => s === 'Failed' || s === 'Missed') ? 'failed'
    : statuses.some(s => s === 'Scheduled' || s === 'Retrying') ? 'scheduled'
    : statuses.length && statuses.every(s => s === 'Cancelled') ? 'cancelled' : 'idle';
  data.brandId = brand?.ui_id;
  data.brandKey = row.brand_id;
  data.createdByUserId = row.created_by_user_id;
  const author: any = row.created_by_user_id ? db.prepare('SELECT full_name FROM users WHERE user_id = ?').get(row.created_by_user_id) : undefined;
  data.createdByName = author?.full_name || 'Legacy record';
  data.assignedApproverId = undefined; data.assignedApproverName = row.approved_by || undefined;
  data.campaignName = revision.campaignName || undefined;
  data.firstComment = revision.firstComment || undefined;
  data.targetUrl = row.link_url;
  data.scheduledAt = revision.unscheduled ? undefined : row.scheduled_utc;
  data.hashtags = row.hashtags;
  data.isLocked = statuses.includes('Processing') || statuses.includes('NeedsVerification') || statuses.includes('Posted');
  data.platforms = targets.map(t => ({ platform: t.platform, accountId: t.account_id,
    captionOverride: revision.platforms?.find((p: any) => p.platform === t.platform)?.captionOverride,
    publishingStatus: t.status === 'Posted' ? 'success' : t.status === 'Processing' ? 'publishing' : ['Failed', 'Missed'].includes(t.status) ? 'failed' : t.status === 'NeedsVerification' ? 'needs_reconciliation' : 'pending',
    platformPostId: t.platform_post_id, platformPostUrl: t.post_url, publishedUrl: t.post_url, publishedAt: t.posted_at, errorMessage: t.error_message,
  }));
  data.media = data.media.map((m: any, i: number) => ({ ...m, altText: revision.media?.[i]?.altText || '' }));
  return data;
}
function remember(post: any, actor: string) {
  db.prepare('INSERT OR IGNORE INTO post_revision_snapshots (post_id, version, snapshot, actor, created_at) VALUES (?, ?, ?, ?, ?)').run(post.post_id, post.version, JSON.stringify(post), actor, new Date().toISOString());
}
function schedule(input: any, timezone: string, optional: boolean) {
  let dt: DateTime;
  if (input.scheduledAt) {
    if (!/(Z|[+-]\d\d:\d\d)$/.test(input.scheduledAt)) fail('Scheduled time must include its UTC offset.');
    dt = DateTime.fromISO(input.scheduledAt, { setZone: true }).setZone(timezone);
  } else if (input.scheduleDate && input.scheduleTime) {
    const time = String(input.scheduleTime).length === 5 ? `${input.scheduleTime}:00` : input.scheduleTime;
    const local = `${input.scheduleDate}T${time}`;
    dt = DateTime.fromISO(local, { zone: timezone });
    if (dt.toFormat("yyyy-MM-dd'T'HH:mm:ss") !== local || dt.getPossibleOffsets().length > 1) fail('Choose an unambiguous local time; the clocks change at this time.');
  } else if (optional) dt = DateTime.now().setZone(timezone);
  else return fail('Select a publication date and time.');
  if (!dt.isValid) fail('Invalid date, time, or timezone.');
  if (!optional && dt.toMillis() <= Date.now()) fail('Choose a future publication time.');
  return { utc: dt.toUTC().toISO()!, date: dt.toISODate()!, time: dt.toFormat('HH:mm:ss'), unscheduled: !input.scheduledAt && !input.scheduleDate };
}

enterpriseRouter.get('/brands', wrap((req, res) => res.json({ data: tenantBrands(req.principal).map(b => ({
  id: b.ui_id, brandId: b.brand_id, clientId: b.client_id, name: b.brand_name, slug: b.brand_name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), timezone: b.default_timezone,
  country: b.country, primaryColor: b.primary_color || '#1d4ed8', secondaryColor: b.secondary_color || '#e0e7ff', isActive: true,
  defaultHashtags: b.default_hashtags || '', defaultKeywords: b.default_keywords || '',
  connectedAccountsCount: (db.prepare("SELECT count(*) c FROM social_accounts WHERE brand_id = ? AND status = 'active'").get(b.brand_id) as any).c,
  tokens: {},
})) })));
enterpriseRouter.get('/clients', wrap((req, res) => res.json({ data: req.principal.global ? db.prepare('SELECT * FROM clients').all() : db.prepare('SELECT * FROM clients WHERE client_id = ?').all(req.principal.clientId) })));
enterpriseRouter.post('/brands', wrap((req, res) => {
  const name = String(req.body.name || '').trim(); if (!name) fail('Brand name is required.');
  const clientId = req.principal.global ? (req.body.clientId || req.principal.clientId) : req.principal.clientId;
  if (!db.prepare('SELECT 1 FROM clients WHERE client_id = ?').get(clientId)) fail('Workspace not found.');
  const zone = req.body.timezone || 'Asia/Kolkata'; if (!DateTime.now().setZone(zone).isValid) fail('Invalid timezone.');
  const now = new Date().toISOString(); const id = `BR-${crypto.randomUUID()}`;
  db.prepare('INSERT INTO brands (brand_id, client_id, brand_name, default_timezone, country, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, clientId, name, zone, req.body.country || '', now, now);
  audit(req.principal, 'brand', id, 'create'); res.status(201).json({ id: resolveBrand(id).ui_id, brandId: id, name });
}));
enterpriseRouter.put('/brands/:id', wrap((req, res) => {
  const b = ownBrand(req, req.params.id); const input = req.body;
  if (input.tokens && Object.values(input.tokens).some(Boolean)) fail('Connect accounts through Connections. Credentials cannot be saved in a brand profile.');
  const zone = input.timezone || b.default_timezone; if (!DateTime.now().setZone(zone).isValid) fail('Invalid timezone.');
  db.prepare('UPDATE brands SET brand_name = ?, default_timezone = ?, country = ?, primary_color = ?, secondary_color = ?, default_hashtags = ?, default_keywords = ?, version = version + 1, updated_at = ? WHERE brand_id = ?').run(input.name || b.brand_name, zone, input.country ?? b.country, input.primaryColor || b.primary_color, input.secondaryColor || b.secondary_color, input.defaultHashtags ?? b.default_hashtags, input.defaultKeywords ?? b.default_keywords, new Date().toISOString(), b.brand_id);
  audit(req.principal, 'brand', b.brand_id, 'update'); res.json({ ...input, id: b.ui_id, brandId: b.brand_id });
}));
enterpriseRouter.delete('/brands/:id', wrap(() => fail('Archive the brand after resolving its posts and accounts. Permanent brand deletion is not available from this release.', 409)));
const accounts = wrap((req, res) => {
  const brands = tenantBrands(req.principal); const ids = brands.map(b => b.brand_id);
  const rows: any[] = ids.length ? db.prepare(`SELECT rowid AS ui_id, * FROM social_accounts WHERE brand_id IN (${ids.map(() => '?')})`).all(...ids) : [];
  res.json({ data: rows.map(a => ({ id: a.ui_id, accountId: a.account_id, brandId: brands.find(b => b.brand_id === a.brand_id)?.ui_id,
    platform: a.platform, accountName: a.account_name || a.platform, accountHandle: a.account_handle, socialMediaId: a.external_id,
    externalId: a.external_id, connectionStatus: a.status !== 'active' ? 'disconnected' : a.token_expires_at && Date.parse(a.token_expires_at) <= Date.now() ? 'expired' : 'connected',
    tokenExpiresAt: a.token_expires_at, lastCheckedAt: a.last_checked_at,
  })) });
});
enterpriseRouter.get('/accounts', accounts); enterpriseRouter.get('/social-accounts', accounts);

enterpriseRouter.get('/posts', wrap((req, res) => {
  const p = req.principal; const predicates = ['deleted_at IS NULL']; const values: any[] = [];
  if (!p.global) { predicates.push('client_id = ?'); values.push(p.clientId); }
  if (req.query.brandId) { predicates.push('brand_id = ?'); values.push(ownBrand(req, req.query.brandId).brand_id); }
  const rows: any[] = db.prepare(`SELECT post_id FROM posts WHERE ${predicates.join(' AND ')} ORDER BY scheduled_utc DESC LIMIT 1000`).all(...values);
  let posts = rows.map(r => formatPost(r.post_id));
  if (req.query.approvalStatus) posts = posts.filter(p => p.approvalStatus === req.query.approvalStatus);
  if (req.query.publishingStatus) posts = posts.filter(p => p.publishingStatus === req.query.publishingStatus);
  if (req.query.search) { const search = String(req.query.search).toLowerCase(); posts = posts.filter(p => `${p.title} ${p.masterCaption}`.toLowerCase().includes(search)); }
  res.json({ data: posts });
}));
enterpriseRouter.get('/posts/:id', wrap((req, res) => { const post = postById(req); res.json(formatPost(post.post_id)); }));
enterpriseRouter.post('/posts', wrap((req, res) => {
  const input = req.body; const brand = ownBrand(req, input.brandId); const submit = input.submitForApproval === true;
  const title = String(input.title || '').trim(); const caption = String(input.masterCaption ?? input.caption ?? '');
  if (!title || title.length > 255 || !caption.trim() || caption.length > 5000) fail('Enter a title and a caption of up to 5,000 characters.');
  const date = schedule(input, input.timezone || brand.default_timezone, !submit);
  const media = Array.isArray(input.media) ? input.media : (input.mediaUrls || []).map((fileUrl: string) => ({ fileUrl }));
  if (media.some((m: any) => typeof m.fileUrl !== 'string' || (!/^https:\/\//i.test(m.fileUrl) && !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(m.fileUrl)))) fail('Use HTTPS media URLs or uploaded files.');
  const placements = input.placements || (Array.isArray(input.placement) ? input.placement : [input.placement || 'feed']);
  if (placements.length !== 1 || !['feed', 'story', 'reels_shorts'].includes(placements[0])) fail('Choose one supported placement per post.');
  const platforms = Array.isArray(input.platforms) ? input.platforms.map((p: any) => typeof p === 'string' ? { platform: p } : p) : [];
  const selected: any[] = [];
  if (input.accountIds?.length) {
    for (const id of new Set(input.accountIds as string[])) {
      const account: any = db.prepare('SELECT * FROM social_accounts WHERE account_id = ? AND brand_id = ? AND client_id = ?').get(id, brand.brand_id, brand.client_id);
      if (!account) fail('A selected account is not available for this brand.'); selected.push(account);
    }
  } else for (const platform of new Set(platforms.map((p: any) => p.platform))) {
    const matches: any[] = db.prepare("SELECT * FROM social_accounts WHERE brand_id = ? AND client_id = ? AND platform = ? AND status = 'active'").all(brand.brand_id, brand.client_id, String(platform));
    if (matches.length !== 1) fail('Select an unambiguous connected account for each channel.'); selected.push(matches[0]);
  }
  if (submit && !selected.length) fail('Select a connected account before submitting.');
  if (submit && selected.some(a => a.status !== 'active' || !['facebook', 'instagram'].includes(a.platform))) fail('This release publishes to eligible Facebook and Instagram accounts only.');
  if (submit && (media.length !== 1 || (selected.some(a => a.platform === 'facebook') && ((input.mediaType || media[0]?.mediaType) !== 'image' || placements[0] !== 'feed')))) fail('Use one image for Facebook feed. Instagram supports one image or video in a supported placement.');
  const now = new Date().toISOString(); const id = generatePostId();
  tx(() => {
    db.prepare(`INSERT INTO posts (post_id, client_id, brand_id, title, caption, hashtags, media_type, media_urls, link_url, schedule_local_date, schedule_local_time, timezone, scheduled_utc, approval_status, source, placement, created_by_user_id, revision_data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'dashboard', ?, ?, ?, ?, ?)`).run(id, brand.client_id, brand.brand_id, title, caption, Array.isArray(input.hashtags) ? input.hashtags.join(' ') : String(input.hashtags || ''), input.mediaType || media[0]?.mediaType || 'image', JSON.stringify(media.map((m: any) => m.fileUrl)), input.targetUrl || input.linkUrl || '', date.date, date.time, input.timezone || brand.default_timezone, date.utc, submit ? 'PendingApproval' : 'Draft', JSON.stringify(placements), req.principal.id, JSON.stringify({ platforms, media, campaignName: input.campaignName, firstComment: input.firstComment, unscheduled: date.unscheduled }), now, now);
    for (const account of selected) { const target = generateTargetId(); db.prepare("INSERT INTO post_targets (target_id, post_id, account_id, platform, status, idempotency_key, created_at, updated_at) VALUES (?, ?, ?, ?, 'Draft', ?, ?, ?)").run(target, id, account.account_id, account.platform, computeIdempotencyKey(target, date.utc, 1), now, now); }
    remember(db.prepare('SELECT * FROM posts WHERE post_id = ?').get(id), req.principal.email); audit(req.principal, 'post', id, submit ? 'submit' : 'create');
  });
  sseManager.emit('post.created', brand.client_id, { postId: id }); res.status(201).json({ data: formatPost(id) });
}));
enterpriseRouter.patch('/posts/:id', wrap((req, res) => {
  const post = postById(req); const input = req.body;
  const creator:any=db.prepare("SELECT id FROM antigravity_video_jobs WHERE post_id=? AND json_extract(input_json,'$.workflow')='creator'").get(post.post_id);
  if(creator){saveCreatorSchedule(req.principal,creator.id,{...input,versionNumber:Number(req.headers['if-match']||input.versionNumber||input.version)});return res.json(formatPost(post.post_id));}
  const expected = Number(req.headers['if-match'] || input.versionNumber || input.version);
  if (!Number.isInteger(expected)) fail('Refresh the post before editing; its version is required.', 428);
  if (expected !== post.version) fail('Another user changed this post. Refresh before editing.', 409);
  const inFlight = db.prepare("SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('Processing', 'NeedsVerification', 'Posted')").get(post.post_id);
  if (inFlight) fail('Published, publishing, or uncertain content cannot be edited. Create a new draft instead.', 409);
  const revision = json(post.revision_data, {});
  const changesSchedule = ['scheduledAt', 'scheduleDate', 'scheduleTime', 'timezone'].some(key => Object.hasOwn(input, key));
  const date = changesSchedule
    ? schedule({ scheduledAt: input.scheduledAt, scheduleDate: input.scheduleDate || post.schedule_local_date, scheduleTime: input.scheduleTime || post.schedule_local_time }, input.timezone || post.timezone, false)
    : { utc: post.scheduled_utc, date: post.schedule_local_date, time: post.schedule_local_time, unscheduled: !!revision.unscheduled };
  revision.unscheduled = date.unscheduled;
  const title = input.title ?? post.title; const caption = input.masterCaption ?? input.caption ?? post.caption;
  if (typeof title !== 'string' || !title.trim() || title.length > 255 || typeof caption !== 'string' || !caption.trim() || caption.length > 5000) fail('A valid title and caption are required.');
  const now = new Date().toISOString();
  tx(() => {
    remember(post, req.principal.email);
    db.prepare("UPDATE posts SET title = ?, caption = ?, schedule_local_date = ?, schedule_local_time = ?, timezone = ?, scheduled_utc = ?, revision_data = ?, approval_status = 'Draft', approved_by = NULL, approved_at = NULL, approved_version = NULL, version = version + 1, updated_at = ? WHERE post_id = ? AND version = ?").run(title, caption, date.date, date.time, input.timezone || post.timezone, date.utc, JSON.stringify(revision), now, post.post_id, expected);
    for (const target of db.prepare('SELECT * FROM post_targets WHERE post_id = ?').all(post.post_id) as any[]) db.prepare("UPDATE post_targets SET status = 'Draft', idempotency_key = ?, claimed_post_version = NULL, lock_execution_id = NULL, lock_stage = NULL, locked_at = NULL, error_message = NULL, error_code = NULL, attempt_count = 0, next_retry_at = NULL, version = version + 1, updated_at = ? WHERE target_id = ?").run(computeIdempotencyKey(target.target_id, date.utc, expected + 1), now, target.target_id);
    remember(db.prepare('SELECT * FROM posts WHERE post_id = ?').get(post.post_id), req.principal.email); audit(req.principal, 'post', post.post_id, 'revise', { version: expected + 1, approvalInvalidated: true });
  });
  sseManager.emit('post.updated', post.client_id, { postId: post.post_id }); res.json(formatPost(post.post_id));
}));
enterpriseRouter.delete('/posts/:id', wrap((req, res) => {
  const post = postById(req);
  if (db.prepare("SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('Processing', 'NeedsVerification')").get(post.post_id)) fail('Wait for in-flight publication to be reconciled before archiving.', 409);
  const now = new Date().toISOString(); tx(() => {
    db.prepare('UPDATE posts SET deleted_at = ?, updated_at = ?, approved_version = NULL WHERE post_id = ?').run(now, now, post.post_id);
    db.prepare("UPDATE post_targets SET status = 'Cancelled', version = version + 1, updated_at = ? WHERE post_id = ? AND status != 'Posted'").run(now, post.post_id);
    audit(req.principal, 'post', post.post_id, 'archive');
  }); res.json({ message: 'Post archived. Existing social posts were not deleted.' });
}));
for (const action of ['submit', 'approve', 'reject', 'request-revision']) enterpriseRouter.post(`/posts/:id/${action}`, wrap((req, res) => {
  const post = postById(req); const now = new Date().toISOString();
  const video:any=db.prepare('SELECT id FROM antigravity_video_jobs WHERE post_id=?').get(post.post_id);
  if (video) {
    if (action==='submit') {
      const row:any=db.prepare('SELECT input_json FROM antigravity_video_jobs WHERE id=?').get(video.id);
      if(JSON.parse(row.input_json).workflow!=='creator')return fail('Use the Video approvals dashboard to review or recreate this video.',409);
      submitCreatorForApproval(req.principal,video.id,Number(req.headers['if-match']||req.body?.versionNumber));return res.json(formatPost(post.post_id));
    }
    reviewVideoJob(req.principal,video.id,{action:action==='request-revision'?'request-changes':action,
      notes:req.body.reason || req.body.comments || '',versionNumber:Number(req.headers['if-match'] || req.body?.versionNumber)});
    return res.json(formatPost(post.post_id));
  }
  if (db.prepare("SELECT 1 FROM post_targets WHERE post_id = ? AND status IN ('Processing', 'NeedsVerification', 'Posted')").get(post.post_id)) fail('This post has publishing activity and cannot change approval state.', 409);
  const expected = Number(req.headers['if-match'] || req.body?.versionNumber);
  if (!Number.isInteger(expected)) fail('Refresh the post before reviewing; its version is required.', 428);
  if (expected !== post.version) fail('The post changed. Review its current version.', 409);
  if (action === 'approve') {
    if (!canApprove(req.principal)) fail('Approval permission is required.', 403);
    if (post.approval_status !== 'PendingApproval') fail('Submit this post for review before approving it.', 409);
    if (post.created_by_user_id === req.principal.id && process.env.ALLOW_SELF_APPROVAL !== 'true') fail('A different approver must review this post.');
    if (json(post.revision_data, {}).unscheduled || Date.parse(post.scheduled_utc) <= Date.now()) fail('Set a future publication time before approval.');
    const targets: any[] = db.prepare('SELECT t.*, a.status AS account_status, a.token_expires_at FROM post_targets t JOIN social_accounts a ON a.account_id = t.account_id WHERE t.post_id = ?').all(post.post_id);
    if (!targets.length || targets.some(t => t.account_status !== 'active' || (t.token_expires_at && Date.parse(t.token_expires_at) <= Date.now()))) fail('Reconnect the selected accounts before approval.');
  }
  const status = action === 'approve' ? 'Approved' : action === 'submit' ? 'PendingApproval' : action === 'reject' ? 'Rejected' : 'ChangesRequested';
  tx(() => {
    db.prepare('UPDATE posts SET approval_status = ?, approved_version = ?, approved_by = ?, approved_at = ?, updated_at = ? WHERE post_id = ?').run(status, action === 'approve' ? post.version : null, action === 'approve' ? req.principal.email : null, action === 'approve' ? now : null, now, post.post_id);
    db.prepare("UPDATE post_targets SET status = ?, version = version + 1, updated_at = ? WHERE post_id = ? AND status NOT IN ('Posted','Processing','NeedsVerification','Cancelled')").run(action === 'approve' ? 'Scheduled' : 'Draft', now, post.post_id);
    audit(req.principal, 'post', post.post_id, action, { version: post.version, reason: req.body.reason || req.body.comments || null });
  }); sseManager.emit('post.updated', post.client_id, { postId: post.post_id }); res.json(formatPost(post.post_id));
}));
const publishNow = wrap(async (req, res) => {
  const post = postById(req);
  if (post.approval_status !== 'Approved' || post.approved_version !== post.version) fail('The current revision must be approved before publishing.', 409);
  const targets: any[] = db.prepare("SELECT * FROM post_targets WHERE post_id = ? AND status IN ('Scheduled','Retrying','Failed','Missed')").all(post.post_id);
  if (!targets.length) fail('No destinations are eligible. Published or uncertain destinations will not be submitted again.', 409);
  const executionId = `EXEC-${crypto.randomUUID()}`; const now = new Date().toISOString();
  tx(() => {
    db.prepare('UPDATE posts SET scheduled_utc = ?, updated_at = ? WHERE post_id = ?').run(now, now, post.post_id);
    db.prepare("UPDATE post_targets SET status = 'Scheduled', attempt_count = 0, next_retry_at = NULL, version = version + 1 WHERE post_id = ? AND status IN ('Failed','Missed')").run(post.post_id);
    db.prepare("INSERT INTO executions_cache (execution_id, workflow_id, status, mode, started_at, target_ids, created_at, updated_at) VALUES (?, 'application-publisher', 'running', 'manual', ?, ?, ?, ?)").run(executionId, now, JSON.stringify(targets.map(t => t.target_id)), now, now);
    audit(req.principal, 'post', post.post_id, 'publish_now', { executionId, targetIds: targets.map(t => t.target_id) });
  });
  for (const target of targets) await publishTargetDirectly(target, post, executionId);
  const result = formatPost(post.post_id);
  db.prepare('UPDATE executions_cache SET status = ?, stopped_at = ?, updated_at = ? WHERE execution_id = ?').run(result.publishingStatus === 'published' ? 'succeeded' : result.publishingStatus, new Date().toISOString(), new Date().toISOString(), executionId);
  sseManager.emit('post.updated', post.client_id, { postId: post.post_id });
  res.json({ status: result.publishingStatus, message: result.publishingStatus === 'published' ? 'Publication confirmed by the provider.' : 'Review the outcome for each destination before retrying.', post: result, executionId });
});
enterpriseRouter.post('/posts/:id/publish-now', publishNow); enterpriseRouter.post('/posts/:id/publish', publishNow);
enterpriseRouter.post('/posts/multi-brand-publish', wrap(() => fail('Create and approve a scheduled post for each brand. Immediate cross-brand broadcast is disabled to preserve approvals.', 409)));

enterpriseRouter.post('/posts/:id/comments', wrap((req, res) => {
  const post = postById(req); const p = req.principal; const text = String(req.body.commentText || '').trim(); if (!text || text.length > 5000) fail('Enter a comment of up to 5,000 characters.');
  const now = new Date().toISOString(); const result = db.prepare('INSERT INTO post_comments (post_id, user_id, user_full_name, user_role, comment_text, created_at) VALUES (?, ?, ?, ?, ?, ?)').run(post.post_id, p.id, p.fullName, p.role, text, now);
  res.status(201).json({ id: Number(result.lastInsertRowid), postId: post.post_id, userId: p.id, userFullName: p.fullName, userRole: p.role, commentText: text, isSystemMessage: false, isEdited: false, createdAt: now });
}));
enterpriseRouter.get('/notifications', wrap((req, res) => res.json({ data: (db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY id DESC LIMIT 50').all(req.principal.id) as any[]).map(n => ({ id: n.id, userId: n.user_id, title: n.title, message: n.message, eventType: n.event_type, linkUrl: n.link_url, isRead: !!n.is_read, createdAt: n.created_at })) })));
enterpriseRouter.post('/notifications/:id/read', wrap((req, res) => { db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.principal.id); res.json({ success: true }); }));
enterpriseRouter.get('/users', wrap((req, res) => res.json({ data: (req.principal.global ? db.prepare('SELECT * FROM users').all() : db.prepare('SELECT * FROM users WHERE client_id = ?').all(req.principal.clientId)).map(safeUser) })));
enterpriseRouter.get('/users/workspaces', wrap((req, res) => {
  if (!isAdmin(req.principal)) fail('Team management permission is required.',403);
  const rows:any[]=req.principal.global
    ? db.prepare("SELECT client_id AS clientId,name FROM clients WHERE status='active' ORDER BY name").all()
    : db.prepare("SELECT client_id AS clientId,name FROM clients WHERE client_id=? AND status='active'").all(req.principal.clientId);
  res.json({data:rows.map(row=>({...row,brands:(db.prepare('SELECT brand_name FROM brands WHERE client_id=? ORDER BY brand_name').all(row.clientId) as any[]).map(b=>b.brand_name)}))});
}));
enterpriseRouter.post('/users', wrap((req, res) => {
  if (!isAdmin(req.principal)) fail('Team management permission is required.',403);
  const input=req.body || {};
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  const fullName=typeof input.fullName==='string'?input.fullName.trim():'';
  if (!roles.has(input.role)) fail('Choose Admin, Content Manager, Approver, Analyst, or Client.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length>254 || !fullName || fullName.length>200) fail('Enter a valid email and a name of up to 200 characters.');
  if (typeof input.password!=='string' || input.password.length<12 || input.password.length>128) fail('Use a login password of 12–128 characters.');
  if (input.isActive!==undefined && typeof input.isActive!=='boolean') fail('Account activation must be true or false.');
  if (input.avatarUrl!==undefined && (typeof input.avatarUrl!=='string' || input.avatarUrl.length>262144)) fail('Choose a smaller profile image.');
  const requestedClient=typeof input.clientId==='string'?input.clientId.trim():'';
  if (!req.principal.global && requestedClient && requestedClient!==req.principal.clientId) fail('You can add members only to your own workspace.',403);
  const clientId=req.principal.global?requestedClient:req.principal.clientId;
  const workspace:any=db.prepare("SELECT client_id,name FROM clients WHERE client_id=? AND status='active'").get(clientId);
  if (!workspace) fail('Select an active workspace for this member.');
  if (db.prepare('SELECT 1 FROM users WHERE LOWER(email)=?').get(email)) fail('A member with this email already exists. Edit or reactivate that member.',409);
  const created=tx(()=>{
    const result=db.prepare('INSERT INTO users (email,full_name,role,tenant_scope,client_id,password,is_active,avatar_url,created_at) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(email,fullName,input.role,workspace.name,clientId,hashSync(input.password,12),input.isActive===false?0:1,input.avatarUrl || null,new Date().toISOString());
    audit(req.principal,'user',String(result.lastInsertRowid),'create',{clientId,role:input.role,active:input.isActive!==false});
    return safeUser(db.prepare('SELECT * FROM users WHERE user_id=?').get(Number(result.lastInsertRowid)));
  });
  res.status(201).json(created);
}));
enterpriseRouter.patch('/users/:id', wrap((req, res) => {
  const user: any = db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.params.id); if (!user) fail('User not found.', 404);
  const input = req.body; const admin = isAdmin(req.principal);
  if (!admin && Number(req.params.id) !== req.principal.id) fail('Permission denied.', 403);
  if (input.password && (!input.currentPassword || !compareSync(String(input.currentPassword), user.password))) fail('Enter the current password to change it.', 403);
  if (input.password && (input.password.length < 12 || input.password.length > 128)) fail('Use a password of 12–128 characters.');
  if (input.role && !roles.has(input.role) && !(req.principal.global && input.role === 'Super Admin')) fail('Invalid role.');
  if (Number(req.params.id) === req.principal.id && (input.isActive === false || (input.role && input.role !== user.role))) fail('Another administrator must change your own access.');
  db.prepare('UPDATE users SET full_name = ?, avatar_url = ?, role = ?, is_active = ?, password = ? WHERE user_id = ?').run(input.fullName || user.full_name, input.avatarUrl ?? user.avatar_url, admin ? (input.role || user.role) : user.role, admin && input.isActive !== undefined ? Number(input.isActive) : user.is_active, input.password ? hashSync(input.password, 12) : user.password, user.user_id);
  if (input.password || input.role || input.isActive === false) db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(user.user_id);
  audit(req.principal, 'user', String(user.user_id), 'update', { role: input.role, active: input.isActive }); res.json(safeUser(db.prepare('SELECT * FROM users WHERE user_id = ?').get(user.user_id)));
}));
enterpriseRouter.delete('/users/:id', wrap((req, res) => {
  if (Number(req.params.id) === req.principal.id) fail('You cannot deactivate your own account.');
  db.prepare('UPDATE users SET is_active = 0 WHERE user_id = ?').run(req.params.id); db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(req.params.id);
  audit(req.principal, 'user', String(req.params.id), 'deactivate'); res.json({ message: 'User deactivated; history retained.' });
}));
enterpriseRouter.get('/analytics/report', wrap((req, res) => {
  // A report has one workspace scope, even for a global operator.
  const brand = req.query.brandId ? ownBrand(req, req.query.brandId) : undefined;
  const clientId = brand?.client_id || req.principal.clientId;
  res.json(buildAnalyticsReport(db, { clientId }, parseReportFilters({ ...req.query, brandId: brand?.brand_id })));
}));
enterpriseRouter.get('/analytics/overview', wrap((req, res) => {
  const brands = tenantBrands(req.principal); const ids = brands.map(b => b.brand_id);
  const posts: any[] = ids.length ? db.prepare(`SELECT post_id, approval_status FROM posts WHERE deleted_at IS NULL AND brand_id IN (${ids.map(() => '?')})`).all(...ids) : [];
  const formatted = posts.map(p => formatPost(p.post_id)); const count = (s: string) => formatted.filter(p => p.publishingStatus === s).length;
  const approvalBreakdown: any = { draft: 0, in_review: 0, revision_requested: 0, approved: 0, rejected: 0, overdue: 0 };
  const publishedByPlatform: any = { facebook: 0, instagram: 0, linkedin: 0, youtube: 0, x: 0, whatsapp: 0 };
  for (const p of formatted) { approvalBreakdown[p.approvalStatus]++; for (const t of p.platforms) if (t.publishingStatus === 'success') publishedByPlatform[t.platform] = (publishedByPlatform[t.platform] || 0) + 1; }
  const connected: any = ids.length ? db.prepare(`SELECT count(*) c FROM social_accounts WHERE status = 'active' AND brand_id IN (${ids.map(() => '?')})`).get(...ids) : { c: 0 };
  res.json({ totalScheduledPosts: count('scheduled'), totalPublishedPosts: count('published'), pendingApprovals: approvalBreakdown.in_review, rejectedPosts: approvalBreakdown.rejected, failedAutomations: count('failed'), activeWorkflows: null, connectedPlatforms: connected.c,
    totalEngagement: null, totalImpressions: null, totalReach: null, engagementRate: null, publishedByPlatform, approvalBreakdown, metricsStatus: 'Use Reports for provider-supported measurements and coverage.' });
}));
enterpriseRouter.get('/events', wrap((req, res) => sseManager.addClient(req.principal.clientId, res, req.headers['last-event-id'] ? Number(req.headers['last-event-id']) : undefined)));
// Previously these endpoints returned fabricated success without doing any work.
for (const route of ['/n8n/auto-import', '/n8n/reset-owner']) enterpriseRouter.post(route, wrap(() => fail('Configure and verify this operation through your n8n administrator.', 501)));

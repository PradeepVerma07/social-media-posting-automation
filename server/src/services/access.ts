import crypto from 'node:crypto';
import { Router, type Request, type Response, type NextFunction } from 'express';
import { compareSync, hashSync } from 'bcryptjs';
import { db } from '../db/sqlite';

export interface Principal { id: number; email: string; fullName: string; role: string; clientId: string; global: boolean; }
declare global { namespace Express { interface Request { principal: Principal; rawBody?: Buffer; } } }
const cookieName = 'webtrionix_session';
const roles = new Set(['Admin', 'Content Manager', 'Approver', 'Analyst', 'Client']);
export const isAdmin = (p: Principal) => p.global || p.role === 'Admin';
export const canApprove = (p: Principal) => isAdmin(p) || p.role === 'Approver';
export const canEdit = (p: Principal) => isAdmin(p) || p.role === 'Content Manager';
export const safeUser = (u: any) => ({ id: u.user_id, email: u.email, fullName: u.full_name, role: u.role, clientId: u.client_id, avatarUrl: u.avatar_url, tenantScope: u.tenant_scope, isActive: !!u.is_active, twoFactorEnabled: false, createdAt: u.created_at });
const tokenHash = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
const loginAttempts = new Map<string, { count: number; until: number }>();

export function resolveBrand(id: unknown): any {
  if (id === undefined || id === null || id === '') return undefined;
  return db.prepare('SELECT rowid AS ui_id, * FROM brands WHERE brand_id = ? OR rowid = ?').get(String(id), /^\d+$/.test(String(id)) ? Number(id) : -1);
}
export function canAccessBrand(p: Principal, brand: any): boolean { return !!brand && (p.global || brand.client_id === p.clientId); }
export function ownBrand(req: Request, id: unknown): any {
  const brand = resolveBrand(id);
  if (!canAccessBrand(req.principal, brand)) throw Object.assign(new Error('Brand not found or access denied.'), { status: 404 });
  return brand;
}
export function tenantBrands(p: Principal): any[] {
  return p.global ? db.prepare('SELECT rowid AS ui_id, * FROM brands ORDER BY rowid').all() : db.prepare('SELECT rowid AS ui_id, * FROM brands WHERE client_id = ? ORDER BY rowid').all(p.clientId);
}

export function issueSession(res: Response, userId: number) {
  const token = crypto.randomBytes(32).toString('base64url');
  const now = new Date();
  db.prepare('INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(tokenHash(token), userId, now.toISOString(), new Date(now.getTime() + 86400000).toISOString());
  res.cookie(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 86400000, path: '/' });
}
function readToken(req: Request) {
  const cookie = String(req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith(cookieName + '='));
  try { return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); }
  catch { return ''; }
}
export function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = readToken(req);
  if (!token || token.length > 512) return res.status(401).json({ error: 'Please sign in to continue.' });
  const user: any = db.prepare(`SELECT u.*, s.expires_at FROM auth_sessions s JOIN users u ON u.user_id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ? AND u.is_active = 1`).get(tokenHash(token), new Date().toISOString());
  if (!user) return res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  if (!user.client_id && user.role !== 'Super Admin') return res.status(403).json({ error: 'Your workspace access needs to be assigned by an administrator.' });
  req.principal = { id: user.user_id, email: user.email, fullName: user.full_name, role: user.role, clientId: user.client_id || 'CL-001', global: user.role === 'Super Admin' };
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin) {
    const allowed = process.env.APP_URL || process.env.PUBLIC_BASE_URL;
    const expectedHost = allowed ? new URL(allowed).host : req.get('host');
    try { if (new URL(req.headers.origin).host !== expectedHost) return res.status(403).json({ error: 'Cross-origin request denied.' }); }
    catch { return res.status(403).json({ error: 'Invalid request origin.' }); }
  }
  next();
}

export const authRouter = Router();
authRouter.post('/login', (req, res) => {
  const identifier = String(req.body?.identifier || req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const key = `${req.ip}:${identifier}`;
  const old = loginAttempts.get(key);
  if (old && old.until > Date.now() && old.count >= 10) return res.status(429).json({ error: 'Too many sign-in attempts. Try again in 15 minutes.' });
  if (!identifier || !password || password.length > 256) return res.status(400).json({ error: 'Email and password are required.' });
  const user: any = db.prepare('SELECT * FROM users WHERE LOWER(email) = ?').get(identifier);
  const valid = user && user.is_active && typeof user.password === 'string' && /^\$2[aby]\$/.test(user.password) && compareSync(password, user.password);
  if (!valid) {
    const current = old && old.until > Date.now() ? old : { count: 0, until: Date.now() + 900000 };
    loginAttempts.set(key, { ...current, count: current.count + 1 });
    if (loginAttempts.size > 10000) for (const [k, value] of loginAttempts) if (value.until < Date.now()) loginAttempts.delete(k);
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  loginAttempts.delete(key);
  issueSession(res, user.user_id);
  res.json({ success: true, user: safeUser(user), accessToken: 'session', expiresIn: '24h' });
});
authRouter.post('/signup', (req, res) => {
  if (process.env.ALLOW_PUBLIC_SIGNUP !== 'true') return res.status(403).json({ error: 'Contact your workspace administrator for an invitation.' });
  const { email, fullName, brandName, password } = req.body || {};
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof fullName !== 'string' || !fullName.trim() || typeof brandName !== 'string' || !brandName.trim() || typeof password !== 'string' || password.length < 12 || password.length > 128) return res.status(400).json({ error: 'Enter a valid email, name, brand, and a password of 12–128 characters.' });
  if (db.prepare('SELECT 1 FROM users WHERE LOWER(email) = ?').get(email.toLowerCase().trim())) return res.status(409).json({ error: 'This email already has an account.' });
  const id = crypto.randomUUID(); const clientId = `CL-${id}`; const brandId = `BR-${id}`; const now = new Date().toISOString();
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO clients (client_id, name, created_at, updated_at) VALUES (?, ?, ?, ?)').run(clientId, brandName.trim(), now, now);
    db.prepare('INSERT INTO brands (brand_id, client_id, brand_name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)').run(brandId, clientId, brandName.trim(), now, now);
    const result = db.prepare(`INSERT INTO users (email, full_name, role, tenant_scope, client_id, password, created_at) VALUES (?, ?, 'Admin', ?, ?, ?, ?)`).run(email.trim().toLowerCase(), fullName.trim(), brandName.trim(), clientId, hashSync(password, 12), now);
    db.exec('COMMIT');
    const user: any = db.prepare('SELECT * FROM users WHERE user_id = ?').get(Number(result.lastInsertRowid));
    issueSession(res, user.user_id);
    res.status(201).json({ success: true, user: safeUser(user), accessToken: 'session' });
  } catch (error) { db.exec('ROLLBACK'); throw error; }
});
authRouter.get('/me', authenticate, (req, res) => res.json({ user: safeUser(db.prepare('SELECT * FROM users WHERE user_id = ?').get(req.principal.id)) }));
authRouter.post('/logout', (req, res) => {
  const token = readToken(req); if (token) db.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').run(tokenHash(token));
  res.clearCookie(cookieName, { path: '/', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
  res.json({ success: true });
});

export function authorize(req: Request, res: Response, next: NextFunction) {
  const p = req.principal; const route = req.path; const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
  const fail = () => res.status(403).json({ error: 'Your role does not allow this action.' });
  // Legacy operator-only features have not been audited for tenant-safe payloads.
  const studioRoute = /^\/ai\/studio(?:\/|$)/.test(route);
  if (!studioRoute && /^\/(ai|feed|social|database|sync|n8n|integrations|workflows|executions|audit-logs|webhooks|api)(\/|$)/.test(route) && !p.global) return fail();
  if (write && /^\/posts\//.test(route)) {
    if (/\/(approve|approve-reviewed|reject|request-revision)$/.test(route) && !canApprove(p)) return fail();
    if (/\/(publish|publish-now)$/.test(route) && !canApprove(p)) return fail();
    if (/\/(submit|submit-for-review)$/.test(route) && !canEdit(p)) return fail();
    if (req.method === 'PATCH' && !canEdit(p)) return fail();
    if (req.method === 'DELETE' && !isAdmin(p)) return fail();
  }
  if (write && ['/posts', '/posts/multi-brand-publish', '/upload'].includes(route) && !canEdit(p)) return fail();
  if (write && /^\/(brands|social-accounts|accounts)(\/|$)/.test(route) && !isAdmin(p)) return fail();
  if (write && /^\/users(\/|$)/.test(route) && !isAdmin(p)) {
    if (req.method !== 'PATCH' || route !== `/users/${p.id}` || Object.keys(req.body || {}).some(k => !['avatarUrl', 'fullName', 'password', 'currentPassword'].includes(k))) return fail();
  }
  if (req.body?.role === 'Super Admin' && !p.global) return fail();
  const postMatch = route.match(/^\/posts\/([^/]+)/);
  if (postMatch && postMatch[1] !== 'multi-brand-publish') {
    const post: any = db.prepare('SELECT * FROM posts WHERE post_id = ? AND deleted_at IS NULL').get(postMatch[1]);
    if (!post || (!p.global && post.client_id !== p.clientId)) return res.status(404).json({ error: 'Post not found.' });
  }
  const brandMatch = route.match(/^\/brands\/([^/]+)/);
  if (brandMatch && brandMatch[1] !== 'verify-token' && !canAccessBrand(p, resolveBrand(brandMatch[1]))) return res.status(404).json({ error: 'Brand not found.' });
  const targetUserId = route.match(/^\/users\/(\d+)$/)?.[1];
  if (targetUserId) {
    const user: any = db.prepare('SELECT client_id, role FROM users WHERE user_id = ?').get(Number(targetUserId));
    if (!user || (!p.global && (user.client_id !== p.clientId || user.role === 'Super Admin'))) return res.status(404).json({ error: 'User not found.' });
  }
  for (const value of [req.body?.brandId, req.query.brandId, ...(Array.isArray(req.body?.brandIds) ? req.body.brandIds : [])]) {
    if (value !== undefined && value !== '' && !canAccessBrand(p, resolveBrand(value))) return res.status(404).json({ error: 'Brand not found.' });
  }
  for (const value of [req.body?.clientId, req.query.clientId]) if (value && !p.global && value !== p.clientId) return fail();
  if (req.body?.userId && Number(req.body.userId) !== p.id && !isAdmin(p)) return fail();
  if (/^\/posts\/[^/]+\/(approve-reviewed|submit-for-review|recommendations)(\/|$)/.test(route)) return res.status(409).json({ error: 'Use the standard draft and approval workflow for this release.' });
  next();
}

export function audit(actor: Principal, entity: string, entityId: string, action: string, details: unknown = null) {
  db.prepare('INSERT INTO audit_log (id, actor, entity, entity_id, action, after_val, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), actor.email, entity, entityId, action, JSON.stringify(details), new Date().toISOString());
}
export { hashSync, compareSync, roles };

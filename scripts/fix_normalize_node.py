import sqlite3, os, json

db_path = os.path.expanduser('~/.n8n/database.sqlite')
conn = sqlite3.connect(db_path)
cur = conn.cursor()

cur.execute('SELECT nodes, connections, versionId FROM workflow_entity WHERE id = ?', ('Utaz0U82aZQZ7uHF',))
row = cur.fetchone()
nodes = json.loads(row[0])
conns = json.loads(row[1])
v_id = row[2]

new_normalize_code = """// Normalize response from all platform HTTP nodes
let post = {};
try {
  post = $('Validate Content Limits').item ? $('Validate Content Limits').item.json : $('Validate Content Limits').first().json;
} catch (e) {
  try { post = $('Validate Content Limits').first().json; } catch (err) {
    try { post = $('Unroll Due Posts').first().json; } catch (err2) {}
  }
}

let config = { max_retries: 3 };
try { config = $('Parse Settings Config').first().json.config || config; } catch (e) {}

const platform = String(post.platform || '').toLowerCase().trim();
const response = $input.first() ? $input.first().json : {};

const statusCode = response.statusCode || (response.headers ? response.headers.status : 200) || 200;
const body = response.body || response.data || response;
const maxRetries = config.max_retries || 3;
const currentAttempt = parseInt(post.attempt_count || '0', 10) + 1;

let isSuccess = statusCode >= 200 && statusCode < 300;
let platformPostId = '';
let postUrl = '';
let errorCode = '';
let errorMessage = '';

if (body.error || body.errors) {
  isSuccess = false;
  const errObj = body.error || (Array.isArray(body.errors) ? body.errors[0] : body.errors);
  errorMessage = String(errObj.message || errObj.detail || JSON.stringify(errObj)).substring(0, 500);
}

if (isSuccess) {
  if (platform === 'facebook') {
    platformPostId = body.id || body.post_id || '';
    postUrl = `https://facebook.com/${platformPostId}`;
  } else if (platform === 'instagram') {
    platformPostId = body.id || '';
    postUrl = `https://instagram.com/p/${platformPostId}`;
  } else if (platform === 'threads') {
    platformPostId = body.id || '';
    postUrl = `https://threads.net/t/${platformPostId}`;
  } else if (platform === 'linkedin') {
    platformPostId = body.id || (response.headers ? response.headers['x-restli-id'] : '') || '';
    postUrl = `https://www.linkedin.com/feed/update/${platformPostId}`;
  } else if (platform === 'x') {
    platformPostId = body.data?.id || body.id || '';
    const handle = (post.account_handle || 'user').replace('@', '');
    postUrl = `https://x.com/${handle}/status/${platformPostId}`;
  } else if (platform === 'youtube') {
    platformPostId = body.id || '';
    postUrl = `https://www.youtube.com/watch?v=${platformPostId}`;
  } else if (platform === 'pinterest') {
    platformPostId = body.id || '';
    postUrl = `https://www.pinterest.com/pin/${platformPostId}`;
  } else if (platform === 'tiktok') {
    platformPostId = body.data?.publish_id || body.publish_id || '';
    const handle = (post.account_handle || 'user').replace('@', '');
    postUrl = `https://www.tiktok.com/@${handle}`;
  }
} else {
  const errStr = (errorMessage + ' ' + JSON.stringify(body)).toLowerCase();
  if (statusCode === 401 || statusCode === 403 || errStr.includes('code 190') || errStr.includes('invalid token') || errStr.includes('revoked') || errStr.includes('expired')) {
    errorCode = 'AUTH_ERROR';
    if (!errorMessage) errorMessage = 'Authentication failed: OAuth token expired or unauthorized.';
  } else if (statusCode === 429 || errStr.includes('rate limit') || errStr.includes('quota')) {
    errorCode = 'RATE_LIMIT';
    if (!errorMessage) errorMessage = 'Platform API rate limit reached.';
  } else if (errStr.includes('media')) {
    errorCode = 'MEDIA_ERROR';
    if (!errorMessage) errorMessage = 'Media asset failed platform encoding/size requirements.';
  } else if (statusCode >= 500) {
    errorCode = 'PLATFORM_ERROR';
    if (!errorMessage) errorMessage = `Platform internal server error (HTTP ${statusCode}).`;
  } else {
    errorCode = 'UNKNOWN';
    if (!errorMessage) errorMessage = `HTTP ${statusCode}: ${JSON.stringify(body).substring(0, 300)}`;
  }
}

let finalStatus = 'Posted';
if (!isSuccess) {
  const isRetryable = ['RATE_LIMIT', 'PLATFORM_ERROR'].includes(errorCode) || statusCode >= 500 || statusCode === 429;
  if (isRetryable && currentAttempt < maxRetries) {
    finalStatus = 'Retrying';
  } else {
    finalStatus = 'Failed';
  }
}

const nowUtc = new Date().toISOString();

return [{
  json: {
    post_id: post.post_id,
    brand_id: post.brand_id,
    brand_name: post.brand_name,
    client_id: post.client_id,
    client_name: post.client_name,
    platform,
    account_handle: post.account_handle,
    isSuccess,
    finalStatus,
    status: finalStatus,
    attempt_count: currentAttempt,
    posted_at: isSuccess ? nowUtc : (post.posted_at || ''),
    platform_post_id: platformPostId,
    post_url: postUrl,
    error_code: isSuccess ? '' : errorCode,
    error_message: isSuccess ? '' : errorMessage.substring(0, 500),
    locked_by_execution: '',
    updated_at: nowUtc,
    http_status: statusCode,
    response_summary: isSuccess
      ? `Published on ${platform}. ID: ${platformPostId}`
      : `Error on ${platform} (${errorCode}): ${errorMessage.substring(0, 200)}`,
    timestamp_utc: nowUtc
  }
}];"""

for n in nodes:
    if n['name'] == 'Normalize Platform Response':
        n['parameters']['jsCode'] = new_normalize_code
        print('Updated Normalize Platform Response code!')

cur.execute('UPDATE workflow_entity SET nodes = ? WHERE id = ?', (json.dumps(nodes), 'Utaz0U82aZQZ7uHF'))
cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), json.dumps(conns), v_id))

cur.execute('SELECT publishedVersionId FROM workflow_published_version WHERE workflowId = ?', ('Utaz0U82aZQZ7uHF',))
pub_row = cur.fetchone()
if pub_row:
    pub_v_id = pub_row[0]
    cur.execute('UPDATE workflow_history SET nodes = ?, connections = ? WHERE versionId = ?', (json.dumps(nodes), json.dumps(conns), pub_v_id))

conn.commit()
conn.close()
print('Successfully saved Normalize Platform Response updates across database!')

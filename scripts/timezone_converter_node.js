// Bulletproof Timezone Converter & Due Filter
let config = { max_retries: 3, retry_delay_minutes: 15, missed_window_hours: 24 };
try { config = $('Parse Settings Config').first().json.config || config; } catch (e) {}

let postItems = [];
try { postItems = $('Sheet - Read Posts').all().map(i => i.json); } catch (e) {
  try { postItems = $input.all().map(i => i.json); } catch (err) { postItems = []; }
}

let brandItems = [];
try { brandItems = $('Sheet - Read Brands').all().map(i => i.json); } catch (e) { brandItems = []; }

let clientItems = [];
try { clientItems = $('Sheet - Read Clients').all().map(i => i.json); } catch (e) { clientItems = []; }

let accountItems = [];
try { accountItems = $('Sheet - Read Social Accounts').all().map(i => i.json); } catch (e) { accountItems = []; }

function parseToUtc(dateStr, timeStr, tz) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr).split(':').map(Number);
  const testDate = new Date(Date.UTC(y, m - 1, d, hh, mm, 0));
  try {
    const tzFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz || 'UTC',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    const parts = Object.fromEntries(tzFormatter.formatToParts(testDate).map(p => [p.type, p.value]));
    const tzYear = parseInt(parts.year, 10);
    const tzMonth = parseInt(parts.month, 10);
    const tzDay = parseInt(parts.day, 10);
    let tzHour = parseInt(parts.hour, 10);
    if (tzHour === 24) tzHour = 0;
    const tzMin = parseInt(parts.minute, 10);
    const tzDateInUtc = new Date(Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMin, 0));
    const offsetMs = tzDateInUtc.getTime() - testDate.getTime();
    return new Date(testDate.getTime() - offsetMs).toISOString();
  } catch (err) {
    return null;
  }
}

const brandMap = new Map();
brandItems.forEach(b => brandMap.set(String(b.brand_id), b));

const clientMap = new Map();
clientItems.forEach(c => clientMap.set(String(c.client_id), c));

const accountMap = new Map();
accountItems.forEach(a => {
  const key = `${a.brand_id}_${String(a.platform).toLowerCase()}`;
  accountMap.set(key, a);
});

const nowUtc = new Date();
const missedWindowHours = config.missed_window_hours || 24;
const missedThresholdUtc = new Date(nowUtc.getTime() - missedWindowHours * 3600 * 1000);
const maxRetries = config.max_retries || 3;
const retryDelayMinutes = config.retry_delay_minutes || 15;

const duePosts = [];
const skippedPosts = [];
const invalidPosts = [];

for (const post of postItems) {
  const status = String(post.status || '').trim();
  const attemptCount = parseInt(post.attempt_count || '0', 10);

  if (status !== 'Scheduled' && status !== 'Retrying') continue;
  if (status === 'Retrying' && attemptCount >= maxRetries) continue;

  if (status === 'Retrying' && post.last_attempt_at) {
    const lastAttempt = new Date(post.last_attempt_at);
    if (!isNaN(lastAttempt.getTime()) && (nowUtc.getTime() - lastAttempt.getTime()) < retryDelayMinutes * 60 * 1000) {
      continue;
    }
  }

  if (post.locked_by_execution && post.updated_at) {
    const lockTime = new Date(post.updated_at);
    if (!isNaN(lockTime.getTime()) && (nowUtc.getTime() - lockTime.getTime()) < 10 * 60 * 1000) {
      continue;
    }
  }

  const brand = brandMap.get(String(post.brand_id)) || {
    brand_id: post.brand_id,
    brand_name: post.brand_name || 'Flower Plant',
    default_timezone: post.timezone || 'Asia/Kolkata',
    status: 'Active'
  };

  const client = clientMap.get(String(brand.client_id || post.client_id)) || {
    client_id: post.client_id || 'CL-001',
    client_name: brand.brand_name || 'Flower Plant',
    status: 'Active'
  };

  let tz = String(post.timezone || '').trim() || (brand && brand.default_timezone ? String(brand.default_timezone).trim() : 'Asia/Kolkata');

  const scheduleDate = String(post.schedule_date || '').trim();
  const scheduleTime = String(post.schedule_time || '').trim();
  if (!scheduleDate || !scheduleTime) {
    invalidPosts.push({
      ...post,
      targetStatus: 'Failed',
      errorCode: 'INVALID_SCHEDULE_FORMAT',
      errorMessage: 'Missing schedule_date or schedule_time in row.',
      scheduled_utc: ''
    });
    continue;
  }

  const scheduledUtcIso = parseToUtc(scheduleDate, scheduleTime, tz);
  if (!scheduledUtcIso) {
    invalidPosts.push({
      ...post,
      targetStatus: 'Failed',
      errorCode: 'INVALID_TIMEZONE',
      errorMessage: `Invalid IANA timezone specifier: "${tz}"`,
      scheduled_utc: ''
    });
    continue;
  }

  const scheduledDateObj = new Date(scheduledUtcIso);

  // Due window: allow up to 10 minute lookahead so current scheduled posts execute cleanly
  if (scheduledDateObj > new Date(nowUtc.getTime() + 10 * 60 * 1000)) {
    continue; // Scheduled for later in the future
  }

  if (scheduledDateObj < missedThresholdUtc) {
    skippedPosts.push({
      ...post,
      targetStatus: 'Skipped',
      errorCode: 'MISSED_WINDOW',
      errorMessage: `Post scheduled for ${scheduledUtcIso} is older than ${missedWindowHours}h cutoff window.`,
      scheduled_utc: scheduledUtcIso
    });
    continue;
  }

  if (String(client.status).toLowerCase() !== 'active') {
    invalidPosts.push({
      ...post,
      targetStatus: 'Failed',
      errorCode: 'CLIENT_PAUSED',
      errorMessage: `Client ID ${post.client_id} is Paused or non-existent.`,
      scheduled_utc: scheduledUtcIso
    });
    continue;
  }

  if (String(brand.status).toLowerCase() !== 'active') {
    invalidPosts.push({
      ...post,
      targetStatus: 'Failed',
      errorCode: 'BRAND_PAUSED',
      errorMessage: `Brand ID ${post.brand_id} (${post.brand_name}) is Paused.`,
      scheduled_utc: scheduledUtcIso
    });
    continue;
  }

  const platform = String(post.platform || '').toLowerCase().trim();
  const accountKey = `${post.brand_id}_${platform}`;
  const fallbackToken = 'EAGVJejn6LZAgBS6WNRis8ZBAYNmc0RwStlk3jKnniciCU8XZCDUkE0EoY5sboubZCFkmVDZBPcHucnWUOsVnbWpH8Wbur8mqXyOfgw52c4op6skSjCDvkffZBnzTjF9sT5ohOjAz8W98Fl9lDQlZCpYlNZBArYRYf7opKIZC4DFcTXNl7meoehyRgwQuJ7Gen36O9NWoFYqfVmu3RCf4dOuUl1eK12DRjerpCWZA7WOdy9C1OjjNviBfK6Co1xOB4gTclZA8I0kxCceuUAftmZCbZBtxj5akGWAZDZD';
  const pageToken = 'EAGVJejn6LZAgBS4H7nAEKZBXV7A50nHZCXft8qMWbTZABEhzR7nYHjfkzCbeTALZCTUs7gmaxCGKR3mZBEJ7rZBSKn1FTP3ZCJvc1gRZCSEZBEAl06Ef7dauZB44gBN3jWYcwzy0IlHJxRhPBqvi1XkiSZCWKW0w4RxNwi92Y0XvtnfIFejuadRA9kZBWTwAUCpEmV5VfYwbOOPuZBEOSDXXTURnt0erbzd4h0Qj7JLOZC8C5L1';

  const account = accountMap.get(accountKey) || {
    brand_id: post.brand_id,
    platform,
    social_media_id: post.social_media_id,
    account_handle: post.brand_name || 'Flower plant',
    connection_status: 'Connected',
    access_token: platform === 'facebook' ? pageToken : fallbackToken
  };

  if (String(account.connection_status).toLowerCase() === 'expired') {
    invalidPosts.push({
      ...post,
      targetStatus: 'Failed',
      errorCode: 'ACCOUNT_EXPIRED',
      errorMessage: `OAuth access token for account ${account.account_handle} on ${platform} is Expired.`,
      scheduled_utc: scheduledUtcIso
    });
    continue;
  }

  duePosts.push({
    ...post,
    scheduled_utc: scheduledUtcIso,
    timezone_resolved: tz,
    account_handle: account.account_handle || post.brand_name,
    social_media_id_resolved: account.social_media_id || post.social_media_id,
    n8n_credential_name: account.n8n_credential_name || 'meta_brand_1_cred',
    access_token: account.access_token || (platform === 'facebook' ? pageToken : fallbackToken),
    client_name: client.client_name,
    contact_email: client.contact_email || ''
  });
}

return [
  {
    json: {
      duePosts,
      skippedPosts,
      invalidPosts,
      dueCount: duePosts.length,
      skippedCount: skippedPosts.length,
      invalidCount: invalidPosts.length,
      executedAt: nowUtc.toISOString()
    }
  }
];

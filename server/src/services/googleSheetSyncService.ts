import fs from 'fs';
import https from 'https';
import path from 'path';

export interface SheetPostRow {
  post_id: string;
  client_id: string;
  brand_id: string;
  brand_name: string;
  platform: string;
  social_media_id: string;
  post_title: string;
  caption: string;
  hashtags: string;
  media_type: string;
  'media_url(s)': string;
  link_url: string;
  schedule_date: string;
  schedule_time: string;
  timezone: string;
  scheduled_utc: string;
  status: string;
  attempt_count: string;
  last_attempt_at: string;
  posted_at: string;
  platform_post_id: string;
  post_url: string;
  error_code: string;
  error_message: string;
  locked_by_execution: string;
  updated_at: string;
}

export class GoogleSheetSyncService {
  private spreadsheetId = '1t4TsrPeKjI5FKM5u1oByldtfhpzDN_iRm1mD7zOr31A';

  private getAccessToken(): string | null {
    try {
      const tokenPath = path.resolve(process.cwd(), 'scripts', 'google_token.json');
      if (fs.existsSync(tokenPath)) {
        const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        return data.access_token || null;
      }
    } catch (e) {
      console.warn('Failed to read google_token.json:', e);
    }
    return null;
  }

  async fetchPosts(): Promise<SheetPostRow[]> {
    const token = this.getAccessToken();
    if (!token) return [];

    return new Promise((resolve) => {
      const options = {
        hostname: 'sheets.googleapis.com',
        path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A1:Z100`,
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            const rows: string[][] = json.values || [];
            if (rows.length < 2) return resolve([]);
            const headers = rows[0];
            const list: SheetPostRow[] = rows.slice(1).map(r => {
              const obj: any = {};
              headers.forEach((h, idx) => { obj[h] = r[idx] || ''; });
              return obj;
            });
            resolve(list);
          } catch (e) {
            resolve([]);
          }
        });
      });

      req.on('error', () => resolve([]));
      req.end();
    });
  }

  async appendPost(post: {
    title: string;
    caption: string;
    hashtags?: string[];
    scheduledAt: string;
    platform?: string;
    mediaUrl?: string;
    mediaType?: string;
  }): Promise<string | null> {
    const token = this.getAccessToken();
    if (!token) return null;

    try {
      // Determine date & time in Indian Standard Time (Asia/Kolkata)
      const dt = new Date(post.scheduledAt);
      const schedule_date = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const schedule_time = dt.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
      const newPostId = `POST-${Date.now().toString().slice(-4)}`;

      const row = [
        newPostId,                                        // post_id
        "CL-001",                                          // client_id
        "BR-001",                                          // brand_id
        "Flower Plant",                                    // brand_name
        (post.platform || "facebook").toLowerCase(),       // platform
        "1454740611044963",                                // social_media_id
        post.title,                                        // post_title
        post.caption,                                      // caption
        (post.hashtags || []).join(' '),                   // hashtags
        post.mediaType || "image",                         // media_type
        post.mediaUrl || "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80", // media_url(s)
        "",                                                // link_url
        schedule_date,                                     // schedule_date
        schedule_time,                                     // schedule_time
        "Asia/Kolkata",                                    // timezone
        dt.toISOString(),                                  // scheduled_utc
        "Scheduled",                                       // status
        "0",                                               // attempt_count
        "",                                                // last_attempt_at
        "",                                                // posted_at
        "",                                                // platform_post_id
        "",                                                // post_url
        "",                                                // error_code
        "",                                                // error_message
        "",                                                // locked_by_execution
        new Date().toISOString()                           // updated_at
      ];

      const postData = JSON.stringify({ values: [row] });

      return new Promise((resolve) => {
        const options = {
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A:Z:append?valueInputOption=USER_ENTERED`,
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData)
          }
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log(`[GoogleSheetSync] Successfully appended ${newPostId} to Google Sheet!`);
              resolve(newPostId);
            } else {
              console.warn('[GoogleSheetSync] Append error response:', body);
              resolve(null);
            }
          });
        });

        req.on('error', (err) => {
          console.error('[GoogleSheetSync] Append request error:', err);
          resolve(null);
        });

        req.write(postData);
        req.end();
      });
    } catch (e) {
      console.error('[GoogleSheetSync] Error appending to sheet:', e);
      return null;
    }
  }

  async updatePostInSheet(postIdOrTitle: string, updates: {
    title?: string;
    caption?: string;
    scheduledAt?: string;
    status?: string;
    platform?: string;
  }): Promise<boolean> {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const posts = await this.fetchPosts();
      let rowIndex = -1;
      let matchedPost: SheetPostRow | null = null;
      for (let i = 0; i < posts.length; i++) {
        if (posts[i].post_id === postIdOrTitle || posts[i].post_title === postIdOrTitle) {
          rowIndex = i + 2; // +1 0-index offset, +1 header offset
          matchedPost = posts[i];
          break;
        }
      }

      if (rowIndex === -1 || !matchedPost) {
        console.warn(`[GoogleSheetSync] Post ${postIdOrTitle} not found in sheet for update`);
        return false;
      }

      let schedule_date = matchedPost.schedule_date;
      let schedule_time = matchedPost.schedule_time;
      let scheduled_utc = matchedPost.scheduled_utc;

      if (updates.scheduledAt) {
        const dt = new Date(updates.scheduledAt);
        schedule_date = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        schedule_time = dt.toLocaleTimeString('en-GB', { timeZone: 'Asia/Kolkata', hour12: false });
        scheduled_utc = dt.toISOString();
      }

      const updatedRow = [
        matchedPost.post_id,
        matchedPost.client_id || 'CL-001',
        matchedPost.brand_id || 'BR-001',
        matchedPost.brand_name || 'Flower Plant',
        (updates.platform || matchedPost.platform || 'facebook').toLowerCase(),
        matchedPost.social_media_id || '1454740611044963',
        updates.title !== undefined ? updates.title : matchedPost.post_title,
        updates.caption !== undefined ? updates.caption : matchedPost.caption,
        matchedPost.hashtags || '',
        matchedPost.media_type || 'image',
        matchedPost['media_url(s)'] || 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&w=1200&q=80',
        matchedPost.link_url || '',
        schedule_date,
        schedule_time,
        matchedPost.timezone || 'Asia/Kolkata',
        scheduled_utc,
        updates.status || 'Scheduled', // Reset to Scheduled so scheduler picks it up
        '0',                           // Reset attempt_count
        '',                            // last_attempt_at
        '',                            // posted_at
        '',                            // platform_post_id
        '',                            // post_url
        '',                            // error_code
        '',                            // error_message
        '',                            // clear lock
        new Date().toISOString()       // updated_at
      ];

      const updateData = JSON.stringify({ values: [updatedRow] });

      return new Promise((resolve) => {
        const options = {
          hostname: 'sheets.googleapis.com',
          path: `/v4/spreadsheets/${this.spreadsheetId}/values/Posts!A${rowIndex}:Z${rowIndex}?valueInputOption=USER_ENTERED`,
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(updateData)
          }
        };

        const req = https.request(options, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              console.log(`[GoogleSheetSync] Successfully updated ${matchedPost?.post_id} at row ${rowIndex}!`);
              resolve(true);
            } else {
              console.warn('[GoogleSheetSync] Update error response:', body);
              resolve(false);
            }
          });
        });

        req.on('error', (err) => {
          console.error('[GoogleSheetSync] Update request error:', err);
          resolve(false);
        });

        req.write(updateData);
        req.end();
      });
    } catch (e) {
      console.error('[GoogleSheetSync] Error updating sheet:', e);
      return false;
    }
  }
}

export const googleSheetSyncService = new GoogleSheetSyncService();

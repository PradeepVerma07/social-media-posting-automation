import fs from 'fs';
import path from 'path';
import { logger } from '../logging/logger';

export async function getFreshGoogleAccessToken(): Promise<string | null> {
  try {
    const tokenPath = path.resolve(process.cwd(), 'scripts', 'google_token.json');
    if (!fs.existsSync(tokenPath)) return null;

    const data = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
    const now = Date.now();

    // If access_token exists and not near expiration, return it
    if (data.access_token && data.expires_at && data.expires_at > now + 60000) {
      return data.access_token;
    }

    // Refresh token via Google OAuth2
    if (data.refresh_token && data.clientId && data.clientSecret) {
      try {
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: data.clientId,
            client_secret: data.clientSecret,
            refresh_token: data.refresh_token,
          }),
        });
        const refreshed = (await res.json()) as any;
        if (refreshed.access_token) {
          data.access_token = refreshed.access_token;
          data.expires_at = now + (refreshed.expires_in || 3600) * 1000;
          fs.writeFileSync(tokenPath, JSON.stringify(data, null, 2));
          logger.info('Successfully refreshed Google OAuth token');
          return refreshed.access_token;
        }
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Google OAuth token refresh request failed');
      }
    }

    return data.access_token || null;
  } catch (e: any) {
    logger.warn({ err: e.message }, 'Failed reading Google token');
    return null;
  }
}

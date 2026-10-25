import https from 'https';
import { logger } from '../logging/logger';

export type AlertSeverity = 'High' | 'Medium' | 'Low';

class AlertService {
  private dedupeMap: Map<string, number> = new Map();
  private readonly DEDUPE_TTL_MS = 15 * 60 * 1000; // 15 minutes

  async notify(key: string, severity: AlertSeverity, title: string, details: Record<string, any> = {}) {
    const now = Date.now();
    const lastAlert = this.dedupeMap.get(key);
    if (lastAlert && now - lastAlert < this.DEDUPE_TTL_MS) {
      // Suppress duplicate alert within 15 minutes
      return;
    }
    this.dedupeMap.set(key, now);

    logger.error({ alertKey: key, severity, title, details }, `[ALERT - ${severity}] ${title}`);

    // If Slack webhook is configured, dispatch notification
    const slackUrl = process.env.ALERT_SLACK_WEBHOOK_URL;
    if (slackUrl && slackUrl.startsWith('https://hooks.slack.com')) {
      try {
        const payload = JSON.stringify({
          text: `🚨 *[CI360 Alert - ${severity}]* ${title}\n\`\`\`${JSON.stringify(details, null, 2)}\`\`\``,
        });

        const urlObj = new URL(slackUrl);
        const req = https.request({
          hostname: urlObj.hostname,
          path: urlObj.pathname,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        });
        req.on('error', err => logger.warn({ err }, 'Failed sending Slack alert'));
        req.write(payload);
        req.end();
      } catch (err) {
        logger.warn({ err }, 'Error building Slack alert payload');
      }
    }
  }
}

export const alertService = new AlertService();

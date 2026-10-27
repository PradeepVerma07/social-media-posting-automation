import { db } from '../../db/sqlite';
import { logger } from '../../logging/logger';

export interface CommentAnalysisItem {
  id: string;
  brandId: string;
  postId?: string;
  platform: string;
  commenterHandle: string;
  commentText: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  category: 'purchase_intent' | 'price_inquiry' | 'dm_request' | 'question' | 'support_request' | 'praise' | 'complaint';
  leadIntentScore: number; // 0-100
  isLead: boolean;
  status: 'new' | 'contacted' | 'dismissed';
  detectedAt: string;
}

export class CommentIntelligenceService {
  /**
   * Classify a raw comment and detect purchase intent
   */
  analyzeComment(brandId: string, platform: string, commenterHandle: string, text: string, postId?: string): CommentAnalysisItem {
    const lower = text.toLowerCase();
    let sentiment: 'positive' | 'neutral' | 'negative' = 'neutral';
    let category: CommentAnalysisItem['category'] = 'question';
    let intentScore = 20;
    let isLead = false;

    // Detect high-intent lead triggers
    const priceTriggers = /(how much|price|cost|quote|pricing|rate card|discount|commercial offer)/i;
    const purchaseTriggers = /(where can i buy|order|purchase|book a demo|procure|install for our fleet|need this)/i;
    const dmTriggers = /(please dm|send details|contact me|reach out|email me|share brochure)/i;
    const complaintTriggers = /(not working|failed|broken|bad service|worst|slow|poor)/i;
    const praiseTriggers = /(amazing|love this|great job|brilliant|exceptional|kudos|superb|helpful)/i;

    if (purchaseTriggers.test(lower)) {
      sentiment = 'positive';
      category = 'purchase_intent';
      intentScore = 95;
      isLead = true;
    } else if (priceTriggers.test(lower)) {
      sentiment = 'positive';
      category = 'price_inquiry';
      intentScore = 90;
      isLead = true;
    } else if (dmTriggers.test(lower)) {
      sentiment = 'positive';
      category = 'dm_request';
      intentScore = 88;
      isLead = true;
    } else if (complaintTriggers.test(lower)) {
      sentiment = 'negative';
      category = 'complaint';
      intentScore = 15;
    } else if (praiseTriggers.test(lower)) {
      sentiment = 'positive';
      category = 'praise';
      intentScore = 30;
    }

    const item: CommentAnalysisItem = {
      id: 'LEAD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
      brandId,
      postId: postId || 'POST-001',
      platform,
      commenterHandle,
      commentText: text,
      sentiment,
      category,
      leadIntentScore: intentScore,
      isLead,
      status: 'new',
      detectedAt: new Date().toISOString(),
    };

    if (isLead) {
      try {
        (db.prepare(`
          INSERT INTO detected_leads (
            id, brand_id, post_id, platform, commenter_handle, comment_text,
            lead_intent_score, intent_category, status, detected_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'new', ?)
        `) as any).run(
          item.id,
          brandId,
          item.postId || null,
          platform,
          commenterHandle,
          text,
          intentScore,
          category,
          item.detectedAt
        );
      } catch (err: any) {
        logger.warn('[CommentIntelligenceService] Failed to save detected lead:', err.message);
      }
    }

    return item;
  }

  /**
   * Get all detected leads for a brand
   */
  getDetectedLeads(brandId: string): CommentAnalysisItem[] {
    const rows = db.prepare(`
      SELECT * FROM detected_leads WHERE brand_id = ? ORDER BY detected_at DESC LIMIT 50
    `).all(brandId) as any[];

    return rows.map((r) => ({
      id: r.id,
      brandId: r.brand_id,
      postId: r.post_id,
      platform: r.platform,
      commenterHandle: r.commenter_handle || '@unknown',
      commentText: r.comment_text,
      sentiment: 'positive',
      category: r.intent_category,
      leadIntentScore: r.lead_intent_score,
      isLead: true,
      status: r.status,
      detectedAt: r.detected_at,
    }));
  }

  /**
   * Update lead disposition status
   */
  updateLeadStatus(leadId: string, status: 'new' | 'contacted' | 'dismissed'): boolean {
    const res = db.prepare(`
      UPDATE detected_leads SET status = ? WHERE id = ?
    `).run(status, leadId);
    return res.changes > 0;
  }
}

export const commentIntelligenceService = new CommentIntelligenceService();

import { db } from '../../db/sqlite';
import { logger } from '../../logging/logger';

export interface BrandBrainProfile {
  id: string;
  organizationId: string;
  brandId: string;
  brandName: string;
  industry: string;
  subIndustry: string;
  primaryMarket: string;
  targetAudience: string;
  brandVoice: string;
  brandPersonality: string;
  preferredWords: string[];
  forbiddenWords: string[];
  approvedCtas: string[];
  brandColors: string[];
  fonts: string[];
  visualStyle: string;
  competitors: string[];
  businessObjectives: string;
  primaryProducts: string[];
  services: string[];
  website: string;
  instagramHandle: string;
  facebookPage: string;
  linkedinPage: string;
  youtubeChannel: string;
  contentPillars: string[];
  regulatoryConstraints: string[];
  defaultLanguage: string;
  secondaryLanguages: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandLearnedPreference {
  id: string;
  brandId: string;
  category: 'tone' | 'hook' | 'cta' | 'hashtags' | 'vocabulary' | 'visual';
  keyName: string;
  learnedValue: string;
  confidence: number;
  sourceSampleCount: number;
  lastInferredAt: string;
  isReviewedByAdmin: boolean;
  adminOverrideValue?: string;
}

export class BrandBrainService {
  /**
   * Get complete Brand Brain by brandId
   */
  async getBrandBrain(brandId: string): Promise<BrandBrainProfile | null> {
    const row = db.prepare(`
      SELECT * FROM brand_intelligence_profiles WHERE brand_id = ?
    `).get(brandId) as any;

    if (!row) {
      // Fallback to first available profile
      const first = db.prepare('SELECT * FROM brand_intelligence_profiles LIMIT 1').get() as any;
      if (!first) return null;
      return this.formatProfileRow(first);
    }

    return this.formatProfileRow(row);
  }

  /**
   * List all registered Brand Brain profiles
   */
  async listAllBrandBrains(): Promise<BrandBrainProfile[]> {
    const rows = db.prepare(`
      SELECT * FROM brand_intelligence_profiles ORDER BY brand_name ASC
    `).all() as any[];

    return rows.map((r) => this.formatProfileRow(r));
  }

  /**
   * Update or create a Brand Brain profile
   */
  async saveBrandBrain(profile: Partial<BrandBrainProfile> & { brandId: string }): Promise<BrandBrainProfile> {
    const now = new Date().toISOString();
    const existing = await this.getBrandBrain(profile.brandId);
    const id = existing?.id || 'BIP-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    db.prepare(`
      INSERT INTO brand_intelligence_profiles (
        id, organization_id, brand_id, brand_name, industry, sub_industry,
        primary_market, target_audience, brand_voice, brand_personality,
        preferred_words_json, forbidden_words_json, approved_ctas_json,
        brand_colors_json, fonts_json, visual_style, competitors_json,
        business_objectives, primary_products_json, services_json, website,
        instagram_handle, facebook_page, linkedin_page, youtube_channel,
        content_pillars_json, regulatory_constraints_json, default_language,
        secondary_languages_json, created_at, updated_at
      ) VALUES (
        ?, 'ORG-001', ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'en',
        ?, ?, ?
      )
      ON CONFLICT(brand_id) DO UPDATE SET
        brand_name = excluded.brand_name,
        industry = excluded.industry,
        sub_industry = excluded.sub_industry,
        primary_market = excluded.primary_market,
        target_audience = excluded.target_audience,
        brand_voice = excluded.brand_voice,
        brand_personality = excluded.brand_personality,
        preferred_words_json = excluded.preferred_words_json,
        forbidden_words_json = excluded.forbidden_words_json,
        approved_ctas_json = excluded.approved_ctas_json,
        brand_colors_json = excluded.brand_colors_json,
        visual_style = excluded.visual_style,
        competitors_json = excluded.competitors_json,
        business_objectives = excluded.business_objectives,
        website = excluded.website,
        content_pillars_json = excluded.content_pillars_json,
        regulatory_constraints_json = excluded.regulatory_constraints_json,
        updated_at = excluded.updated_at
    `).run(
      id,
      profile.brandId,
      profile.brandName || 'Untitled Brand',
      profile.industry || 'General',
      profile.subIndustry || '',
      profile.primaryMarket || 'Global',
      profile.targetAudience || '',
      profile.brandVoice || 'Professional',
      profile.brandPersonality || 'Innovative',
      JSON.stringify(profile.preferredWords || []),
      JSON.stringify(profile.forbiddenWords || []),
      JSON.stringify(profile.approvedCtas || []),
      JSON.stringify(profile.brandColors || ['#1336E8']),
      JSON.stringify(profile.fonts || ['Inter']),
      profile.visualStyle || 'Clean modern',
      JSON.stringify(profile.competitors || []),
      profile.businessObjectives || '',
      JSON.stringify(profile.primaryProducts || []),
      JSON.stringify(profile.services || []),
      profile.website || '',
      profile.instagramHandle || '',
      profile.facebookPage || '',
      profile.linkedinPage || '',
      profile.youtubeChannel || '',
      JSON.stringify(profile.contentPillars || []),
      JSON.stringify(profile.regulatoryConstraints || []),
      JSON.stringify(profile.secondaryLanguages || ['es']),
      now,
      now
    );

    const updated = await this.getBrandBrain(profile.brandId);
    return updated!;
  }

  /**
   * Get Brand Learned Preferences (Machine Learning from user edits / rejections)
   */
  async getLearnedPreferences(brandId: string): Promise<BrandLearnedPreference[]> {
    const rows = db.prepare(`
      SELECT * FROM brand_learned_preferences WHERE brand_id = ? ORDER BY confidence DESC
    `).all(brandId) as any[];

    return rows.map((r) => ({
      id: r.id,
      brandId: r.brand_id,
      category: r.category,
      keyName: r.key_name,
      learnedValue: r.learned_value,
      confidence: r.confidence,
      sourceSampleCount: r.source_sample_count,
      lastInferredAt: r.last_inferred_at,
      isReviewedByAdmin: Boolean(r.is_reviewed_by_admin),
      adminOverrideValue: r.admin_override_value,
    }));
  }

  /**
   * Record a user action (accept, edit, reject) into recommendation memory
   */
  async recordUserAction(action: {
    recommendationId: string;
    brandId: string;
    postId?: string;
    actionType: 'accepted' | 'rejected' | 'edited' | 'undo' | 'regenerate';
    userId?: string;
    userComment?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const actionId = 'ACT-' + Math.random().toString(36).substring(2, 9).toUpperCase();

    try {
      db.prepare(`
        INSERT INTO recommendation_actions (
          id, recommendation_id, brand_id, post_id, action_type, user_id, user_comment, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        actionId,
        action.recommendationId,
        action.brandId,
        action.postId || 'POST-001',
        action.actionType,
        action.userId || 'USER-001',
        action.userComment || '',
        now
      );

      // Trigger automatic brand learning feedback
      await this.triggerLearningPass(action.brandId);
    } catch (err: any) {
      logger.warn('[BrandBrainService] Failed to record user action:', err.message);
    }
  }

  /**
   * Automatic Brand Learning Engine
   * Analyzes accepted vs rejected suggestions and updates brand_learned_preferences
   */
  private async triggerLearningPass(brandId: string): Promise<void> {
    const actions = db.prepare(`
      SELECT action_type, count(*) as count 
      FROM recommendation_actions 
      WHERE brand_id = ? 
      GROUP BY action_type
    `).all(brandId) as any[];

    const accepted = actions.find((a) => a.action_type === 'accepted')?.count || 0;
    const rejected = actions.find((a) => a.action_type === 'rejected')?.count || 0;
    const edited = actions.find((a) => a.action_type === 'edited')?.count || 0;

    const now = new Date().toISOString();

    // If user frequently accepts or edits, adjust learned preference confidence
    if (accepted + edited > 5) {
      const conf = Math.min(0.98, Number((0.75 + (accepted / (accepted + rejected + edited)) * 0.2).toFixed(2)));
      try {
        db.prepare(`
          UPDATE brand_learned_preferences 
          SET confidence = ?, source_sample_count = source_sample_count + 1, last_inferred_at = ?
          WHERE brand_id = ?
        `).run(conf, now, brandId);
      } catch {}
    }
  }

  private formatProfileRow(r: any): BrandBrainProfile {
    return {
      id: r.id,
      organizationId: r.organization_id,
      brandId: r.brand_id,
      brandName: r.brand_name,
      industry: r.industry,
      subIndustry: r.sub_industry || '',
      primaryMarket: r.primary_market || 'Global',
      targetAudience: r.target_audience || '',
      brandVoice: r.brand_voice || 'Professional',
      brandPersonality: r.brand_personality || 'Innovative',
      preferredWords: JSON.parse(r.preferred_words_json || '[]'),
      forbiddenWords: JSON.parse(r.forbidden_words_json || '[]'),
      approvedCtas: JSON.parse(r.approved_ctas_json || '[]'),
      brandColors: JSON.parse(r.brand_colors_json || '[]'),
      fonts: JSON.parse(r.fonts_json || '[]'),
      visualStyle: r.visual_style || 'Modern',
      competitors: JSON.parse(r.competitors_json || '[]'),
      businessObjectives: r.business_objectives || '',
      primaryProducts: JSON.parse(r.primary_products_json || '[]'),
      services: JSON.parse(r.services_json || '[]'),
      website: r.website || '',
      instagramHandle: r.instagram_handle || '',
      facebookPage: r.facebook_page || '',
      linkedinPage: r.linkedin_page || '',
      youtubeChannel: r.youtube_channel || '',
      contentPillars: JSON.parse(r.content_pillars_json || '[]'),
      regulatoryConstraints: JSON.parse(r.regulatory_constraints_json || '[]'),
      defaultLanguage: r.default_language || 'en',
      secondaryLanguages: JSON.parse(r.secondary_languages_json || '[]'),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
  }
}

export const brandBrainService = new BrandBrainService();

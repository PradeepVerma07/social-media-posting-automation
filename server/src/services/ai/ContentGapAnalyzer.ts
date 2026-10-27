import { db } from '../../db/sqlite';
import { logger } from '../../logging/logger';

export interface NextBestTopic {
  id: string;
  topicName: string;
  relevanceScore: number; // 0-100
  historicalPerformance: number; // multiplier, e.g. 3.2x
  brandAlignment: number; // 0-100
  audienceInterest: number; // 0-100
  competitionLevel: 'Low' | 'Medium' | 'High';
  recommendedFormat: string;
  status: 'opportunity' | 'overused' | 'missing' | 'low_value';
  rationale: string;
}

export interface HashtagOptimizationResult {
  classified: Array<{
    tag: string;
    category: 'Brand' | 'Industry' | 'Niche' | 'Discovery' | 'Campaign' | 'Trending';
    action: 'KEEP' | 'REMOVE' | 'REPLACE' | 'ADD';
    suggestedReplacement?: string;
    reason: string;
  }>;
  recommendedTags: string[];
  finalSuggestedTagString: string;
}

export class ContentGapAnalyzer {
  /**
   * Get Next Best Topics and Content Gaps for a brand
   */
  async getTopicsAndGaps(brandId: string): Promise<{
    opportunityTopics: NextBestTopic[];
    overusedTopics: NextBestTopic[];
    missingTopics: NextBestTopic[];
    contentOpportunityMatrix: Record<string, any>;
  }> {
    const rows = db.prepare(`
      SELECT * FROM content_topics WHERE brand_id = ?
    `).all(brandId) as any[];

    if (rows.length === 0) {
      // Default fallback topics based on brand
      const isSatcom = brandId === 'BR-002';
      return {
        opportunityTopics: [
          {
            id: 'TOP-1',
            topicName: isSatcom ? 'LEO vs GEO Satellite Latency Breakdown' : 'Seasonal Soil Moisture Hacks',
            relevanceScore: 95,
            historicalPerformance: 3.4,
            brandAlignment: 96,
            audienceInterest: 92,
            competitionLevel: 'Medium',
            recommendedFormat: 'Infographic Carousel',
            status: 'opportunity',
            rationale: 'High audience search velocity with minimal direct competitor coverage.',
          },
          {
            id: 'TOP-2',
            topicName: isSatcom ? 'Vessel CyberShield IMO 2026 Audit Guide' : 'Root Aeration & Yellow Leaf Diagnostics',
            relevanceScore: 92,
            historicalPerformance: 4.1,
            brandAlignment: 98,
            audienceInterest: 94,
            competitionLevel: 'Low',
            recommendedFormat: 'Carousel & Whitepaper Slide',
            status: 'opportunity',
            rationale: 'Impending regulatory compliance drives massive organic executive bookmarking.',
          },
        ],
        overusedTopics: [
          {
            id: 'TOP-3',
            topicName: isSatcom ? 'Generic Antenna Specs' : 'Basic "Happy Weekend" Photo',
            relevanceScore: 50,
            historicalPerformance: 1.1,
            brandAlignment: 70,
            audienceInterest: 45,
            competitionLevel: 'High',
            recommendedFormat: 'Static Image',
            status: 'overused',
            rationale: 'Lacks actionable technical insight; viewer fatigue detected.',
          },
        ],
        missingTopics: [
          {
            id: 'TOP-4',
            topicName: isSatcom ? 'Offshore Crew Mental Welfare & High-Speed Bandwidth' : 'Winter Plant Acclimatization Checklist',
            relevanceScore: 89,
            historicalPerformance: 3.2,
            brandAlignment: 91,
            audienceInterest: 90,
            competitionLevel: 'Low',
            recommendedFormat: 'Story Video & Carousel',
            status: 'missing',
            rationale: 'Major industry pain-point frequently asked in customer consultations but absent on feed.',
          },
        ],
        contentOpportunityMatrix: {
          competitorHighShareTopics: isSatcom ? ['Satellite Connectivity', 'Hardware Upgrades'] : ['Plant Photos', 'Sales'],
          unexploitedNiches: isSatcom ? ['GNSS Anti-Spoofing', 'Crew Welfare Telemetry'] : ['Botanical Bio-Chemistry', 'Micro-climate Control'],
          strategicRecommendation: isSatcom
            ? 'Publish 2 technical explainer carousels per week targeting Chief Technical Superintendents.'
            : 'Focus on 3-part diagnostic reels solving specific foliage distress symptoms.',
        },
      };
    }

    const topics: NextBestTopic[] = rows.map((r) => ({
      id: r.id,
      topicName: r.topic_name,
      relevanceScore: r.relevance_score,
      historicalPerformance: r.historical_performance,
      brandAlignment: r.brand_alignment,
      audienceInterest: r.audience_interest,
      competitionLevel: r.competition_level,
      recommendedFormat: r.recommended_format,
      status: r.status,
      rationale: r.status === 'opportunity' ? 'High audience interest with low competition' : 'Topic fatigue detected',
    }));

    return {
      opportunityTopics: topics.filter((t) => t.status === 'opportunity'),
      overusedTopics: topics.filter((t) => t.status === 'overused'),
      missingTopics: topics.filter((t) => t.status === 'missing'),
      contentOpportunityMatrix: {
        competitorHighShareTopics: ['Market Trends', 'Generic Updates'],
        unexploitedNiches: ['Deep Tech Practical Demos', 'Regulatory Guides'],
        strategicRecommendation: 'Capitalize on high-relevance opportunity topics to maximize algorithmic reach.',
      },
    };
  }

  /**
   * Hashtag & Keyword Intelligence
   * Classify into Brand, Industry, Niche, Discovery, Campaign, Location
   */
  optimizeHashtags(rawHashtags: string, brandId: string): HashtagOptimizationResult {
    const isSatcom = brandId === 'BR-002';
    const tags = (rawHashtags || '')
      .split(/\s+/)
      .map((t) => (t.startsWith('#') ? t : '#' + t))
      .filter((t) => t.length > 1);

    const classified: HashtagOptimizationResult['classified'] = [];

    // Evaluate existing tags
    for (const tag of tags) {
      const lower = tag.toLowerCase();
      if (lower === '#business' || lower === '#tech' || lower === '#success') {
        classified.push({
          tag,
          category: 'Discovery',
          action: 'REMOVE',
          reason: 'Over-saturated general hashtag (>100M posts) with near-zero targeted visibility.',
        });
      } else if (lower.includes('station') || lower.includes('flower') || lower.includes('satcom')) {
        classified.push({
          tag,
          category: 'Brand',
          action: 'KEEP',
          reason: 'Official brand identifier tag for internal indexing and brand community search.',
        });
      } else if (lower === '#maritime' || lower === '#plants') {
        classified.push({
          tag,
          category: 'Industry',
          action: 'REPLACE',
          suggestedReplacement: isSatcom ? '#MaritimeConnectivity' : '#UrbanBotanicalLiving',
          reason: 'Broad industry tag. Replacing with niche qualifier provides superior algorithm topical ranking.',
        });
      } else {
        classified.push({
          tag,
          category: 'Niche',
          action: 'KEEP',
          reason: 'Relevant topical clustering tag matching content pillar.',
        });
      }
    }

    // Add recommended niche tags if missing
    const recommended = isSatcom
      ? ['#MultiOrbitVSAT', '#VesselCyberShield', '#MaritimeIT', '#FleetOperations']
      : ['#MonsteraCare', '#IndoorPlantDoctor', '#BotanicalLiving', '#PlantCareTips'];

    for (const rec of recommended) {
      if (!tags.some((t) => t.toLowerCase() === rec.toLowerCase())) {
        classified.push({
          tag: rec,
          category: 'Niche',
          action: 'ADD',
          reason: 'High organic engagement index within target decision-maker audience.',
        });
      }
    }

    const finalTags = classified
      .filter((c) => c.action === 'KEEP' || c.action === 'ADD' || c.action === 'REPLACE')
      .map((c) => (c.action === 'REPLACE' && c.suggestedReplacement ? c.suggestedReplacement : c.tag));

    return {
      classified,
      recommendedTags: recommended,
      finalSuggestedTagString: Array.from(new Set(finalTags)).join(' '),
    };
  }
}

export const contentGapAnalyzer = new ContentGapAnalyzer();

/**
 * Unified AI Provider Abstraction & Gateway
 * Decouples CI360 from vendor lock-in (supports Gemini, Claude, OpenAI, and internal models)
 */

export interface TextAnalysisRequest {
  prompt: string;
  systemInstruction?: string;
  schema?: Record<string, any>;
  promptVersion?: string;
  brandId?: string;
  temperature?: number;
}

export interface TextAnalysisResponse<T = any> {
  data: T;
  rawText: string;
  provider: string;
  model: string;
  promptVersion: string;
  tokensUsed: {
    input: number;
    output: number;
  };
  latencyMs: number;
  estimatedCostUsd: number;
}

export interface CopyRewriteRequest {
  baseCaption: string;
  platform: string;
  mode: string;
  brandVoice?: string;
  targetAudience?: string;
  approvedCtas?: string[];
  forbiddenWords?: string[];
  preferredWords?: string[];
}

export interface CopyRewriteVariant {
  style: string;
  caption: string;
  hook: string;
  cta: string;
  hashtags: string[];
  keywords: string[];
  reasoningSummary: string;
  brandAlignment: number; // 0-100
  platformFit: number; // 0-100
}

export interface ImageAnalysisRequest {
  imageUrl: string;
  platform?: string;
  brandColors?: string[];
}

export interface ImageAnalysisResult {
  visualScore: number; // 0-100
  resolutionEstimate: string;
  aspectRatio: string;
  contrastRating: string;
  safeAreaCompliance: boolean;
  logoPlacementDetected: boolean;
  productProminencePercentage: number;
  issues: string[];
  recommendedChanges: string[];
}

export interface ImageTransformRequest {
  imageUrl: string;
  transformType: 'reframe_9_16' | 'studio_light' | 'badge_overlay' | 'background_replace' | 'ab_variant';
  prompt?: string;
  aspectRatio?: string;
  brandColors?: string[];
}

export interface ImageTransformResult {
  variantId: string;
  transformedUrl: string;
  aspectRatio: string;
  styleApplied: string;
  confidenceScore: number;
  tagsAdded: string[];
}

export interface AIProvider {
  name: string;
  defaultModel: string;

  analyzeText<T = any>(req: TextAnalysisRequest): Promise<TextAnalysisResponse<T>>;
  rewriteCopy(req: CopyRewriteRequest): Promise<CopyRewriteVariant[]>;
  analyzeImage(req: ImageAnalysisRequest): Promise<ImageAnalysisResult>;
  transformImage(req: ImageTransformRequest): Promise<ImageTransformResult>;
}

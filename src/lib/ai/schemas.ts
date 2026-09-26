import { z } from 'zod';

export const GarmentCategorySchema = z.enum([
  'formal_shirt',
  'tshirt',
  'formal_pants',
  'joggers',
  'white_sneakers',
]);

export const GarmentAIAnalysisSchema = z.object({
  category: GarmentCategorySchema,
  dominant_colors: z.array(z.string()),
  secondary_colors: z.array(z.string()),
  color_temperature: z.enum(['warm', 'cool', 'neutral', 'mixed', 'unclear']).optional(),
  pattern: z.string(),
  pattern_scale: z.enum(['none', 'micro', 'small', 'medium', 'large', 'unclear']).optional(),
  texture: z.enum(['smooth', 'fine_texture', 'textured', 'heavy_texture', 'unclear']).optional(),
  silhouette: z.enum(['structured', 'tailored', 'straight', 'tapered', 'relaxed', 'oversized', 'unclear']).optional(),
  style: z.string(),
  fit: z.string(),
  sleeve: z.string().optional(),
  office_suitability: z.number().min(0).max(1),
  formal_meeting_suitability: z.number().min(0).max(1).optional(),
  climate_practicality: z.number().min(0).max(1).optional(),
  rotation_versatility: z.number().min(0).max(1).optional(),
  condition: z.enum(['pristine', 'good', 'wrinkled', 'stained_or_damaged', 'worn', 'unclear']).optional(),
  visual_summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export const OutfitRankingItemSchema = z.object({
  candidateId: z.string(),
  score: z.number().min(0).max(1).optional(),
  visualScore: z.number().min(0).max(1).optional(),
  officeAppropriateness: z.number().min(0).max(1).optional(),
  presentationAppeal: z.number().min(0).max(1).optional(),
  colorHarmony: z.number().min(0).max(1).optional(),
  texturePatternHarmony: z.number().min(0).max(1).optional(),
  proportionSilhouette: z.number().min(0).max(1).optional(),
  formalityMatch: z.number().min(0).max(1).optional(),
  climatePracticality: z.number().min(0).max(1).optional(),
  rotationFreshness: z.number().min(0).max(1).optional(),
  blocked: z.boolean().optional(),
  recommendationStatus: z.enum(['recommended', 'acceptable', 'reject']).optional(),
  rationale: z.string().optional(),
  howToWear: z.array(z.string()).optional(),
  issues: z.array(z.string()).optional(),
});

export const OutfitRankingResponseSchema = z.object({
  rankings: z.array(OutfitRankingItemSchema),
  topRationale: z.string().optional(),
  topHowToWear: z.array(z.string()).optional(),
  modelUsed: z.string().optional(),
});

export type GarmentAIAnalysisInput = z.infer<typeof GarmentAIAnalysisSchema>;
export type OutfitRankingResponseInput = z.infer<typeof OutfitRankingResponseSchema>;

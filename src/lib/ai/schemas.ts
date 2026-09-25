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
  pattern: z.string(),
  style: z.string(),
  fit: z.string(),
  sleeve: z.string().optional(),
  office_suitability: z.number().min(0).max(1),
  visual_summary: z.string(),
  confidence: z.number().min(0).max(1),
});

export const OutfitRankingItemSchema = z.object({
  candidateId: z.string(),
  visualScore: z.number().min(0).max(1),
  officeAppropriateness: z.number().min(0).max(1),
  colorHarmony: z.number().min(0).max(1),
  rationale: z.string(),
});

export const OutfitRankingResponseSchema = z.object({
  rankings: z.array(OutfitRankingItemSchema),
  topRationale: z.string(),
  modelUsed: z.string().optional(),
});

export type GarmentAIAnalysisInput = z.infer<typeof GarmentAIAnalysisSchema>;
export type OutfitRankingResponseInput = z.infer<typeof OutfitRankingResponseSchema>;

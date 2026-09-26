export type GarmentCategory = 'formal_shirt' | 'tshirt' | 'formal_pants' | 'joggers' | 'white_sneakers';

export interface GarmentAIAnalysis {
  category: GarmentCategory;
  dominant_colors: string[];
  secondary_colors: string[];
  color_temperature?: 'warm' | 'cool' | 'neutral' | 'mixed' | 'unclear';
  pattern: string;
  pattern_scale?: 'none' | 'micro' | 'small' | 'medium' | 'large' | 'unclear';
  texture?: 'smooth' | 'fine_texture' | 'textured' | 'heavy_texture' | 'unclear';
  silhouette?: 'structured' | 'tailored' | 'straight' | 'tapered' | 'relaxed' | 'oversized' | 'unclear';
  style: string;
  fit: string;
  sleeve?: string;
  office_suitability: number; // 0.0 - 1.0
  formal_meeting_suitability?: number;
  climate_practicality?: number;
  rotation_versatility?: number;
  condition?: 'pristine' | 'good' | 'wrinkled' | 'stained_or_damaged' | 'worn' | 'unclear';
  visual_summary: string;
  confidence: number;
}

export interface ClothingItem {
  id: string;
  user_id?: string;
  category: GarmentCategory;
  name: string;
  image_url: string;
  active: boolean;
  ai_analysis: GarmentAIAnalysis;
  analysis_model?: string;
  created_at: string;
  updated_at: string;
  last_worn_at?: string | null;
  wear_count?: number;
}

export interface Outfit {
  id: string;
  user_id?: string;
  shirt_id: string;
  bottom_id: string;
  footwear_id: string;
  meeting_status: 'yes' | 'no';
  meeting_type?: 'formal' | 'regular';
  status: 'recommendation' | 'confirmed' | 'rejected';
  worn_on?: string | null;
  source: 'ai_recommendation' | 'manual';
  ai_score?: number;
  ai_reason?: string;
  created_at: string;
}

export interface OutfitFeedback {
  id: string;
  user_id?: string;
  outfit_id?: string;
  shirt_id: string;
  bottom_id: string;
  footwear_id: string;
  feedback_type: 'dont_suggest' | 'liked';
  reason?: string;
  created_at: string;
}

export interface OfficeDay {
  id: string;
  user_id?: string;
  date: string; // YYYY-MM-DD
  is_office_day: boolean;
  meeting_status: 'yes' | 'no';
  meeting_type?: 'formal' | 'regular';
  selected_outfit_id?: string | null;
  confirmed_outfit_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecommendationCandidate {
  id: string;
  shirt: ClothingItem;
  bottom: ClothingItem;
  footwear: ClothingItem;
  deterministicScore: number;
  recencyPenalty: number;
  meetingSuitabilityScore: number;
  isBlocked: boolean;
  aiScore?: number;
  aiReason?: string;
  presentationAppeal?: number;
  rotationFreshness?: number;
  howToWear?: string[];
  issues?: string[];
  finalScore?: number;
}

export interface RecommendationResponse {
  outfit: RecommendationCandidate;
  alternatives: RecommendationCandidate[];
  rationale: string;
  topHowToWear?: string[];
  meta: {
    modelUsed: string;
    totalCandidatesEvaluated: number;
    provider: string;
  };
}

export interface WardrobeStats {
  totalItems: number;
  shirtsCount: number;
  bottomsCount: number;
  footwearCount: number;
  officeDaysLogged: number;
  blockedCombinationsCount: number;
}

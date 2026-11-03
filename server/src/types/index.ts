export type GarmentCategory = 'top' | 'bottom' | 'shoes';

export interface ClothingItem {
  id: string;
  user_id: string;
  name: string;
  category: GarmentCategory | string;
  garment_type: string;
  color?: string | null;
  pattern?: string | null;
  weave_knit?: string | null;
  style?: string | null;
  warmth?: string | null;
  climate_suitability?: Record<string, unknown>;
  office_suitability?: number | null;
  formal_meeting_suitability?: number | null;
  climate_practicality?: number | null;
  rotation_versatility?: number | null;
  confidence?: number | null;
  pairing_rules?: Record<string, unknown>;
  user_overrides?: Record<string, unknown>;
  image_path: string;
  image_url?: string | null;
  analysis_model?: string | null;
  analysis_version?: string | null;
  raw_analysis?: Record<string, unknown>;
  is_damaged?: boolean;
  active?: boolean;
  wear_count?: number;
  last_worn_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Outfit {
  id: string;
  user_id: string;
  shirt_id: string;
  bottom_id: string;
  footwear_id: string;
  status: string;
  source: string;
  ai_score?: number | null;
  ai_reason?: string | null;
  ai_tips?: unknown[];
  worn_on?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface GarmentAnalysisDraft {
  name: string;
  category: 'top' | 'bottom' | 'shoes';
  garment_type: string;
  color: string;
  pattern: string;
  style: string;
  office_suitability: number;
  formal_meeting_suitability: number;
  confidence: number;
  image_path: string;
  image_url: string;
  raw_analysis: Record<string, unknown>;
}

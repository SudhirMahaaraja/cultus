export type GarmentCategory = 'top' | 'bottom' | 'shoes';

export interface ClothingItem {
  id: string;
  name: string;
  category: GarmentCategory;
  garment_type: string;
  color?: string | null;
  pattern?: string | null;
  weave_knit?: string | null;
  style?: string | null;
  warmth?: string | null;
  office_suitability?: number | null;
  formal_meeting_suitability?: number | null;
  image_url: string;
  image_back_url?: string | null;
  active: boolean;
  wear_count: number;
  created_at?: string;
}

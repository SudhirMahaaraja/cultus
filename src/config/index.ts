// Application Configuration & Constants
// Aligned with Cultus Modern Sartorial Vision

export const TABLES = {
  CLOTHING_ITEMS: 'clothing_items',
  OUTFITS: 'outfits',
  OFFICE_DAYS: 'office_days',
  OUTFIT_FEEDBACK: 'outfit_feedback',
} as const;

export const STORAGE = {
  BUCKET: 'garment-images',
} as const;

export const CATEGORIES = ['top', 'bottom', 'shoes'] as const;
export type Category = (typeof CATEGORIES)[number];

export const GARMENT_TYPES = [
  'shirt',
  'tshirt',
  'polo',
  'pants',
  'joggers',
  'shorts',
  'sneaker',
  'derby',
  'oxford',
  'loafer',
  'monk_strap',
  'boot',
  'sandal',
  'other',
] as const;
export type GarmentType = (typeof GARMENT_TYPES)[number];

export const COLOR_PALETTE = [
  'white',
  'off_white',
  'cream',
  'light_grey',
  'grey',
  'charcoal',
  'black',
  'navy',
  'blue',
  'light_blue',
  'teal',
  'green',
  'olive',
  'khaki',
  'beige',
  'tan',
  'brown',
  'burgundy',
  'red',
  'orange',
  'yellow',
  'pink',
  'purple',
  'other',
] as const;
export type Color = (typeof COLOR_PALETTE)[number];

export const PATTERNS = ['solid', 'stripes', 'checks', 'other'] as const;
export type Pattern = (typeof PATTERNS)[number];

export const STYLES = [
  'executive_formal',
  'business_casual',
  'minimal_casual',
  'casual_only',
] as const;
export type Style = (typeof STYLES)[number];

export const FORMAL_BLOCKLIST: GarmentType[] = [
  'tshirt',
  'joggers',
  'shorts',
  'sneaker',
  'sandal',
];

export const APP_CONFIG = {
  imageResizeTargetPx: 1024,
  maxCandidatesToRank: 15,
  officeSuitabilityMinRegular: 0.4,
  formalMeetingSuitabilityMinFormal: 0.6,
  visualWeight: 0.70,
  freshnessWeight: 0.30,
  weights: {
    colorHarmony: 0.25,
    formalityMatch: 0.20,
    presentationAppeal: 0.15,
    proportion: 0.10,
    texturePattern: 0.10,
    climate: 0.10,
    officeFit: 0.10,
  },
  currentAnalysisVersion: 'v2',
};

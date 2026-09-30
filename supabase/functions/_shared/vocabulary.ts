// Shared Vocabulary & Configuration for Garment Analysis & Outfit Ranking
// Matches Cultus Modern Sartorial Vision specification

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

export const PATTERN_SCALES = ['none', 'micro', 'small', 'medium', 'large', 'unclear'] as const;
export const WEAVE_KNITS = ['plain', 'twill', 'knit', 'other', 'unclear'] as const;
export const TEXTURES = ['smooth', 'fine_texture', 'textured', 'heavy_texture', 'unclear'] as const;
export const SHOE_MATERIALS = ['smooth_leather', 'suede', 'canvas', 'knit', 'synthetic', 'other', 'unclear', 'not_applicable'] as const;
export const SILHOUETTES = ['structured', 'tailored', 'straight', 'tapered', 'relaxed', 'oversized', 'unclear'] as const;
export const FITS = ['tailored', 'slim', 'regular', 'relaxed', 'oversized', 'unclear'] as const;
export const SLEEVES = ['long', 'short', 'none'] as const;
export const CONDITIONS = ['pristine', 'good', 'wrinkled', 'stained_or_damaged', 'worn', 'unclear'] as const;

export const STYLES = [
  'executive_formal',
  'business_casual',
  'minimal_casual',
  'casual_only',
] as const;
export type Style = (typeof STYLES)[number];

// Formal Meeting Strict Exclusions
export const FORMAL_BLOCKLIST: GarmentType[] = [
  'tshirt',
  'joggers',
  'shorts',
  'sneaker',
  'sandal',
];

export const CONFIG = {
  officeSuitabilityMinRegular: 0.4, // on 0.0 - 1.0 scale
  formalMeetingSuitabilityMinFormal: 0.6, // on 0.0 - 1.0 scale
  maxCandidatesToRank: 15,
  minCandidatesRequired: 1,
  recentOfficeDaysExclusionWindow: 5,
  pairFrequencyWindowDays: 60,
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
};

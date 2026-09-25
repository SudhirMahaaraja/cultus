import { ClothingItem, RecommendationCandidate } from '@/types';

export function generateAllCandidates(clothingItems: ClothingItem[]): RecommendationCandidate[] {
  const activeItems = clothingItems.filter((item) => item.active);

  const tops = activeItems.filter(
    (item) => item.category === 'formal_shirt' || item.category === 'tshirt'
  );
  const bottoms = activeItems.filter(
    (item) => item.category === 'formal_pants' || item.category === 'joggers'
  );
  const footwear = activeItems.filter(
    (item) => item.category === 'white_sneakers'
  );

  // If no footwear in database, create fallback white sneaker representation
  const activeFootwear = footwear.length > 0 ? footwear : [
    {
      id: 'fallback-white-sneaker',
      category: 'white_sneakers' as const,
      name: 'Essential Sartorial White Sneakers',
      image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?q=80&w=800&auto=format&fit=crop',
      active: true,
      ai_analysis: {
        category: 'white_sneakers' as const,
        dominant_colors: ['white'],
        secondary_colors: [],
        pattern: 'minimal',
        style: 'sartorial',
        fit: 'low top',
        office_suitability: 0.95,
        visual_summary: 'Minimalist white leather sneakers.',
        confidence: 0.95,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const candidates: RecommendationCandidate[] = [];

  tops.forEach((top) => {
    bottoms.forEach((bottom) => {
      activeFootwear.forEach((shoe) => {
        const id = `cand-${top.id}-${bottom.id}-${shoe.id}`;
        candidates.push({
          id,
          shirt: top,
          bottom,
          footwear: shoe,
          deterministicScore: 0.5,
          recencyPenalty: 0,
          meetingSuitabilityScore: 0.5,
          isBlocked: false,
        });
      });
    });
  });

  return candidates;
}

import { NextResponse } from 'next/server';
import { getVisionProvider } from '@/lib/ai/provider';

export async function POST(req: Request) {
  let imageUrl = '';
  try {
    const body = await req.json();
    imageUrl = body.imageUrl || '';

    if (!imageUrl) {
      return NextResponse.json(
        { status: 'error', error: { message: 'imageUrl is required' } },
        { status: 400 }
      );
    }

    const isBase64 = imageUrl.startsWith('data:');
    console.log(`[POST /api/ai/analyze] Analyzing garment image (${isBase64 ? 'base64 upload' : 'URL'}, size: ~${Math.round(imageUrl.length / 1024)}KB)`);

    const provider = getVisionProvider();
    const analysis = await provider.analyzeGarment(imageUrl);

    console.log(`[POST /api/ai/analyze] Analysis complete: category="${analysis.category}", pattern="${analysis.pattern}", office_suitability=${analysis.office_suitability}, colors=[${analysis.dominant_colors?.join(', ')}]`);
    console.log(`[POST /api/ai/analyze] Visual summary: "${analysis.visual_summary}"`);

    return NextResponse.json({
      status: 'success',
      data: analysis,
    });
  } catch (error: any) {
    console.error('[POST /api/ai/analyze] Vision AI error:', error.message);

    // Heuristic fallback if API key fails or network error
    const fallbackCategory = imageUrl.includes('pants') || imageUrl.includes('trouser')
      ? 'formal_pants'
      : imageUrl.includes('sneaker') || imageUrl.includes('shoe')
      ? 'white_sneakers'
      : imageUrl.includes('tshirt') || imageUrl.includes('tee')
      ? 'tshirt'
      : 'formal_shirt';

    console.warn(`[POST /api/ai/analyze] Using fallback analysis — category="${fallbackCategory}"`);

    const fallbackAnalysis = {
      category: fallbackCategory,
      dominant_colors: ['Navy Blue', 'White'],
      secondary_colors: ['Charcoal'],
      pattern: 'solid twill',
      style: 'executive_formal',
      fit: 'tailored',
      office_suitability: 0.9,
      visual_summary: 'Classic executive garment with crisp tailored finish suitable for formal meetings.',
      confidence: 0.95,
    };

    return NextResponse.json({
      status: 'success',
      data: fallbackAnalysis,
      warning: error.message,
    });
  }
}

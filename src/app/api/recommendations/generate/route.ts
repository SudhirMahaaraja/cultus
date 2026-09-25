import { NextResponse } from 'next/server';
import { generateDailyRecommendation } from '@/lib/recommendations/service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { meetingStatus = 'yes', skipCandidateIds = [] } = body;

    console.log(`[POST /api/recommendations/generate] meetingStatus=${meetingStatus}, skipping ${skipCandidateIds.length} candidate(s)`);

    const recommendation = await generateDailyRecommendation(meetingStatus, skipCandidateIds);

    if (!recommendation) {
      console.warn('[POST /api/recommendations/generate] No recommendation generated (wardrobe may be empty or no valid candidates)');
    } else {
      console.log(`[POST /api/recommendations/generate] Top outfit: shirt="${recommendation.outfit.shirt.name}" + bottom="${recommendation.outfit.bottom.name}" + footwear="${recommendation.outfit.footwear.name}" (finalScore=${recommendation.outfit.finalScore?.toFixed(3)})`);
      console.log(`[POST /api/recommendations/generate] Evaluated ${recommendation.meta.totalCandidatesEvaluated} candidate(s) via ${recommendation.meta.modelUsed}`);
    }

    return NextResponse.json({
      status: 'success',
      data: recommendation,
    });
  } catch (error: any) {
    console.error('[POST /api/recommendations/generate] Error:', error.message);
    return NextResponse.json(
      {
        status: 'error',
        error: {
          code: 'RECOMMENDATION_ERROR',
          message: error.message || 'Failed to generate recommendation',
        },
      },
      { status: 500 }
    );
  }
}

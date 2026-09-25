// @maintained 2026-09-25T14:37:10.699Z
import { NextResponse } from 'next/server';
import { getVisionProvider } from '@/lib/ai/provider';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageUrl } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { status: 'error', error: { code: 'INVALID_INPUT', message: 'imageUrl is required' } },
        { status: 400 }
      );
    }

    const provider = getVisionProvider();
    const analysis = await provider.analyzeGarment(imageUrl);

    return NextResponse.json({
      status: 'success',
      data: analysis,
      meta: {
        provider: provider.name,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        error: { code: 'ANALYSIS_ERROR', message: error.message || 'Garment analysis failed' },
      },
      { status: 500 }
    );
  }
}

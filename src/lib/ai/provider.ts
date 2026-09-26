import { GarmentAIAnalysis, RecommendationCandidate } from '@/types';
import { GarmentAIAnalysisSchema } from './schemas';
import { SYSTEM_PROMPTS } from './prompts';

export interface VisionProvider {
  name: string;
  analyzeGarment(imageUrl: string, base64Data?: string): Promise<GarmentAIAnalysis>;
  rankOutfits(
    candidates: RecommendationCandidate[],
    context: { meetingStatus: 'yes' | 'no'; recentOutfitsText: string }
  ): Promise<{
    rankings: Map<string, {
      score: number;
      rationale: string;
      presentationAppeal?: number;
      rotationFreshness?: number;
      howToWear?: string[];
      issues?: string[];
    }>;
    topRationale: string;
    topHowToWear?: string[];
    modelUsed: string;
  }>;
}

// Pure Azure OpenAI Vision Provider using process.env credentials
export class AzureOpenAIVisionProvider implements VisionProvider {
  name = 'azure-openai-gpt-4o-mini';

  private apiKey = process.env.OPENAI_API_KEY || '';
  private endpoint = (process.env.OPENAI_ENDPOINT || '').replace(/\/$/, '');
  private apiVersion = process.env.OPENAI_API_VERSION || '2024-08-01-preview';
  private deployment = process.env.OPENAI_LLM || 'gpt-4o-mini';

  async analyzeGarment(imageUrl: string): Promise<GarmentAIAnalysis> {
    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI credentials missing: Please set OPENAI_API_KEY and OPENAI_ENDPOINT in .env.local');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: SYSTEM_PROMPTS.GARMENT_ANALYSIS,
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Analyze this garment for office wear suitability.' },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Azure OpenAI API request failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Azure OpenAI returned empty analysis response');
    }

    const parsed = JSON.parse(content);
    return GarmentAIAnalysisSchema.parse(parsed);
  }

  async rankOutfits(
    candidates: RecommendationCandidate[],
    context: { meetingStatus: 'yes' | 'no'; recentOutfitsText: string }
  ) {
    if (!this.apiKey || !this.endpoint) {
      throw new Error('Azure OpenAI credentials missing: Please set OPENAI_API_KEY and OPENAI_ENDPOINT in .env.local');
    }

    const url = `${this.endpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    const promptText = `
Evaluate the following candidate executive outfit combinations for an office day (Formal Meeting Scheduled: ${context.meetingStatus.toUpperCase()}).
Recent Wear History (Avoid repeating recent combinations): ${context.recentOutfitsText || 'None recorded'}

For each candidate, evaluate visual color harmony, fabric contrast, formality suitability, and wear rotation.
Return a JSON object with:
"rankings": array of { "candidateId": "string", "score": 0.0 to 1.0, "presentationAppeal": 0.0 to 1.0, "rotationFreshness": 0.0 to 1.0, "rationale": "1-sentence executive reasoning", "howToWear": ["instruction 1"], "issues": ["issue 1"] },
"topRationale": "Overall recommendation summary",
"topHowToWear": ["practical wearing instruction 1", "practical wearing instruction 2"]

Candidates:
${candidates
  .map(
    (c) =>
      `- Candidate ID: ${c.id}\n  Shirt: ${c.shirt.name} (${c.shirt.ai_analysis?.pattern || 'solid'}, Colors: ${c.shirt.ai_analysis?.dominant_colors?.join(', ') || 'classic'})\n  Trouser: ${c.bottom.name} (${c.bottom.ai_analysis?.pattern || 'tailored'}, Colors: ${c.bottom.ai_analysis?.dominant_colors?.join(', ') || 'dark'})\n  Footwear: ${c.footwear.name}`
  )
  .join('\n')}
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': this.apiKey,
      },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: SYSTEM_PROMPTS.OUTFIT_RANKING },
          { role: 'user', content: promptText },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Azure OpenAI ranking request failed [${response.status}]: ${errText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Azure OpenAI returned empty ranking response');
    }

    const parsed = JSON.parse(content);
    const rankingsMap = new Map<string, {
      score: number;
      rationale: string;
      presentationAppeal?: number;
      rotationFreshness?: number;
      howToWear?: string[];
      issues?: string[];
    }>();

    if (Array.isArray(parsed.rankings)) {
      parsed.rankings.forEach((item: any) => {
        const rawScore = typeof item.score === 'number' ? item.score : item.visualScore;
        if (item.candidateId && typeof rawScore === 'number') {
          rankingsMap.set(item.candidateId, {
            score: Math.min(1.0, Math.max(0.0, rawScore)),
            rationale: item.rationale || 'Executive combination.',
            presentationAppeal: typeof item.presentationAppeal === 'number' ? item.presentationAppeal : undefined,
            rotationFreshness: typeof item.rotationFreshness === 'number' ? item.rotationFreshness : undefined,
            howToWear: Array.isArray(item.howToWear) ? item.howToWear : undefined,
            issues: Array.isArray(item.issues) ? item.issues : undefined,
          });
        }
      });
    }

    return {
      rankings: rankingsMap,
      topRationale: parsed.topRationale || 'Optimal executive combination.',
      topHowToWear: Array.isArray(parsed.topHowToWear) ? parsed.topHowToWear : undefined,
      modelUsed: `${this.deployment} (Azure OpenAI)`,
    };
  }
}

export function getVisionProvider(): VisionProvider {
  return new AzureOpenAIVisionProvider();
}

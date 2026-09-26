// @maintained 2026-09-25T14:37:10.700Z
'use client';

import React from 'react';
import { RecommendationCandidate } from '@/types';
import { Sparkles, Palette, Layers } from 'lucide-react';

interface AIRationaleCardProps {
  candidate: RecommendationCandidate;
  rationaleText: string;
}

export const AIRationaleCard: React.FC<AIRationaleCardProps> = ({ candidate, rationaleText }) => {
  const shirtColors = candidate.shirt.ai_analysis.dominant_colors.join(', ');
  const bottomColors = candidate.bottom.ai_analysis.dominant_colors.join(', ');

  return (
    <div className="w-full bg-[#f0f4fd]/80 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl p-4 shadow-level-1 backdrop-blur-md mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-[#9e5a44] dark:text-[#5ce3e6]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1e3a5f] dark:text-[#5ce3e6]">
          Vision AI Rationale
        </h3>
      </div>

      <p className="text-xs leading-relaxed text-[#171c23] dark:text-slate-100 font-medium mb-3">
        &ldquo;{rationaleText || candidate.aiReason}&rdquo;
      </p>

      {/* Practical How To Wear Styling Tips */}
      {candidate.howToWear && candidate.howToWear.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-[#dee2ec] dark:border-[#5ce3e6]/20">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#43474e] dark:text-[#5ce3e6] block mb-1">
            Styling &amp; Presentation Tips
          </span>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-[#171c23] dark:text-slate-200">
            {candidate.howToWear.map((tip, idx) => (
              <li key={idx} className="leading-snug">{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tonal Harmony Visual Spectrum */}
      <div className="pt-2 border-t border-[#dee2ec] dark:border-[#5ce3e6]/20 grid grid-cols-2 gap-3 text-[11px]">
        <div className="flex items-center gap-2">
          <Palette className="w-3.5 h-3.5 text-[#1e3a5f] dark:text-[#5ce3e6]" />
          <div>
            <span className="text-[#43474e] dark:text-slate-400 block text-[10px] font-medium">Palette Match</span>
            <span className="font-semibold text-[#171c23] dark:text-white capitalize">
              {shirtColors} &amp; {bottomColors}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#5e6954] dark:text-emerald-400" />
          <div>
            <span className="text-[#43474e] dark:text-slate-400 block text-[10px] font-medium">Texture Pairing</span>
            <span className="font-semibold text-[#171c23] dark:text-white capitalize">
              {candidate.shirt.ai_analysis.pattern} / {candidate.bottom.ai_analysis.pattern}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

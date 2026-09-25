'use client';

import React from 'react';
import Image from 'next/image';
import { RecommendationCandidate } from '@/types';
import { ShieldCheck, Clock, Sparkles } from 'lucide-react';

interface OutfitRecommendationProps {
  candidate: RecommendationCandidate;
}

export const OutfitRecommendation: React.FC<OutfitRecommendationProps> = ({ candidate }) => {
  const { shirt, bottom, footwear } = candidate;

  return (
    <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-4 shadow-level-2 backdrop-blur-md mb-4">
      {/* Editorial Header badge */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e2e6ea] dark:border-[#5ce3e6]/20">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#9e5a44] dark:bg-[#5ce3e6]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#1e3a5f] dark:text-[#5ce3e6]">
            Daily Sartorial Match
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#f0f2f5] dark:bg-[#15253b] text-[11px] font-semibold text-[#1e3a5f] dark:text-[#5ce3e6]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#9e5a44] dark:text-[#fdaa8f]" />
          <span>{( (candidate.finalScore || 0.94) * 100 ).toFixed(0)}% Match Score</span>
        </div>
      </div>

      {/* Garment Photography Hero Trio Stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Top Garment Card */}
        <div className="relative group bg-[#f8f9fa] dark:bg-[#15253b]/80 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl overflow-hidden shadow-level-1 flex flex-col">
          <div className="relative w-full aspect-[3/4] bg-[#f0f2f5] dark:bg-[#0f1c2e] overflow-hidden">
            <Image
              src={shirt.image_url}
              alt={shirt.name}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
              priority
            />
            {/* Soft gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e232a]/70 via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full glass-pill text-[10px] font-semibold text-[#171c23] dark:text-white">
              TOP • {shirt.category === 'formal_shirt' ? 'Formal Shirt' : 'T-Shirt'}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-[#15253b] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#171c23] dark:text-white line-clamp-1">{shirt.name}</h3>
              <p className="text-[11px] text-[#43474e] dark:text-slate-300 mt-0.5 line-clamp-1">{shirt.ai_analysis.visual_summary}</p>
            </div>
            <div className="mt-2 pt-2 border-t border-[#f0f2f5] dark:border-[#5ce3e6]/10 flex items-center justify-between text-[10px] text-[#43474e] dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-[#1e3a5f] dark:text-[#5ce3e6]" />
                {shirt.last_worn_at ? `Worn ${Math.round((Date.now() - new Date(shirt.last_worn_at).getTime()) / 86400000)}d ago` : 'Unworn'}
              </span>
              <span className="font-semibold text-[#9e5a44] dark:text-[#fdaa8f]">
                Formality {(shirt.ai_analysis.office_suitability * 10).toFixed(1)}/10
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Garment Card */}
        <div className="relative group bg-[#f8f9fa] dark:bg-[#15253b]/80 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl overflow-hidden shadow-level-1 flex flex-col">
          <div className="relative w-full aspect-[3/4] bg-[#f0f2f5] dark:bg-[#0f1c2e] overflow-hidden">
            <Image
              src={bottom.image_url}
              alt={bottom.name}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e232a]/70 via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full glass-pill text-[10px] font-semibold text-[#171c23] dark:text-white">
              BOTTOM • {bottom.category === 'formal_pants' ? 'Formal Pants' : 'Joggers'}
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-[#15253b] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#171c23] dark:text-white line-clamp-1">{bottom.name}</h3>
              <p className="text-[11px] text-[#43474e] dark:text-slate-300 mt-0.5 line-clamp-1">{bottom.ai_analysis.visual_summary}</p>
            </div>
            <div className="mt-2 pt-2 border-t border-[#f0f2f5] dark:border-[#5ce3e6]/10 flex items-center justify-between text-[10px] text-[#43474e] dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-[#1e3a5f] dark:text-[#5ce3e6]" />
                {bottom.last_worn_at ? `Worn ${Math.round((Date.now() - new Date(bottom.last_worn_at).getTime()) / 86400000)}d ago` : 'Unworn'}
              </span>
              <span className="font-semibold text-[#5e6954] dark:text-emerald-400">
                Fit: {bottom.ai_analysis.fit}
              </span>
            </div>
          </div>
        </div>

        {/* Footwear Card */}
        <div className="relative group bg-[#f8f9fa] dark:bg-[#15253b]/80 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl overflow-hidden shadow-level-1 flex flex-col">
          <div className="relative w-full aspect-[3/4] bg-[#f0f2f5] dark:bg-[#0f1c2e] overflow-hidden">
            <Image
              src={footwear.image_url}
              alt={footwear.name}
              fill
              className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e232a]/70 via-transparent to-transparent" />
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full glass-pill text-[10px] font-semibold text-[#171c23] dark:text-white">
              FOOTWEAR • White Sneaker
            </span>
          </div>
          <div className="p-3 bg-white dark:bg-[#15253b] flex-1 flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-semibold text-[#171c23] dark:text-white line-clamp-1">{footwear.name}</h3>
              <p className="text-[11px] text-[#43474e] dark:text-slate-300 mt-0.5 line-clamp-1">{footwear.ai_analysis.visual_summary}</p>
            </div>
            <div className="mt-2 pt-2 border-t border-[#f0f2f5] dark:border-[#5ce3e6]/10 flex items-center justify-between text-[10px] text-[#43474e] dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Sparkles className="w-3 h-3 text-[#9e5a44] dark:text-[#fdaa8f]" />
                Rotation Anchor
              </span>
              <span className="font-semibold text-[#1e3a5f] dark:text-[#5ce3e6]">
                {footwear.wear_count || 1} wears
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ClothingItem, OfficeDay, Outfit, OutfitFeedback } from '@/types';
import { Calendar as CalendarIcon, RotateCcw, AlertTriangle, ShieldCheck, Briefcase } from 'lucide-react';

interface HistoryCalendarProps {
  officeDays: OfficeDay[];
  outfits: Outfit[];
  clothingItems: ClothingItem[];
  feedbackList: OutfitFeedback[];
  onRestoreFeedback: (id: string) => void;
}

export const HistoryCalendar: React.FC<HistoryCalendarProps> = ({
  officeDays,
  outfits,
  clothingItems,
  feedbackList,
  onRestoreFeedback,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'blocked'>('history');

  const getItem = (id?: string) => clothingItems.find((item) => item.id === id);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Frequency Alert Banner */}
      <div className="w-full bg-[#f0f4fd] border border-[#e2e6ea] rounded-2xl p-4 shadow-level-1 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-[#9e5a44] shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs font-semibold text-[#1e3a5f]">Rotation Health Alert</h4>
          <p className="text-xs text-[#43474e] mt-0.5 leading-relaxed">
            Charcoal Trousers paired with Sky Blue Twill 3 times in 4 weeks. AI recommendation engine will favor alternate pairings this week to maximize wardrobe life.
          </p>
        </div>
      </div>

      {/* Tab Selector */}
      <div className="flex rounded-xl bg-[#e4e8f2] p-1 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'history'
              ? 'bg-white text-[#1e3a5f] shadow-sm'
              : 'text-[#43474e] hover:text-[#171c23]'
          }`}
        >
          Office Wear History ({outfits.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('blocked')}
          className={`flex-1 py-2 rounded-lg transition-all ${
            activeTab === 'blocked'
              ? 'bg-white text-[#1e3a5f] shadow-sm'
              : 'text-[#43474e] hover:text-[#171c23]'
          }`}
        >
          Blocked Combinations ({feedbackList.length})
        </button>
      </div>

      {activeTab === 'history' ? (
        <div className="flex flex-col gap-3">
          {outfits.length > 0 ? (
            outfits.map((outfit) => {
              const shirt = getItem(outfit.shirt_id);
              const bottom = getItem(outfit.bottom_id);
              const footwear = getItem(outfit.footwear_id);

              return (
                <div
                  key={outfit.id}
                  className="bg-white border border-[#e2e6ea] rounded-2xl p-4 shadow-level-1 flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between border-b border-[#f0f2f5] pb-2">
                    <div className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4 text-[#1e3a5f]" />
                      <span className="text-xs font-semibold text-[#171c23]">
                        {outfit.worn_on || 'Recent Office Day'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-[#1e3a5f]/10 text-[#1e3a5f] text-[10px] font-semibold flex items-center gap-1">
                      <Briefcase className="w-3 h-3" />
                      {outfit.meeting_status === 'yes' ? 'Formal Meeting' : 'Regular Office'}
                    </span>
                  </div>

                  {/* Outfit Garment Thumbnails Trio */}
                  <div className="grid grid-cols-3 gap-2">
                    {shirt && (
                      <div className="flex items-center gap-2 bg-[#f8f9fa] p-1.5 rounded-xl border border-[#e2e6ea]">
                        <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
                          <Image src={shirt.image_url} alt={shirt.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#43474e] block uppercase font-semibold">Top</span>
                          <p className="text-[11px] font-semibold text-[#171c23] truncate">{shirt.name}</p>
                        </div>
                      </div>
                    )}

                    {bottom && (
                      <div className="flex items-center gap-2 bg-[#f8f9fa] p-1.5 rounded-xl border border-[#e2e6ea]">
                        <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
                          <Image src={bottom.image_url} alt={bottom.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#43474e] block uppercase font-semibold">Bottom</span>
                          <p className="text-[11px] font-semibold text-[#171c23] truncate">{bottom.name}</p>
                        </div>
                      </div>
                    )}

                    {footwear && (
                      <div className="flex items-center gap-2 bg-[#f8f9fa] p-1.5 rounded-xl border border-[#e2e6ea]">
                        <div className="relative w-9 h-12 rounded-lg overflow-hidden shrink-0">
                          <Image src={footwear.image_url} alt={footwear.name} fill className="object-cover" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-[9px] text-[#43474e] block uppercase font-semibold">Shoes</span>
                          <p className="text-[11px] font-semibold text-[#171c23] truncate">{footwear.name}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {outfit.ai_reason && (
                    <p className="text-[11px] text-[#43474e] italic bg-[#f0f2f5] p-2 rounded-xl">
                      &ldquo;{outfit.ai_reason}&rdquo;
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="w-full py-12 text-center bg-white border border-[#e2e6ea] rounded-2xl">
              <p className="text-xs text-[#43474e]">No wear history logged yet. Confirm outfits on the Today screen.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {feedbackList.length > 0 ? (
            feedbackList.map((fb) => {
              const shirt = getItem(fb.shirt_id);
              const bottom = getItem(fb.bottom_id);

              return (
                <div
                  key={fb.id}
                  className="bg-white border border-[#e2e6ea] rounded-2xl p-4 shadow-level-1 flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-semibold text-[#171c23]">
                      {shirt?.name || 'Shirt'} + {bottom?.name || 'Bottom'}
                    </h4>
                    <p className="text-[11px] text-[#9e5a44] mt-0.5">{fb.reason}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRestoreFeedback(fb.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#f0f2f5] hover:bg-[#eaeef8] text-[#1e3a5f] text-xs font-semibold transition-all shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="w-full py-12 text-center bg-white border border-[#e2e6ea] rounded-2xl">
              <p className="text-xs text-[#43474e]">No blocked combinations. Rejections from &ldquo;Don&apos;t Suggest This&rdquo; will appear here.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

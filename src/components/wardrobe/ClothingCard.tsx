// @maintained 2026-09-25T14:46:30.208Z
'use client';

import React from 'react';
import Image from 'next/image';
import { ClothingItem } from '@/types';
import { Clock, Trash2 } from 'lucide-react';

interface ClothingCardProps {
  item: ClothingItem;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent, item: ClothingItem) => void;
}

export const ClothingCard: React.FC<ClothingCardProps> = ({ item, onClick, onDelete }) => {
  const categoryLabels: Record<string, string> = {
    formal_shirt: 'Formal Shirt',
    tshirt: 'T-Shirt',
    formal_pants: 'Formal Pants',
    joggers: 'Joggers',
    white_sneakers: 'White Sneakers',
  };

  return (
    <div
      onClick={onClick}
      className="group relative bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl overflow-hidden shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer flex flex-col backdrop-blur-md"
    >
      <div className="relative w-full aspect-[3/4] bg-[#f0f2f5] dark:bg-[#0f1c2e] overflow-hidden">
        <Image
          src={item.image_url}
          alt={item.name}
          fill
          className="object-cover object-center group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 640px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1e232a]/60 via-transparent to-transparent" />
        
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full glass-pill text-[10px] font-semibold text-[#171c23] dark:text-white">
          {categoryLabels[item.category] || item.category}
        </span>

        <div className="absolute top-2 right-2 flex items-center gap-1">
          {item.ai_analysis?.office_suitability && (
            <span className="px-2 py-0.5 rounded-full bg-[#1e3a5f] dark:bg-[#0f9cc2] text-white text-[10px] font-semibold">
              {(item.ai_analysis.office_suitability * 10).toFixed(0)}/10
            </span>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e, item);
              }}
              className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-sm transition-all opacity-80 group-hover:opacity-100"
              title="Delete Garment"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      <div className="p-3 bg-white dark:bg-[#0d1726] flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-semibold text-[#171c23] dark:text-white line-clamp-1">{item.name}</h3>
          <p className="text-[11px] text-[#43474e] dark:text-slate-300 mt-0.5 line-clamp-1">{item.ai_analysis?.visual_summary || item.name}</p>
        </div>

        <div className="mt-2 pt-2 border-t border-[#f0f2f5] dark:border-[#5ce3e6]/10 flex items-center justify-between text-[10px] text-[#43474e] dark:text-slate-400">
          <span className="flex items-center gap-1 font-medium">
            <Clock className="w-3 h-3 text-[#1e3a5f] dark:text-[#5ce3e6]" />
            {item.last_worn_at
              ? `${Math.round((Date.now() - new Date(item.last_worn_at).getTime()) / 86400000)}d ago`
              : 'Never worn'}
          </span>
          <span className="font-semibold text-[#9e5a44] dark:text-[#fdaa8f]">
            {item.wear_count || 0} Wears
          </span>
        </div>
      </div>
    </div>
  );
};

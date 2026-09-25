'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ClothingItem } from '@/types';
import { Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';

interface OrbitalImageWheelProps {
  items: ClothingItem[];
  onSelectItem?: (item: ClothingItem) => void;
}

export const OrbitalImageWheel: React.FC<OrbitalImageWheelProps> = ({ items, onSelectItem }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  if (items.length === 0) return null;

  const currentItem = items[activeIndex] || items[0];

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  return (
    <div className="w-full bg-gradient-to-b from-[#1e3a5f] to-[#022448] text-white rounded-3xl p-5 shadow-level-3 relative overflow-hidden mb-6">
      {/* Editorial Watermark */}
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#fdaa8f]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#8aa4cf]">
            Orbital Wardrobe Discovery
          </span>
        </div>
        <span className="text-xs font-mono font-semibold text-[#fdaa8f]">
          0{activeIndex + 1} / 0{items.length}
        </span>
      </div>

      {/* 3D Carousel Stage */}
      <div className="relative w-full aspect-[4/3] flex items-center justify-center my-2">
        {/* Active Hero Garment */}
        <div 
          onClick={() => onSelectItem?.(currentItem)}
          className="relative w-48 h-64 bg-white rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 transition-all duration-500 scale-105 cursor-pointer z-20 group"
        >
          <Image
            src={currentItem.image_url}
            alt={currentItem.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-500"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-3 right-3 text-left">
            <span className="px-2 py-0.5 rounded-full bg-[#9e5a44] text-white text-[9px] font-semibold uppercase">
              {currentItem.category.replace('_', ' ')}
            </span>
            <h4 className="text-xs font-semibold text-white mt-1 line-clamp-1">{currentItem.name}</h4>
          </div>
        </div>

        {/* Previous Ring Item Preview */}
        {items[(activeIndex - 1 + items.length) % items.length] && (
          <div 
            onClick={handlePrev}
            className="absolute left-2 w-32 h-44 rounded-xl overflow-hidden opacity-40 scale-85 blur-[1px] cursor-pointer hover:opacity-75 transition-all z-10 hidden sm:block"
          >
            <Image
              src={items[(activeIndex - 1 + items.length) % items.length].image_url}
              alt="Previous item"
              fill
              className="object-cover"
            />
          </div>
        )}

        {/* Next Ring Item Preview */}
        {items[(activeIndex + 1) % items.length] && (
          <div 
            onClick={handleNext}
            className="absolute right-2 w-32 h-44 rounded-xl overflow-hidden opacity-40 scale-85 blur-[1px] cursor-pointer hover:opacity-75 transition-all z-10 hidden sm:block"
          >
            <Image
              src={items[(activeIndex + 1) % items.length].image_url}
              alt="Next item"
              fill
              className="object-cover"
            />
          </div>
        )}
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10 relative z-10">
        <button
          type="button"
          onClick={handlePrev}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <p className="text-xs text-[#8aa4cf] text-center font-medium">
          {currentItem.ai_analysis?.visual_summary || currentItem.name}
        </p>

        <button
          type="button"
          onClick={handleNext}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

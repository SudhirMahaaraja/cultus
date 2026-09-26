'use client';

import React from 'react';
import { Sparkles } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between pt-4 pb-2 px-4 transition-all">
      <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-white/70 dark:bg-[#0d1726]/80 border border-white/60 dark:border-[#5ce3e6]/20 shadow-level-1 backdrop-blur-xl">
        <div className="w-7 h-7 rounded-xl bg-[#1e3a5f] dark:bg-[#0f9cc2] text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#fdaa8f] dark:text-[#5ce3e6] animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-tight text-[#171c23] dark:text-white font-[Plus_Jakarta_Sans] leading-none">
            Cultus
          </span>
          <span className="text-[9px] font-semibold tracking-wider text-[#74777f] dark:text-[#8aa4cf] mt-0.5">
          </span>
        </div>
      </div>
    </header>
  );
};

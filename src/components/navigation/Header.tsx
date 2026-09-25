'use client';

import React from 'react';
import { Sparkles, Briefcase } from 'lucide-react';
import { InstallPWAButton } from '@/components/pwa/InstallPWA';

export const Header: React.FC<{ syncStatus?: string }> = ({ syncStatus = 'Capsule Sync OK' }) => {
  return (
    <header className="w-full px-5 pt-4 pb-3 flex items-center justify-between border-b border-[#e2e6ea]/60 dark:border-[#5ce3e6]/20 bg-[#f8f9ff]/80 dark:bg-[#070f1c]/80 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-[#1e3a5f] dark:bg-[#0f9cc2] text-white flex items-center justify-center shadow-sm">
          <Sparkles className="w-4 h-4 text-[#fdaa8f] dark:text-[#5ce3e6]" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-semibold text-base tracking-tight text-[#171c23] dark:text-white font-[Plus_Jakarta_Sans]">
              Cultus
            </h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#1e3a5f]/10 dark:bg-[#5ce3e6]/15 text-[#1e3a5f] dark:text-[#5ce3e6] border border-[#1e3a5f]/20 dark:border-[#5ce3e6]/30">
              <Briefcase className="w-2.5 h-2.5 mr-0.5 inline" /> Mon-Fri
            </span>
          </div>
          <p className="text-[11px] text-[#43474e] dark:text-slate-300 flex items-center gap-1 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {syncStatus}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <InstallPWAButton />
        <div className="w-8 h-8 rounded-full bg-[#dee2ec] dark:bg-[#1a2940] border border-[#e2e6ea] dark:border-[#5ce3e6]/30 overflow-hidden flex items-center justify-center text-xs font-semibold text-[#1e3a5f] dark:text-[#5ce3e6]">
          SM
        </div>
      </div>
    </header>
  );
};

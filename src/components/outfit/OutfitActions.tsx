'use client';

import React, { useState } from 'react';
import { CheckCircle2, RotateCw, Ban, Sparkles } from 'lucide-react';

interface OutfitActionsProps {
  onWearThis: () => void;
  onShowAnother: () => void;
  onDontSuggest: () => void;
  isConfirmed: boolean;
}

export const OutfitActions: React.FC<OutfitActionsProps> = ({
  onWearThis,
  onShowAnother,
  onDontSuggest,
  isConfirmed,
}) => {
  const [isWearing, setIsWearing] = useState(false);

  const handleWear = () => {
    setIsWearing(true);
    onWearThis();
  };

  if (isConfirmed || isWearing) {
    return (
      <div className="w-full bg-[#1e3a5f] dark:bg-[#0f1c2e] text-white rounded-2xl p-4 shadow-level-2 text-center animate-fade-in border border-transparent dark:border-[#5ce3e6]/30">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold">Worn Today Confirmed</h3>
        </div>
        <p className="text-xs text-[#8aa4cf] dark:text-slate-300">
          This combination has been logged to your office rotation history.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2.5 mb-6">
      {/* Primary Actions Grid */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleWear}
          className="w-full py-3.5 px-4 rounded-full bg-[#1e3a5f] dark:bg-[#5ce3e6] text-white dark:text-[#070f1c] font-semibold text-xs flex items-center justify-center gap-2 shadow-level-1 hover:bg-[#022448] dark:hover:bg-[#38c9cd] active:scale-98 transition-all"
        >
          <Sparkles className="w-4 h-4 text-[#fdaa8f] dark:text-[#070f1c]" />
          <span>WEAR THIS</span>
        </button>

        <button
          type="button"
          onClick={onShowAnother}
          className="w-full py-3.5 px-4 rounded-full border-1.5 border-[#1e3a5f] dark:border-[#5ce3e6] text-[#1e3a5f] dark:text-[#5ce3e6] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#f0f2f5] dark:hover:bg-[#15253b] active:scale-98 transition-all"
        >
          <RotateCw className="w-4 h-4" />
          <span>SHOW ANOTHER</span>
        </button>
      </div>

      {/* Negative Feedback Action */}
      <button
        type="button"
        onClick={onDontSuggest}
        className="w-full py-2.5 px-4 rounded-full bg-red-500/10 dark:bg-red-500/15 border border-red-500/25 dark:border-red-500/35 text-red-600 dark:text-red-400 hover:bg-red-500/20 dark:hover:bg-red-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-98 shadow-sm"
      >
        <Ban className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
        <span>Don&apos;t Suggest This Combination</span>
      </button>
    </div>
  );
};

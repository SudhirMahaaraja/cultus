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
      <div className="w-full bg-[#1e3a5f] text-white rounded-2xl p-4 shadow-level-2 text-center animate-fade-in">
        <div className="flex items-center justify-center gap-2 mb-1">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-semibold">Worn Today Confirmed</h3>
        </div>
        <p className="text-xs text-[#8aa4cf]">
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
          className="w-full py-3.5 px-4 rounded-full bg-[#1e3a5f] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-level-1 hover:bg-[#022448] active:scale-98 transition-all"
        >
          <Sparkles className="w-4 h-4 text-[#fdaa8f]" />
          <span>WEAR THIS</span>
        </button>

        <button
          type="button"
          onClick={onShowAnother}
          className="w-full py-3.5 px-4 rounded-full border-1.5 border-[#1e3a5f] text-[#1e3a5f] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#f0f2f5] active:scale-98 transition-all"
        >
          <RotateCw className="w-4 h-4" />
          <span>SHOW ANOTHER</span>
        </button>
      </div>

      {/* Negative Feedback Action */}
      <button
        type="button"
        onClick={onDontSuggest}
        className="w-full py-2.5 px-4 rounded-full bg-transparent text-[#9e5a44] hover:bg-[#9e5a44]/8 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
      >
        <Ban className="w-3.5 h-3.5" />
        <span>Don&apos;t Suggest This Combination</span>
      </button>
    </div>
  );
};

// @maintained 2026-09-26T06:58:24.060Z
'use client';

import React, { useState, useEffect } from 'react';
import { Briefcase, UserCheck } from 'lucide-react';

interface MeetingPromptProps {
  meetingStatus: 'yes' | 'no';
  meetingType: 'formal' | 'regular';
  onChange: (status: 'yes' | 'no', type?: 'formal' | 'regular') => void;
}

export const MeetingPrompt: React.FC<MeetingPromptProps> = ({
  meetingStatus,
  meetingType,
  onChange,
}) => {
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    setFormattedDate(
      new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase()
    );
  }, []);

  return (
    <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-2xl p-4 shadow-level-1 backdrop-blur-md mb-4">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#43474e] dark:text-[#5ce3e6]">
          Morning Context
        </h2>
        <span className="text-[11px] font-medium text-[#9e5a44] dark:text-[#fdaa8f]" suppressHydrationWarning>
          {formattedDate || 'TODAY'}
        </span>
      </div>

      <p className="text-sm font-semibold text-[#171c23] dark:text-white mb-3">
        Do you have an executive or team meeting today?
      </p>

      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => onChange('yes', 'formal')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
            meetingStatus === 'yes'
              ? 'bg-[#1e3a5f] dark:bg-[#0f9cc2] text-white border-[#1e3a5f] dark:border-[#5ce3e6]/50 shadow-sm'
              : 'bg-[#f0f2f5] dark:bg-[#15253b] text-[#171c23] dark:text-slate-200 border-[#e2e6ea] dark:border-[#5ce3e6]/20 hover:bg-[#eaeef8] dark:hover:bg-[#1c2f4a]'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>Formal Meeting</span>
        </button>

        <button
          type="button"
          onClick={() => onChange('no', 'regular')}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all ${
            meetingStatus === 'no'
              ? 'bg-[#1e3a5f] dark:bg-[#0f9cc2] text-white border-[#1e3a5f] dark:border-[#5ce3e6]/50 shadow-sm'
              : 'bg-[#f0f2f5] dark:bg-[#15253b] text-[#171c23] dark:text-slate-200 border-[#e2e6ea] dark:border-[#5ce3e6]/20 hover:bg-[#eaeef8] dark:hover:bg-[#1c2f4a]'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Regular Office</span>
        </button>
      </div>
    </div>
  );
};

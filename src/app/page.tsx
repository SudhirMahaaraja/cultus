'use client';

import React, { useState, useEffect } from 'react';
import { SartorialBackground } from '@/components/background/SartorialBackground';
import { Header } from '@/components/navigation/Header';
import { BottomNav } from '@/components/navigation/BottomNav';
import { MeetingPrompt } from '@/components/outfit/MeetingPrompt';
import { OutfitRecommendation } from '@/components/outfit/OutfitRecommendation';
import { AIRationaleCard } from '@/components/outfit/AIRationaleCard';
import { OutfitActions } from '@/components/outfit/OutfitActions';
import { wardrobeStore } from '@/lib/storage/wardrobeStore';
import { RecommendationResponse } from '@/types';
import { Sparkles, RefreshCw, Plus, Shirt } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const [meetingStatus, setMeetingStatus] = useState<'yes' | 'no'>('yes');
  const [meetingType, setMeetingType] = useState<'formal' | 'regular'>('formal');
  const [recommendation, setRecommendation] = useState<RecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [skipCandidateIds, setSkipCandidateIds] = useState<string[]>([]);
  const [isConfirmedWorn, setIsConfirmedWorn] = useState(false);

  const fetchRecommendation = async (status: 'yes' | 'no', skips: string[] = []) => {
    setIsLoading(true);
    setIsConfirmedWorn(false);

    try {
      const res = await fetch('/api/recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingStatus: status, skipCandidateIds: skips }),
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.error?.message || 'Failed to generate recommendation');
      }

      setRecommendation(json.data);
    } catch (e) {
      console.error('Failed to generate outfit recommendation:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendation(meetingStatus, []);
  }, [meetingStatus]);

  const handleMeetingChange = (status: 'yes' | 'no', type?: 'formal' | 'regular') => {
    setMeetingStatus(status);
    if (type) setMeetingType(type);
    setSkipCandidateIds([]);
  };

  const handleShowAnother = () => {
    if (recommendation?.outfit) {
      const newSkips = [...skipCandidateIds, recommendation.outfit.id];
      setSkipCandidateIds(newSkips);
      fetchRecommendation(meetingStatus, newSkips);
    }
  };

  const handleDontSuggest = () => {
    if (recommendation?.outfit) {
      const { shirt, bottom, footwear } = recommendation.outfit;
      wardrobeStore.recordDontSuggest(shirt.id, bottom.id, footwear.id);
      handleShowAnother();
    }
  };

  const handleWearThis = () => {
    if (recommendation?.outfit) {
      const { shirt, bottom, footwear } = recommendation.outfit;
      wardrobeStore.confirmOutfitWorn(
        shirt.id,
        bottom.id,
        footwear.id,
        meetingStatus,
        recommendation.rationale
      );
      setIsConfirmedWorn(true);
    }
  };

  return (
    <>
      <Header />

      <main className="flex-1 w-full px-4 pt-4 flex flex-col items-center">
        {/* Morning Context Selector */}
        <MeetingPrompt
          meetingStatus={meetingStatus}
          meetingType={meetingType}
          onChange={handleMeetingChange}
        />

        {/* Outfit Recommendation Section */}
        {isLoading ? (
          <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-8 shadow-level-2 flex flex-col items-center justify-center text-center my-4 min-h-[360px] backdrop-blur-md">
            <Sparkles className="w-8 h-8 text-[#9e5a44] dark:text-[#5ce3e6] animate-spin mb-3" />
            <h3 className="text-sm font-semibold text-[#1e3a5f] dark:text-[#5ce3e6]">
              Analyzing Wardrobe Vision Intelligence...
            </h3>
            <p className="text-xs text-[#43474e] dark:text-slate-300 mt-1 max-w-xs">
              Evaluating garment photographs, rotation recency, and executive formality parameters.
            </p>
          </div>
        ) : recommendation ? (
          <div className="w-full flex flex-col items-center animate-fade-in">
            {/* Real Clothing Photography Hero Trio */}
            <OutfitRecommendation candidate={recommendation.outfit} />

            {/* AI Vision Rationale Card */}
            <AIRationaleCard
              candidate={recommendation.outfit}
              rationaleText={recommendation.rationale}
            />

            {/* Interactive Decision Actions Bar */}
            <OutfitActions
              onWearThis={handleWearThis}
              onShowAnother={handleShowAnother}
              onDontSuggest={handleDontSuggest}
              isConfirmed={isConfirmedWorn}
            />
          </div>
        ) : (
          <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-8 shadow-level-2 flex flex-col items-center justify-center text-center my-4 min-h-[320px] backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/10 dark:bg-[#5ce3e6]/10 text-[#1e3a5f] dark:text-[#5ce3e6] flex items-center justify-center mb-4">
              <Shirt className="w-8 h-8" />
            </div>
            <h3 className="text-base font-semibold text-[#171c23] dark:text-white">
              Your Wardrobe is Empty
            </h3>
            <p className="text-xs text-[#43474e] dark:text-slate-300 mt-2 mb-6 max-w-xs leading-relaxed">
              Capture or upload garment photographs to analyze their style attributes and generate AI sartorial outfit recommendations.
            </p>
            <Link
              href="/add"
              className="py-3.5 px-6 rounded-full bg-[#1e3a5f] dark:bg-[#5ce3e6] text-white dark:text-[#070f1c] font-semibold text-xs flex items-center gap-2 shadow-level-1 hover:bg-[#022448] dark:hover:bg-[#38c9cd] transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Garment</span>
            </Link>
          </div>
        )}
      </main>

      <BottomNav />
    </>
  );
}

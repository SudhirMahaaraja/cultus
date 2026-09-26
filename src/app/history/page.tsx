'use client';

import React, { useState, useEffect } from 'react';
import { SartorialBackground } from '@/components/background/SartorialBackground';
import { Header } from '@/components/navigation/Header';
import { BottomNav } from '@/components/navigation/BottomNav';
import { HistoryCalendar } from '@/components/history/HistoryCalendar';
import { wardrobeStore } from '@/lib/storage/wardrobeStore';
import { ClothingItem, OfficeDay, Outfit, OutfitFeedback } from '@/types';

export default function HistoryPage() {
  const [officeDays, setOfficeDays] = useState<OfficeDay[]>([]);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [feedbackList, setFeedbackList] = useState<OutfitFeedback[]>([]);

  const loadData = () => {
    setOfficeDays(wardrobeStore.getOfficeDays());
    setOutfits(wardrobeStore.getOutfits());
    setClothingItems(wardrobeStore.getClothingItems());
    setFeedbackList(wardrobeStore.getFeedback());
  };

  useEffect(() => {
    loadData();

    const syncHistoryWithSupabase = async () => {
      try {
        const [outfitsRes, daysRes, garmentsRes, feedbackRes] = await Promise.all([
          fetch('/api/outfits'),
          fetch('/api/office-days'),
          fetch('/api/garments'),
          fetch('/api/feedback'),
        ]);

        const [outfitsJson, daysJson, garmentsJson, feedbackJson] = await Promise.all([
          outfitsRes.json(),
          daysRes.json(),
          garmentsRes.json(),
          feedbackRes.json(),
        ]);

        if (outfitsJson.status === 'success' && Array.isArray(outfitsJson.data)) {
          setOutfits(outfitsJson.data);
          try { localStorage.setItem('cultus_outfits', JSON.stringify(outfitsJson.data)); } catch {}
        }

        if (daysJson.status === 'success' && Array.isArray(daysJson.data)) {
          setOfficeDays(daysJson.data);
          try { localStorage.setItem('cultus_office_days', JSON.stringify(daysJson.data)); } catch {}
        }

        if (garmentsJson.status === 'success' && Array.isArray(garmentsJson.data)) {
          setClothingItems(garmentsJson.data);
          try { localStorage.setItem('cultus_clothing_items', JSON.stringify(garmentsJson.data)); } catch {}
        }

        if (feedbackJson.status === 'success' && Array.isArray(feedbackJson.data)) {
          setFeedbackList(feedbackJson.data);
          try { localStorage.setItem('cultus_feedback', JSON.stringify(feedbackJson.data)); } catch {}
        }
      } catch (e) {
        console.warn('History Supabase sync warning:', e);
      }
    };

    syncHistoryWithSupabase();
  }, []);

  const handleRestoreFeedback = (id: string) => {
    wardrobeStore.restoreFeedback(id);
    loadData();
  };

  return (
    <>
      <Header />

      <main className="flex-1 w-full px-4 pt-4 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#171c23] dark:text-white">
              Outfit Calendar &amp; Rotation Memory
            </h2>
            <p className="text-xs text-[#43474e] dark:text-slate-300">
              Monday–Friday wear log &amp; preference rules
            </p>
          </div>
        </div>

        <HistoryCalendar
          officeDays={officeDays}
          outfits={outfits}
          clothingItems={clothingItems}
          feedbackList={feedbackList}
          onRestoreFeedback={handleRestoreFeedback}
        />
      </main>

      <BottomNav />
    </>
  );
}

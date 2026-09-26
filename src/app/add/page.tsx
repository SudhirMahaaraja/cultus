'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SartorialBackground } from '@/components/background/SartorialBackground';
import { Header } from '@/components/navigation/Header';
import { BottomNav } from '@/components/navigation/BottomNav';
import { wardrobeStore } from '@/lib/storage/wardrobeStore';
import { GarmentCategory } from '@/types';
import { Camera, Upload, Sparkles, Check, RotateCcw, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function AddGarmentPage() {
  const router = useRouter();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<{
    category: GarmentCategory;
    name: string;
    colors: string[];
    pattern: string;
    officeSuitability: number;
    visualSummary: string;
  } | null>(null);

  const [customName, setCustomName] = useState('');
  const [eligibleFormal, setEligibleFormal] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSelectImage = async (url: string) => {
    setImagePreview(url);
    setIsAnalyzing(true);

    try {
      const res = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: url }),
      });

      const json = await res.json();
      if (!res.ok || json.status === 'error') {
        throw new Error(json.error?.message || 'Failed to analyze garment image');
      }

      const analysis = json.data;
      const generatedName = analysis.visual_summary || 'Executive Garment';

      setAiResult({
        category: analysis.category,
        name: generatedName,
        colors: analysis.dominant_colors,
        pattern: analysis.pattern,
        officeSuitability: analysis.office_suitability,
        visualSummary: analysis.visual_summary,
      });

      setCustomName(generatedName);
    } catch (e) {
      console.error('Vision analysis error:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        handleSelectImage(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!imagePreview || !aiResult) return;

    setIsSaving(true);
    setSaveError(null);

    const garmentPayload = {
      category: aiResult.category,
      name: customName || aiResult.name,
      image_url: imagePreview,
      active: true,
      ai_analysis: {
        category: aiResult.category,
        dominant_colors: aiResult.colors,
        secondary_colors: [],
        pattern: aiResult.pattern,
        style: eligibleFormal ? 'executive_formal' : 'smart_casual',
        fit: 'tailored',
        office_suitability: aiResult.officeSuitability,
        visual_summary: aiResult.visualSummary,
        confidence: 0.95,
      },
      analysis_model: 'azure-openai-gpt-4o-mini',
    };

    try {
      // Save directly to Supabase via server API route
      const res = await fetch('/api/garments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(garmentPayload),
      });

      const json = await res.json();

      if (res.ok && json.status === 'success' && json.data?.id) {
        // Mirror to localStorage with the real Supabase UUID
        const savedItem = {
          ...garmentPayload,
          id: json.data.id,
          created_at: json.data.created_at || new Date().toISOString(),
          updated_at: json.data.updated_at || new Date().toISOString(),
          wear_count: 0,
          last_worn_at: null,
        };
        const existing = JSON.parse(localStorage.getItem('cultus_clothing_items') || '[]');
        localStorage.setItem('cultus_clothing_items', JSON.stringify([savedItem, ...existing]));
      } else {
        // Supabase save failed — fall back to localStorage only
        console.warn('Supabase save failed, storing locally only:', json);
        wardrobeStore.addClothingItem(garmentPayload);
      }

      router.push('/wardrobe');
    } catch (e) {
      console.error('Save error:', e);
      // Fall back to localStorage
      wardrobeStore.addClothingItem(garmentPayload);
      router.push('/wardrobe');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRetake = () => {
    setImagePreview(null);
    setAiResult(null);
    setCustomName('');
  };

  return (
    <>
      <Header />

      <main className="flex-1 w-full px-4 pt-4 flex flex-col items-center">
        {/* Top Back Navigation */}
        <div className="w-full flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center gap-1 text-xs font-semibold text-[#1e3a5f] hover:text-[#022448]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs font-semibold text-[#43474e]">Screen 4 • AI Vision Camera</span>
        </div>

        {!imagePreview ? (
          /* Step A: Camera Capture & Upload Surface */
          <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-5 shadow-level-2 flex flex-col items-center text-center backdrop-blur-md">
            <div className="w-16 h-16 rounded-full bg-[#1e3a5f]/10 dark:bg-[#5ce3e6]/10 text-[#1e3a5f] dark:text-[#5ce3e6] flex items-center justify-center mb-3">
              <Camera className="w-8 h-8" />
            </div>

            <h2 className="text-base font-semibold text-[#171c23] dark:text-white">
              Capture Clothing Photograph
            </h2>
            <p className="text-xs text-[#43474e] dark:text-slate-300 mt-1 max-w-xs leading-relaxed">
              Position your garment flat or on a hanger. AI will analyze the actual image attributes for sartorial compatibility.
            </p>

            {/* Custom File Upload Button */}
            <label className="w-full mt-5 py-3.5 px-4 rounded-full bg-[#1e3a5f] dark:bg-[#5ce3e6] text-white dark:text-[#070f1c] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-level-1 hover:bg-[#022448] dark:hover:bg-[#38c9cd] transition-all">
              <Upload className="w-4 h-4" />
              <span>Choose / Take Photo</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          </div>
        ) : (
          /* Step B: Automatic AI Vision Extraction Preview & Metadata Editing */
          <div className="w-full bg-white/85 dark:bg-[#0d1726]/85 border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-5 shadow-level-2 flex flex-col gap-4 animate-fade-in backdrop-blur-md">
            <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-[#f0f2f5] dark:bg-[#0f1c2e] border border-[#e2e6ea] dark:border-[#5ce3e6]/20">
              <Image src={imagePreview} alt="Captured garment" fill className="object-cover" />
              <div className="absolute top-3 left-3 px-3 py-1 rounded-full glass-pill text-xs font-semibold text-[#171c23] dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9e5a44] dark:text-[#5ce3e6]" />
                {isAnalyzing ? 'Analyzing Garment Photography...' : 'AI Vision Extracted'}
              </div>
            </div>

            {isAnalyzing ? (
              <div className="py-6 text-center text-xs text-[#1e3a5f] dark:text-[#5ce3e6] font-semibold animate-pulse flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-[#9e5a44] dark:text-[#5ce3e6] animate-spin" />
                <span>Extracting fabric weave, formality, color palette &amp; cut...</span>
              </div>
            ) : (
              aiResult && (
                <>
                  {/* Image-Authoritative AI Banner */}
                  <div className="bg-[#f0f4fd] dark:bg-[#15253b] p-3 rounded-2xl border border-[#e2e6ea] dark:border-[#5ce3e6]/20 flex items-start gap-2 text-xs">
                    <ShieldCheck className="w-4 h-4 text-[#1e3a5f] dark:text-[#5ce3e6] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-[#43474e] dark:text-slate-300 leading-relaxed">
                      Recommendations analyze garment photographs and do not use filenames or text labels to determine visual compatibility.
                    </p>
                  </div>

                  {/* AI Extracted Attributes */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-[#f8f9fa] dark:bg-[#15253b] rounded-xl border border-[#e2e6ea] dark:border-[#5ce3e6]/20">
                      <span className="text-[10px] text-[#43474e] dark:text-slate-400 block uppercase font-semibold">Category</span>
                      <span className="font-semibold text-[#171c23] dark:text-white capitalize">
                        {aiResult.category.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="p-2.5 bg-[#f8f9fa] dark:bg-[#15253b] rounded-xl border border-[#e2e6ea] dark:border-[#5ce3e6]/20">
                      <span className="text-[10px] text-[#43474e] dark:text-slate-400 block uppercase font-semibold">Formality Rating</span>
                      <span className="font-semibold text-[#9e5a44] dark:text-[#fdaa8f]">
                        {(aiResult.officeSuitability * 10).toFixed(1)} / 10
                      </span>
                    </div>
                  </div>

                  {/* Editable Display Name */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-[#171c23] dark:text-white">
                      Garment Display Name (Editable)
                    </label>
                    <input
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full h-11 px-3.5 bg-[#f8f9fa] dark:bg-[#15253b] border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-xl text-xs text-[#171c23] dark:text-white font-semibold focus:outline-none focus:border-[#1e3a5f] dark:focus:border-[#5ce3e6]"
                    />
                  </div>

                  {/* Formal Meeting Eligibility Toggle */}
                  <div className="flex items-center justify-between p-3 bg-[#f8f9fa] dark:bg-[#15253b] rounded-xl border border-[#e2e6ea] dark:border-[#5ce3e6]/20">
                    <div>
                      <span className="text-xs font-semibold text-[#171c23] dark:text-white block">Formal Meeting Eligible</span>
                      <span className="text-[10px] text-[#43474e] dark:text-slate-400">Allow in executive presentation outfits</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={eligibleFormal}
                      onChange={(e) => setEligibleFormal(e.target.checked)}
                      className="w-5 h-5 rounded text-[#1e3a5f] dark:text-[#5ce3e6] focus:ring-[#1e3a5f]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="w-full py-3 px-4 rounded-full bg-[#1e3a5f] dark:bg-[#5ce3e6] text-white dark:text-[#070f1c] font-semibold text-xs flex items-center justify-center gap-2 shadow-level-1 hover:bg-[#022448] dark:hover:bg-[#38c9cd] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSaving ? <Sparkles className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                      <span>{isSaving ? 'Saving...' : 'Save to Wardrobe'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRetake}
                      className="w-full py-3 px-4 rounded-full border border-[#e2e6ea] dark:border-[#5ce3e6]/30 text-[#43474e] dark:text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#f0f2f5] dark:hover:bg-[#15253b] transition-all"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Retake Photo</span>
                    </button>
                  </div>
                </>
              )
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </>
  );
}

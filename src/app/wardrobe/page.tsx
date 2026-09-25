'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SartorialBackground } from '@/components/background/SartorialBackground';
import { Header } from '@/components/navigation/Header';
import { BottomNav } from '@/components/navigation/BottomNav';
import { ClothingGrid } from '@/components/wardrobe/ClothingGrid';
import { WheelCarousel, type WheelCarouselItem } from '@/components/ui/wheel-carousel';
import { wardrobeStore } from '@/lib/storage/wardrobeStore';
import { ClothingItem } from '@/types';
import { Sparkles, LayoutGrid, X } from 'lucide-react';

/** Derive a short 2–3 word heading from a garment item. */
function garmentHeading(item: ClothingItem): string {
  const ai = item.ai_analysis as unknown as Record<string, unknown> | null | undefined;
  // Use explicit short name from AI analysis if present
  if (ai && typeof ai.short_name === 'string' && ai.short_name.trim()) {
    return ai.short_name.trim();
  }
  // Fall back to formatted category (e.g. "t_shirt" → "T-Shirt")
  if (item.category) {
    return item.category
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  // Last resort: first 3 words of name
  const words = item.name.trim().split(/\s+/).slice(0, 3).join(' ');
  return words || item.name;
}

/** Derive a readable description for the info panel. */
function garmentDescription(item: ClothingItem): string {
  const ai = item.ai_analysis as unknown as Record<string, unknown> | null | undefined;
  if (ai && typeof ai.description === 'string' && ai.description.trim()) {
    return ai.description.trim();
  }
  return item.name || 'No description available.';
}

/** Custom vertical wheel — labels only, no internal photo panel. */
function GarmentWheel({
  items,
  activeIndex,
  onActiveChange,
}: {
  items: ClothingItem[];
  activeIndex: number;
  onActiveChange: (idx: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rotationRef = React.useRef(activeIndex);
  const [rotation, setRotation] = React.useState(activeIndex);
  const frameRef = React.useRef<number | null>(null);
  const dragRef = React.useRef<{ y: number; rot: number } | null>(null);
  const velocityRef = React.useRef(0);

  const SPACING = 38; // px per item - tight vertical spacing
  const VISIBLE = 5;

  const commit = React.useCallback(
    (next: number) => {
      rotationRef.current = next;
      setRotation(next);
      const idx = ((Math.round(next) % items.length) + items.length) % items.length;
      if (idx !== activeIndex) onActiveChange(idx);
    },
    [items.length, activeIndex, onActiveChange],
  );

  const runMomentum = React.useCallback(() => {
    if (frameRef.current !== null) return;
    const tick = () => {
      if (dragRef.current) { frameRef.current = null; return; }
      if (Math.abs(velocityRef.current) > 0.01) {
        commit(rotationRef.current + velocityRef.current);
        velocityRef.current *= 0.88;
        frameRef.current = requestAnimationFrame(tick);
      } else {
        velocityRef.current = 0;
        const target = Math.round(rotationRef.current);
        const delta = target - rotationRef.current;
        if (Math.abs(delta) > 0.002) {
          commit(rotationRef.current + delta * 0.22);
          frameRef.current = requestAnimationFrame(tick);
        } else {
          commit(target);
          frameRef.current = null;
        }
      }
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [commit]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.01;
      commit(rotationRef.current + delta);
      velocityRef.current = delta * 0.25;
      runMomentum();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [commit, runMomentum]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!e.isPrimary) return;
    if (frameRef.current !== null) { cancelAnimationFrame(frameRef.current); frameRef.current = null; }
    velocityRef.current = 0;
    dragRef.current = { y: e.clientY, rot: rotationRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const delta = (dragRef.current.y - e.clientY) * 0.018;
    const next = dragRef.current.rot + delta;
    velocityRef.current = next - rotationRef.current;
    commit(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    runMomentum();
  };

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full flex items-center cursor-grab active:cursor-grabbing select-none overflow-hidden"
      style={{
        perspective: '800px',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 75%, transparent 100%)',
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      {/* Focus marker */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_2px_rgba(59,130,246,0.6)] z-10 pointer-events-none" />

      <div className="absolute inset-0 flex items-center" style={{ transformStyle: 'preserve-3d' }}>
        {items.map((item, i) => {
          let offset = i - rotation;
          // wrap shortest path
          while (offset > items.length / 2) offset -= items.length;
          while (offset < -items.length / 2) offset += items.length;

          if (Math.abs(offset) > VISIBLE + 1) return null;

          const angleRad = offset * 0.22; // ~12.6 deg step along cylinder
          const radius = 220;
          const y = Math.sin(angleRad) * radius;
          const z = (Math.cos(angleRad) - 1) * radius; // curves backward into depth
          const rotateX = -angleRad * (180 / Math.PI) * 0.75; // subtle tilt angle along arc

          const distance = Math.min(Math.abs(offset) / VISIBLE, 1);
          const opacity = Math.cos((distance * Math.PI) / 2);
          const scale = 1 - Math.min(Math.abs(offset) * 0.04, 0.3);
          const isActive = Math.abs(offset) < 0.5;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                velocityRef.current = 0;
                commit(rotationRef.current + offset);
                runMomentum();
              }}
              className="absolute left-8 pointer-events-auto whitespace-nowrap text-left transition-colors duration-150 max-w-[260px] truncate"
              style={{
                transform: `translateY(calc(-50% + ${y}px)) translateZ(${z}px) rotateX(${rotateX}deg) scale(${scale})`,
                transformOrigin: 'left center',
                opacity,
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.35)',
                fontSize: isActive ? '1.15rem' : '0.95rem',
                fontWeight: isActive ? 700 : 500,
                letterSpacing: '-0.02em',
                backfaceVisibility: 'hidden',
              }}
            >
              {garmentHeading(item)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OrbitalGalleryView({
  items,
  onExit,
}: {
  items: ClothingItem[];
  onExit: () => void;
}) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const activeItem = items[activeIndex] ?? items[0];

  return (
    <div className="fixed inset-0 z-[100] bg-[#0a0d13] flex flex-col overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(30,58,95,0.35) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative z-50 flex items-center justify-between px-6 pt-5 pb-3">
        <div className="bg-white/[0.07] border border-white/[0.1] backdrop-blur-xl text-white/55 text-[11px] font-medium px-3.5 py-2 rounded-full tracking-wide select-none">
          {items.length} garment{items.length !== 1 ? 's' : ''}
        </div>
        <div className="text-white/30 text-[10px] font-medium tracking-widest uppercase select-none">
          scroll or drag to explore
        </div>
        <button
          type="button"
          onClick={onExit}
          className="flex items-center gap-1.5 bg-white/[0.07] hover:bg-white/[0.14] border border-white/[0.1] backdrop-blur-xl text-white/70 hover:text-white text-[11px] font-semibold px-3.5 py-2 rounded-full transition-all cursor-pointer"
        >
          <X className="w-3 h-3" />
          Exit Gallery
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center justify-center max-w-5xl mx-auto w-full px-6 pb-24 min-h-0">
        {items.length > 0 ? (
          <div className="flex items-center justify-center gap-10 w-full h-full">
            {/* Left: custom garment name wheel */}
            <div className="w-[300px] sm:w-[340px] h-[440px] relative shrink-0">
              <GarmentWheel
                items={items}
                activeIndex={activeIndex}
                onActiveChange={setActiveIndex}
              />
            </div>

            {/* Right: fixed-size image card + description */}
            <div className="flex flex-col items-start gap-4 w-[320px] shrink-0">
              <div className="relative w-[320px] h-[380px] rounded-2xl overflow-hidden bg-white/[0.04] ring-1 ring-white/10 shadow-2xl">
                {activeItem?.image_url && (
                  <img
                    key={activeItem.id}
                    src={activeItem.image_url}
                    alt={garmentHeading(activeItem)}
                    className="absolute inset-0 w-full h-full object-contain p-3"
                  />
                )}
              </div>
              <div className="w-[320px]">
                <p className="text-white text-base font-bold mb-1 leading-snug">
                  {garmentHeading(activeItem)}
                </p>
                <p className="text-white/55 text-xs leading-relaxed line-clamp-3">
                  {garmentDescription(activeItem)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex items-center justify-center text-white/40 text-sm">
            No garments in your wardrobe yet.
          </div>
        )}
      </div>

      <BottomNav variant="dark" />
    </div>
  );
}



export default function WardrobePage() {

  const router = useRouter();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'orbital'>('grid');
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<ClothingItem | null>(null);

  const loadItems = () => {
    setItems(wardrobeStore.getClothingItems());
  };

  useEffect(() => {
    loadItems();

    const syncWithSupabase = async () => {
      try {
        const res = await fetch('/api/garments');
        const json = await res.json();
        if (!res.ok || json.status !== 'success') return;

        if (Array.isArray(json.data)) {
          const mappedItems: ClothingItem[] = json.data.map((row: any) => ({
            id: row.id,
            category: row.category,
            name: row.name,
            image_url: row.image_url,
            active: row.active ?? true,
            ai_analysis: row.ai_analysis || {},
            analysis_model: row.analysis_model,
            created_at: row.created_at,
            updated_at: row.updated_at,
            wear_count: row.wear_count || 0,
            last_worn_at: row.last_worn_at || null,
          }));
          try {
            localStorage.setItem('cultus_clothing_items', JSON.stringify(mappedItems));
          } catch (storageErr) {
            console.warn('localStorage update notice:', storageErr);
          }
          setItems(mappedItems);
        }
      } catch (e) {
        console.warn('Supabase sync warning:', e);
      }
    };

    syncWithSupabase();
  }, []);

  const confirmDelete = async (item: ClothingItem) => {
    wardrobeStore.deleteClothingItem(item.id);
    if (selectedItem?.id === item.id) setSelectedItem(null);
    setItemToDelete(null);
    loadItems();
    try {
      await fetch(`/api/garments?id=${item.id}`, { method: 'DELETE' });
    } catch (e) {
      console.error('Supabase delete error:', e);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, item: ClothingItem) => {
    e.stopPropagation();
    setItemToDelete(item);
  };

  // --- ORBITAL FULL-SCREEN VIEW ---
  if (viewMode === 'orbital') {
    return <OrbitalGalleryView items={items} onExit={() => setViewMode('grid')} />;
  }

  // --- GRID VIEW ---
  return (
    <SartorialBackground>
      <Header />

      <main className="flex-1 w-full px-4 pt-4 flex flex-col items-center">
        {/* Wardrobe Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-[#171c23]">
              Digital Wardrobe Inventory
            </h2>
            <p className="text-xs text-[#43474e]">
              {items.length} executive garments in active rotation
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-[#e4e8f2] p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${
                viewMode === 'grid' ? 'bg-white text-[#1e3a5f] shadow-sm' : 'text-[#43474e]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('orbital')}
              className="p-1.5 rounded-lg transition-all text-[#43474e]"
              title="Orbital Wheel Gallery"
            >
              <Sparkles className="w-4 h-4 text-[#9e5a44]" />
            </button>
          </div>
        </div>

        <ClothingGrid
          items={items}
          onSelectItem={(item) => setSelectedItem(item)}
          onDeleteItem={handleDeleteClick}
        />
      </main>

      {/* Garment Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#1e232a]/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-sm border border-[#e2e6ea] shadow-level-3 relative flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#9e5a44] uppercase tracking-wider">
                {selectedItem.category.replace('_', ' ')}
              </span>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-xs font-bold text-[#74777f] hover:text-[#171c23]"
              >
                ✕
              </button>
            </div>

            <h3 className="text-sm font-semibold text-[#171c23]">{selectedItem.name}</h3>

            <div className="p-3 bg-[#f8f9fa] rounded-2xl border border-[#e2e6ea] text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#43474e]">Office Suitability:</span>
                <span className="font-semibold text-[#1e3a5f]">
                  {(selectedItem.ai_analysis.office_suitability * 10).toFixed(1)} / 10
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#43474e]">Total Wears:</span>
                <span className="font-semibold text-[#171c23]">{selectedItem.wear_count || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#43474e]">Pattern / Cut:</span>
                <span className="font-semibold text-[#171c23] capitalize">{selectedItem.ai_analysis.pattern}</span>
              </div>
            </div>

            <p className="text-xs text-[#43474e] italic leading-relaxed bg-[#f0f4fd] p-2.5 rounded-xl">
              &ldquo;{selectedItem.ai_analysis.visual_summary}&rdquo;
            </p>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => setItemToDelete(selectedItem)}
                className="px-4 py-2.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-semibold hover:bg-red-100 transition-all flex-1"
              >
                Delete Garment
              </button>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2.5 rounded-full bg-[#1e3a5f] text-white text-xs font-semibold flex-1"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-[#1e232a]/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 w-full max-w-xs border border-[#e2e6ea] shadow-level-3 flex flex-col gap-3 text-center">
            <h3 className="text-sm font-semibold text-[#171c23]">Delete Garment?</h3>
            <p className="text-xs text-[#43474e]">
              Are you sure you want to remove &ldquo;{itemToDelete.name}&rdquo; from your executive wardrobe inventory?
            </p>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2 rounded-full border border-[#e2e6ea] text-xs font-semibold text-[#43474e] hover:bg-[#f0f2f5]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => confirmDelete(itemToDelete)}
                className="flex-1 py-2 rounded-full bg-red-600 text-white text-xs font-semibold hover:bg-red-700 shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </SartorialBackground>
  );
}

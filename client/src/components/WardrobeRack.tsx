import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  ArrowRight, 
  ShieldAlert, 
  CheckCircle2, 
  LayoutGrid, 
  AlignJustify, 
  Search, 
  Plus, 
  Sparkles,
  Eye
} from 'lucide-react';
import { ClothingItem, GarmentCategory } from '../types/clothing';
import { calculateRackPositions, slideStep } from '../utils/rackPhysics';
import { playSound } from '../utils/sound';
import GarmentDetailModal from './GarmentDetailModal';
import InteractiveCard from './InteractiveCard';
import GarmentImage from './GarmentImage';

interface WardrobeRackProps {
  items: ClothingItem[];
  onToggleActive: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEquipItem?: (item: ClothingItem) => void;
  onNavigateToCapture?: () => void;
  initialCategory?: 'all' | GarmentCategory;
}

export default function WardrobeRack({ 
  items, 
  onToggleActive, 
  onDeleteItem,
  onEquipItem,
  onNavigateToCapture,
  initialCategory = 'all'
}: WardrobeRackProps) {
  const [viewMode, setViewMode] = useState<'gallery' | 'rail'>('gallery');
  const [categoryFilter, setCategoryFilter] = useState<'all' | GarmentCategory>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [activeHoverIndex, setActiveHoverIndex] = useState<number>(-1);
  const [inspectedItem, setInspectedItem] = useState<ClothingItem | null>(null);

  const rackRef = useRef<HTMLDivElement>(null);
  const [positions, setPositions] = useState<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const currentPositionsRef = useRef<number[]>([]);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Sync initialCategory when it changes externally
  useEffect(() => {
    if (initialCategory) {
      setCategoryFilter(initialCategory);
    }
  }, [initialCategory]);

  // Filtering by category and search
  const filteredItems = items.filter(item => {
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery = !query || 
      item.name.toLowerCase().includes(query) ||
      (item.color && item.color.toLowerCase().includes(query)) ||
      item.garment_type.toLowerCase().includes(query) ||
      (item.style && item.style.toLowerCase().includes(query));
    return matchesCategory && matchesQuery;
  });

  useEffect(() => {
    if (selectedIndex >= filteredItems.length && filteredItems.length > 0) {
      setSelectedIndex(filteredItems.length - 1);
    }
  }, [filteredItems.length, selectedIndex]);

  const currentActive = activeHoverIndex >= 0 ? activeHoverIndex : selectedIndex;

  const getTargetPositions = useCallback(() => {
    const width = rackRef.current ? rackRef.current.clientWidth : 960;
    const garmentWidth = 320;
    return calculateRackPositions({
      count: filteredItems.length,
      width,
      garmentWidth,
      active: currentActive,
      minimumSpread: 32,
    });
  }, [filteredItems.length, currentActive]);

  useEffect(() => {
    if (viewMode !== 'rail') return;

    const targets = getTargetPositions();
    if (currentPositionsRef.current.length !== filteredItems.length) {
      currentPositionsRef.current = [...targets];
      velocitiesRef.current = new Array(filteredItems.length).fill(0);
      setPositions([...targets]);
      return;
    }

    const animate = (time: number) => {
      const deltaMs = lastTimeRef.current ? Math.min(50, time - lastTimeRef.current) : 16;
      lastTimeRef.current = time;

      let isMoving = false;
      const nextPositions = [...currentPositionsRef.current];

      for (let i = 0; i < filteredItems.length; i++) {
        const target = targets[i] ?? 0;
        const current = nextPositions[i] ?? target;
        const velocity = velocitiesRef.current[i] ?? 0;

        const next = slideStep(current, velocity, target, deltaMs, 22);
        nextPositions[i] = next.position;
        velocitiesRef.current[i] = next.velocity;

        if (Math.abs(next.position - target) > 0.05 || Math.abs(next.velocity) > 0.2) {
          isMoving = true;
        }
      }

      currentPositionsRef.current = nextPositions;
      setPositions([...nextPositions]);

      if (isMoving) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        lastTimeRef.current = 0;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [filteredItems.length, currentActive, getTargetPositions, viewMode]);

  const handleFilterClick = (cat: 'all' | GarmentCategory) => {
    playSound.select();
    setCategoryFilter(cat);
    setSelectedIndex(0);
    setActiveHoverIndex(-1);
  };

  const handlePrev = () => {
    if (selectedIndex > 0) {
      playSound.slide();
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const handleNext = () => {
    if (selectedIndex < filteredItems.length - 1) {
      playSound.slide();
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const currentSelectedItem = filteredItems[selectedIndex];

  return (
    <div className="rack-stage-wrapper">
      {/* Top Controls Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
        <div>
          <span className="editorial-eyebrow">Digital Closet Studio</span>
          <h2 className="editorial-title" style={{ fontSize: '32px', marginBottom: '6px' }}>
            The Wardrobe <em>Catalog</em>
          </h2>
          <p className="editorial-subtitle" style={{ marginBottom: 0, fontSize: '14px' }}>
            {viewMode === 'gallery'
              ? 'Organized floating cutout gallery with instant category filtering and quick-equip styling.'
              : 'Interactive suspension rail with spring physics; hover or click garments to slide neighbors.'}
          </p>
        </div>

        {/* View Mode Toggle (Google Photos Gallery vs Hanging Rail) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="occasion-bar-segmented" style={{ margin: 0, padding: '4px' }}>
            <button 
              className={`occasion-option ${viewMode === 'gallery' ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
              onClick={() => { playSound.tap(); setViewMode('gallery'); }}
            >
              <LayoutGrid size={14} /> Gallery Grid
            </button>
            <button 
              className={`occasion-option ${viewMode === 'rail' ? 'active' : ''}`}
              style={{ padding: '8px 16px', fontSize: '12px', gap: '6px' }}
              onClick={() => { playSound.tap(); setViewMode('rail'); }}
            >
              <AlignJustify size={14} /> Hanging Rail
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="closet-filter-bar">
        {/* Category Pills */}
        <div className="closet-filter-pills">
          {(['all', 'top', 'bottom', 'shoes'] as const).map(cat => {
            const count = cat === 'all' ? items.length : items.filter(i => i.category === cat).length;
            return (
              <button
                key={cat}
                className={`dock-pill ${categoryFilter === cat ? 'active' : ''}`}
                style={{ padding: '7px 16px', fontSize: '12px', textTransform: 'capitalize' }}
                onClick={() => handleFilterClick(cat)}
              >
                {cat === 'all' ? 'All Pieces' : `${cat}s`}
                <span style={{ opacity: 0.75, fontSize: '10px', marginLeft: '4px', fontFamily: 'var(--font-mono)' }}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="closet-search-container">
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }} />
          <input 
            type="text"
            placeholder="Search color, fabric, style..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="closet-search-input"
          />
        </div>
      </div>

      {/* Empty State */}
      {filteredItems.length === 0 ? (
        <div className="pedestal-stage" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <div className="brand-crest" style={{ margin: '0 auto 16px auto', width: '48px', height: '48px' }}>
            <Sparkles size={22} />
          </div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-main)' }}>
            No Garments Found
          </h3>
          <p style={{ fontSize: '14px', maxWidth: '420px', margin: '0 auto 20px auto' }}>
            {searchQuery 
              ? `No clothing items matched "${searchQuery}". Clear your search query to view your collection.`
              : `You have not added any ${categoryFilter === 'all' ? 'clothing items' : categoryFilter + 's'} yet. Digitize a garment to hang it in your closet.`}
          </p>
          {onNavigateToCapture && !searchQuery && (
            <button 
              className="btn-shimmer" 
              onClick={onNavigateToCapture}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={15} /> Digitize New Piece
            </button>
          )}
        </div>
      ) : viewMode === 'gallery' ? (
        /* ====================================================================
           VIEW A: GOOGLE PHOTOS CLOSET EXTRACTION GALLERY GRID
           ==================================================================== */
        <div className="closet-gallery-grid">
          {filteredItems.map((item) => {
            return (
              <div key={item.id} className="gallery-tile-wrapper piece-animating">
                <InteractiveCard 
                  className="gallery-garment-tile"
                  glowColor="var(--gold-glow)" 
                  tiltIntensity={8}
                >
                  {/* Card Header Tags */}
                  <div className="tile-top-bar">
                    <span className="tile-category-tag">
                      {item.category}
                    </span>
                    <button 
                      className={`tile-active-toggle ${item.active ? 'active' : 'blocked'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        playSound.tap();
                        onToggleActive(item.id);
                      }}
                      title={item.active ? 'Active in recommendations' : 'Blocked from recommendations'}
                    >
                      {item.active ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
                      <span>{item.active ? 'Active' : 'Blocked'}</span>
                    </button>
                  </div>

                  {/* Isolated Garment Cutout Image Showcase */}
                  <div 
                    className="tile-image-stage"
                    onClick={() => {
                      playSound.tap();
                      setInspectedItem(item);
                    }}
                  >
                    <div className="tile-ambient-glow" />
                    <GarmentImage 
                      src={item.image_url} 
                      alt={item.name} 
                      category={item.category}
                      className="tile-cutout-img"
                      loading="lazy" 
                    />
                  </div>

                  {/* Item Specs & Actions */}
                  <div className="tile-info">
                    <h4 className="tile-title" title={item.name}>{item.name}</h4>
                    <p className="tile-specs">
                      {[item.garment_type, item.color, item.weave_knit].filter(Boolean).join(' · ')}
                    </p>

                    <div className="tile-actions">
                      {onEquipItem && (
                        <button 
                          className="tile-btn-equip"
                          onClick={() => {
                            playSound.select();
                            onEquipItem(item);
                          }}
                        >
                          <Sparkles size={12} /> Equip to Atelier
                        </button>
                      )}
                      <button 
                        className="tile-btn-inspect"
                        onClick={() => {
                          playSound.tap();
                          setInspectedItem(item);
                        }}
                        title="Inspect tailoring & attributes"
                      >
                        <Eye size={13} />
                      </button>
                    </div>
                  </div>
                </InteractiveCard>
              </div>
            );
          })}
        </div>
      ) : (
        /* ====================================================================
           VIEW B: METALLIC SUSPENSION RAIL (PHYSICAL SLIDING STAGE)
           ==================================================================== */
        <>
          <div 
            className="rack" 
            ref={rackRef}
            onMouseLeave={() => setActiveHoverIndex(-1)}
          >
            {/* Dynamic tracking spotlight beam */}
            <div 
              className="rack-spotlight-beam"
              style={{ left: `${positions[currentActive] ?? 450}px` }}
              aria-hidden="true"
            />

            {/* Illuminated glass floor reflection */}
            <div className="rack-floor-reflection" aria-hidden="true" />

            {/* Precision Metallic Rail */}
            <div className="rail" aria-hidden="true" />

            {/* Suspended Garments */}
            <div className="rack-items">
              {filteredItems.map((item, index) => {
                const posX = positions[index] ?? 0;
                const isFocused = currentActive === index;

                return (
                  <div
                    key={item.id}
                    className={`rack-garment ${isFocused ? 'active' : ''}`}
                    style={{
                      left: `${posX}px`,
                      zIndex: isFocused ? 10 : 2,
                    }}
                    onMouseEnter={() => {
                      if (activeHoverIndex !== index) {
                        playSound.slide();
                      }
                      setActiveHoverIndex(index);
                      setSelectedIndex(index);
                    }}
                    onClick={() => {
                      playSound.tap();
                      setSelectedIndex(index);
                      setInspectedItem(item);
                    }}
                  >
                    {/* Metal Suspension Apex Wire and Hanger Hook */}
                    <div className="wire">
                      <div className="hanger-hook" />
                    </div>

                    {/* Garment Image on Hanger */}
                    <div className="garment-wrapper">
                      <GarmentImage 
                        src={item.image_url} 
                        alt={item.name} 
                        category={item.category}
                        className="garment-img"
                        loading="eager"
                      />
                      {!item.active && (
                        <div className="blocked-overlay" title="Blocked from recommendations">
                          <ShieldAlert size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rail Collection Control Bar */}
          {currentSelectedItem && (
            <div className="collection-bar">
              <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                <span className="selected-index">
                  {String(selectedIndex + 1).padStart(2, '0')} / {String(filteredItems.length).padStart(2, '0')}
                </span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 className="selected-title">{currentSelectedItem.name}</h3>
                    {currentSelectedItem.active ? (
                      <span className="pedestal-tag" style={{ color: 'var(--success)', background: 'rgba(34, 197, 94, 0.12)' }}>
                        <CheckCircle2 size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Active
                      </span>
                    ) : (
                      <span className="pedestal-tag" style={{ color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.12)' }}>
                        <ShieldAlert size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} /> Blocked
                      </span>
                    )}
                  </div>
                  <p className="selected-type">
                    {[currentSelectedItem.garment_type, currentSelectedItem.color, currentSelectedItem.style].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>

              <div className="browse-controls">
                <button 
                  className="arrow-btn" 
                  onClick={handlePrev} 
                  disabled={selectedIndex === 0}
                  aria-label="Previous garment"
                >
                  <ArrowLeft size={16} />
                </button>
                <button 
                  className="arrow-btn" 
                  onClick={handleNext} 
                  disabled={selectedIndex === filteredItems.length - 1}
                  aria-label="Next garment"
                >
                  <ArrowRight size={16} />
                </button>
                {onEquipItem && (
                  <button 
                    className="btn-shimmer" 
                    onClick={() => {
                      playSound.select();
                      onEquipItem(currentSelectedItem);
                    }}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    <Sparkles size={13} /> Equip to Atelier
                  </button>
                )}
                <button 
                  className="dock-pill" 
                  onClick={() => {
                    playSound.tap();
                    setInspectedItem(currentSelectedItem);
                  }}
                  style={{ border: '1px solid var(--border-medium)', padding: '8px 16px' }}
                >
                  Inspect Piece
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Garment Spec Inspection Modal */}
      <GarmentDetailModal
        item={inspectedItem}
        onClose={() => setInspectedItem(null)}
        onToggleActive={onToggleActive}
        onDelete={onDeleteItem}
        onEquipItem={onEquipItem}
      />
    </div>
  );
}

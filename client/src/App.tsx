import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Upload,
  Layers,
  Settings as SettingsIcon,
  Sun,
  Moon,
  Briefcase,
  Coffee,
  Camera,
  Volume2,
  VolumeX,
  Wand2,
  Check,
  Palette,
  Shuffle,
  Sliders,
  RefreshCw,
  Plus,
  AlertCircle,
  ArrowRight,
  Shirt,
  Scissors,
  Footprints,
  Crosshair,
  Cpu,
  Menu,
  X
} from 'lucide-react';
import WardrobeRack from './components/WardrobeRack';
import InteractiveCard from './components/InteractiveCard';
import GarmentImage from './components/GarmentImage';
import { ClothingItem, GarmentCategory } from './types/clothing';
import { playSound, isSoundEnabled, setSoundEnabled } from './utils/sound';

type TabType = 'atelier' | 'capture' | 'wardrobe' | 'settings';
type OccasionType = 'casual' | 'office';

const RENDER_BACKEND = 'https://clutus-server.onrender.com';

function getApiBase(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.startsWith('http')) {
    return envUrl;
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    // localhost / 127.0.0.1 => local dev
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:5000';
    }
    // Local Wi-Fi mobile (192.168.x.x, 10.x.x.x)
    if (host.startsWith('192.168.') || host.startsWith('10.')) {
      return `http://${host}:5000`;
    }
    // Everything else (vercel.app, custom domains, preview) => Render
    return RENDER_BACKEND;
  }
  // SSR / unknown => Render
  return RENDER_BACKEND;
}

const API_BASE = getApiBase().replace(/\/+$/, '');




export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('clutus_theme') as 'light' | 'dark') || 'dark';
  });

  const [soundOn, setSoundOn] = useState<boolean>(() => isSoundEnabled());
  const [activeTab, setActiveTab] = useState<TabType>('atelier');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [selectedOccasion, setSelectedOccasion] = useState<OccasionType>('casual');
  const [wardrobeCategoryFilter, setWardrobeCategoryFilter] = useState<'all' | GarmentCategory>('all');
  const [garments, setGarments] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Active outfit slots
  const [curatedTop, setCuratedTop] = useState<ClothingItem | null>(null);
  const [curatedBottom, setCuratedBottom] = useState<ClothingItem | null>(null);
  const [curatedShoes, setCuratedShoes] = useState<ClothingItem | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState<boolean>(false);
  const [generationKey, setGenerationKey] = useState<number>(1);

  // Real Ingestion State & Progress Telemetry
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [newlyAddedGarment, setNewlyAddedGarment] = useState<ClothingItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch garments from the backend
  const loadGarments = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_BASE}/api/garments`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      const loaded: ClothingItem[] = data.garments || [];
      setGarments(loaded);
      generateOutfit(selectedOccasion, loaded);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown connection error';
      console.error('Error fetching garments from server:', msg);
      setFetchError('Unable to connect to Clutus server. The backend on Render may be waking up from sleep; click Retry.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadGarments();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('clutus_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    playSound.tap();
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
    if (next) playSound.tap();
  };

  const handleTabChange = (tab: TabType) => {
    playSound.tap();
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
    if (tab !== 'wardrobe') {
      setWardrobeCategoryFilter('all');
    }
  };

  const handleOpenWardrobeWithCategory = (cat: GarmentCategory) => {
    playSound.select();
    setWardrobeCategoryFilter(cat);
    setActiveTab('wardrobe');
    setIsMobileMenuOpen(false);
  };

  const handleOccasionChange = (occ: OccasionType) => {
    playSound.select();
    setSelectedOccasion(occ);
    generateOutfit(occ, garments);
  };

  // Direct Equip Handler from Wardrobe Gallery to Outfit
  const handleEquipItem = (item: ClothingItem) => {
    playSound.select();
    if (item.category === 'top') {
      setCuratedTop(item);
    } else if (item.category === 'bottom') {
      setCuratedBottom(item);
    } else if (item.category === 'shoes') {
      setCuratedShoes(item);
    }
    setGenerationKey(prev => prev + 1);
    setActiveTab('atelier');
  };

  const generateOutfit = (occasion: OccasionType, catalog: ClothingItem[]) => {
    if (catalog.length === 0) {
      setCuratedTop(null);
      setCuratedBottom(null);
      setCuratedShoes(null);
      return;
    }

    setIsSynthesizing(true);

    // Filter active pieces
    const activeItems = catalog.filter(item => item.active);
    const tops = activeItems.filter(item => item.category === 'top');
    const bottoms = activeItems.filter(item => item.category === 'bottom');
    const shoes = activeItems.filter(item => item.category === 'shoes');

    // Filter by occasion affinity
    const occasionTops = tops.filter(item =>
      occasion === 'office' ? (item.office_suitability ?? 0) >= 0.5 : (item.office_suitability ?? 0) <= 0.7
    );
    const occasionBottoms = bottoms.filter(item =>
      occasion === 'office' ? (item.office_suitability ?? 0) >= 0.6 : (item.office_suitability ?? 0) <= 0.8
    );
    const occasionShoes = shoes.filter(item =>
      occasion === 'office' ? (item.office_suitability ?? 0) >= 0.6 : (item.office_suitability ?? 0) <= 0.85
    );

    const pickRandom = (arr: ClothingItem[], fallback: ClothingItem[]) => {
      const pool = arr.length > 0 ? arr : fallback;
      return pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    };

    setTimeout(() => {
      setCuratedTop(pickRandom(occasionTops, tops));
      setCuratedBottom(pickRandom(occasionBottoms, bottoms));
      setCuratedShoes(pickRandom(occasionShoes, shoes));
      setGenerationKey(prev => prev + 1);
      setIsSynthesizing(false);
      playSound.success();
    }, 450);
  };

  // Real Image Upload Handler with Telemetry Steps
  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    playSound.tap();
    setIsUploading(true);
    setUploadStep(1); // Step 1: Uploading
    setUploadError(null);
    setNewlyAddedGarment(null);

    const stepInterval = setInterval(() => {
      setUploadStep(curr => (curr < 3 ? curr + 1 : curr));
    }, 1200);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await fetch(`${API_BASE}/api/garments/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      setUploadStep(4); // Step 4: Done
      setNewlyAddedGarment(data.garment);
      playSound.success();

      // Refresh entire wardrobe list from Supabase
      await loadGarments();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to upload and analyze image';
      console.error('Ingestion error:', msg);
      setUploadError(msg);
    } finally {
      clearInterval(stepInterval);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileProcess(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleToggleActive = async (id: string) => {
    const currentItem = garments.find(item => item.id === id);
    if (!currentItem) return;
    const nextActive = !currentItem.active;

    // Optimistic local update
    setGarments(prev =>
      prev.map(item => (item.id === id ? { ...item, active: nextActive } : item))
    );

    try {
      await fetch(`${API_BASE}/api/garments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: nextActive }),
      });
    } catch (err) {
      console.error('Failed to sync active status to backend:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    // Optimistic local update
    setGarments(prev => prev.filter(item => item.id !== id));

    try {
      await fetch(`${API_BASE}/api/garments/${id}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.error('Failed to delete garment on backend:', err);
    }
  };

  // Dynamic Outfit Evaluation Calculation
  const outfitPieces = [curatedTop, curatedBottom, curatedShoes].filter(Boolean) as ClothingItem[];
  const isEnsembleComplete = Boolean(curatedTop && curatedBottom && curatedShoes);

  let dynamicHarmonyScore = '--';
  let dynamicColorAffinity = 'Awaiting Pieces';
  let dynamicStylistCritique = '';

  if (outfitPieces.length === 0) {
    dynamicStylistCritique = 'No active garments currently selected. Digitize pieces or activate items in the Showroom Rail to generate a look.';
  } else if (!isEnsembleComplete) {
    const missing: string[] = [];
    if (!curatedTop) missing.push('tops');
    if (!curatedBottom) missing.push('bottoms');
    if (!curatedShoes) missing.push('shoes');

    dynamicStylistCritique = `Incomplete ensemble: Wardrobe is currently missing active ${missing.join(' and ')}. Equip pieces from the Wardrobe Gallery or Digitize Piece tab to calculate complete silhouette harmony.`;
    dynamicColorAffinity = `${outfitPieces.length} of 3 Selected`;
  } else {
    // 3 pieces present: Compute dynamic metrics from actual garment properties
    const topSuitability = curatedTop?.office_suitability ?? 0.6;
    const bottomSuitability = curatedBottom?.office_suitability ?? 0.6;
    const shoesSuitability = curatedShoes?.office_suitability ?? 0.6;
    const avgSuitability = (topSuitability + bottomSuitability + shoesSuitability) / 3;
    const scoreVal = Math.round(avgSuitability * 100);
    dynamicHarmonyScore = `${scoreVal}%`;

    const colors = outfitPieces.map(p => p.color?.toLowerCase()).filter(Boolean);
    const uniqueColors = new Set(colors);
    if (uniqueColors.size === 1) {
      dynamicColorAffinity = 'Monochromatic Palette';
    } else if (uniqueColors.size === 2) {
      dynamicColorAffinity = 'Dual-Tone Synergy';
    } else {
      dynamicColorAffinity = 'Harmonious Triad';
    }

    if (selectedOccasion === 'office') {
      dynamicStylistCritique = `Executive composition pairing the ${curatedTop?.color || ''} ${curatedTop?.name} with ${curatedBottom?.color || ''} ${curatedBottom?.name} and ${curatedShoes?.name}. Tailored for professional environments with an office affinity of ${scoreVal}%.`;
    } else {
      dynamicStylistCritique = `Effortless studio silhouette coordinating ${curatedTop?.name} alongside ${curatedBottom?.name} and ${curatedShoes?.name}. Balanced drape and natural proportion for everyday casual wear.`;
    }
  }

  return (
    <div className="atelier-container">
      {/* Hidden File Input for Real Ingestion */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* Header with Floating Glass Dock & Mobile Hamburger */}
      <header className="atelier-header">
        <a href="#atelier" className="brand-badge" onClick={() => handleTabChange('atelier')}>
          <div className="brand-crest">
            <Sparkles size={20} className="crest-star" />
          </div>
          <div className="brand-text">
            <h1>Clutus<span className="brand-dot">.</span></h1>
            <span>AI Atelier</span>
          </div>
        </a>

        {/* Central Floating Pill Dock (Desktop / Tablet) */}
        <nav className="floating-dock desktop-floating-dock">
          <button
            className={`dock-pill ${activeTab === 'atelier' ? 'active' : ''}`}
            onClick={() => handleTabChange('atelier')}
          >
            <Sparkles size={15} />
            The Atelier
          </button>
          <button
            className={`dock-pill ${activeTab === 'wardrobe' ? 'active' : ''}`}
            onClick={() => handleTabChange('wardrobe')}
          >
            <Layers size={15} />
            Showroom {garments.length > 0 && `(${garments.length})`}
          </button>
          <button
            className={`dock-pill ${activeTab === 'capture' ? 'active' : ''}`}
            onClick={() => handleTabChange('capture')}
          >
            <Camera size={15} />
            Digitize Piece
          </button>
          <button
            className={`dock-pill ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => handleTabChange('settings')}
          >
            <SettingsIcon size={15} />
            Studio
          </button>
        </nav>

        {/* Sensory Audio, Theme Switches & Mobile Hamburger */}
        <div className="header-controls">
          <button
            className="tactile-btn"
            onClick={toggleSound}
            title={soundOn ? 'Mute interaction sounds' : 'Enable interaction sounds'}
            aria-label="Toggle sound feedback"
            style={{ width: soundOn ? '68px' : '42px', gap: '6px' }}
          >
            {soundOn && (
              <span className="soundwave-box">
                <span className="soundwave-bar" />
                <span className="soundwave-bar" />
                <span className="soundwave-bar" />
                <span className="soundwave-bar" />
              </span>
            )}
            {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <button
            className="tactile-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* Mobile Hamburger Toggle Button */}
          <button
            className={`tactile-btn mobile-hamburger-btn ${isMobileMenuOpen ? 'active' : ''}`}
            onClick={() => {
              playSound.tap();
              setIsMobileMenuOpen(prev => !prev);
            }}
            title="Toggle Navigation Menu"
            aria-label="Toggle mobile navigation menu"
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {/* Mobile Navigation Drawer Overlay */}
        {isMobileMenuOpen && (
          <div className="mobile-nav-overlay" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="mobile-nav-drawer" onClick={e => e.stopPropagation()}>
              <div className="mobile-nav-header">
                <span className="editorial-eyebrow" style={{ margin: 0 }}>Navigation Menu</span>
                <button
                  className="arrow-btn"
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ width: '32px', height: '32px' }}
                  aria-label="Close menu"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="mobile-nav-links">
                <button
                  className={`mobile-nav-item ${activeTab === 'atelier' ? 'active' : ''}`}
                  onClick={() => handleTabChange('atelier')}
                >
                  <div className="mobile-nav-icon-ring">
                    <Sparkles size={18} />
                  </div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">The Atelier</span>
                    <span className="mobile-nav-desc">Curated multi-garment outfit engine</span>
                  </div>
                </button>

                <button
                  className={`mobile-nav-item ${activeTab === 'wardrobe' ? 'active' : ''}`}
                  onClick={() => handleTabChange('wardrobe')}
                >
                  <div className="mobile-nav-icon-ring">
                    <Layers size={18} />
                  </div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">
                      Showroom Catalog {garments.length > 0 && `(${garments.length})`}
                    </span>
                    <span className="mobile-nav-desc">Digital closet grid & suspension rail</span>
                  </div>
                </button>

                <button
                  className={`mobile-nav-item ${activeTab === 'capture' ? 'active' : ''}`}
                  onClick={() => handleTabChange('capture')}
                >
                  <div className="mobile-nav-icon-ring">
                    <Camera size={18} />
                  </div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">Digitize Piece</span>
                    <span className="mobile-nav-desc">Multimodal AI garment attribute scanner</span>
                  </div>
                </button>

                <button
                  className={`mobile-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                  onClick={() => handleTabChange('settings')}
                >
                  <div className="mobile-nav-icon-ring">
                    <SettingsIcon size={18} />
                  </div>
                  <div className="mobile-nav-text">
                    <span className="mobile-nav-title">Studio Settings</span>
                    <span className="mobile-nav-desc">Sensory audio feedback & atmosphere</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main>
        {/* Connection Notice / Error */}
        {fetchError && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            marginBottom: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '13px',
            color: '#ef4444'
          }}>
            <span>{fetchError}</span>
            <button
              onClick={loadGarments}
              className="tactile-btn"
              style={{ width: 'auto', padding: '6px 14px', fontSize: '12px' }}
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* ====================================================================
            VIEW 1: THE ATELIER (Outfit Recommendations)
            ==================================================================== */}
        {activeTab === 'atelier' && (
          <section>
            <span className="editorial-eyebrow">Harmonious Silhouette Engine</span>
            <h2 className="editorial-title">
              The Curated <em>Look</em>
            </h2>
            <p className="editorial-subtitle">
              Intelligent multi-garment coordination balancing color palette, silhouette proportion, and formality.
            </p>

            {/* Occasion Dial (Segmented Sliding Pill) */}
            <div className="occasion-bar-segmented">
              <div
                className="occasion-slider-indicator"
                style={{
                  left: selectedOccasion === 'casual' ? '5px' : 'calc(50% + 2px)',
                  width: 'calc(50% - 7px)',
                }}
              />
              <button
                className={`occasion-option ${selectedOccasion === 'casual' ? 'active' : ''}`}
                onClick={() => handleOccasionChange('casual')}
              >
                <Coffee size={16} />
                Casual Studio
              </button>
              <button
                className={`occasion-option ${selectedOccasion === 'office' ? 'active' : ''}`}
                onClick={() => handleOccasionChange('office')}
              >
                <Briefcase size={16} />
                Executive Office
              </button>
            </div>

            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--gold)' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em' }}>
                  ACCESSING CLUTUS VAULT...
                </p>
              </div>
            ) : garments.length === 0 ? (
              <div className="pedestal-stage" style={{ textAlign: 'center', padding: '64px 24px' }}>
                <div className="brand-crest" style={{ margin: '0 auto 20px auto', width: '56px', height: '56px' }}>
                  <Sparkles size={28} className="crest-star" />
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                  Your Digital Atelier is Empty
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px auto' }}>
                  No garments found in your connected wardrobe. Digitize your first tops, bottoms, and shoes to enable automatic AI look coordination.
                </p>
                <button
                  className="btn-shimmer"
                  onClick={() => handleTabChange('capture')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                >
                  <Plus size={16} /> Digitize First Piece
                </button>
              </div>
            ) : (
              /* Pedestal Stage (Top + Bottom + Shoes) */
              <div className="pedestal-stage">
                <div className="stage-glow-spotlight" />
                {isSynthesizing && <div className="scan-beam" />}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2 }}>
                  <span className="pedestal-tag">
                    {selectedOccasion === 'casual' ? 'Weekend & Studio Dress' : 'Professional Tailored Standard'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-faint)', letterSpacing: '0.1em' }}>
                    COMPOSITION: 1 TOP · 1 BOTTOM · 1 FOOTWEAR
                  </span>
                </div>

                {/* 3-Column Pedestal Triplet with InteractiveCard 3D Spring Tilt */}
                <div className="triplet-grid">
                  {/* 1. TOP */}
                  <div key={`top-${generationKey}`} className="pedestal-slot-wrapper piece-animating stagger-1">
                    {curatedTop ? (
                      <InteractiveCard className="pedestal-card" glowColor="var(--gold-glow)" tiltIntensity={7}>
                        <span className="pedestal-tag">01 · Upper Body</span>
                        <div className="pedestal-showcase">
                          <div className="pedestal-base" />
                          <GarmentImage
                            src={curatedTop.image_url}
                            alt={curatedTop.name}
                            category={curatedTop.category}
                            className="pedestal-img"
                          />
                        </div>
                        <div className="pedestal-info">
                          <h4 className="pedestal-name">{curatedTop.name}</h4>
                          <p className="pedestal-spec">
                            {[curatedTop.garment_type, curatedTop.color, curatedTop.style].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </InteractiveCard>
                    ) : (
                      <div
                        className="empty-pedestal-slot"
                        onClick={() => handleOpenWardrobeWithCategory('top')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="empty-slot-icon-ring">
                          <Shirt size={28} />
                        </div>
                        <h4 className="empty-slot-title">01 · Upper Body</h4>
                        <p className="empty-slot-hint">No top currently active in look</p>
                        <button
                          type="button"
                          className="empty-slot-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWardrobeWithCategory('top');
                          }}
                        >
                          <Plus size={13} /> Select from Wardrobe
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. BOTTOM */}
                  <div key={`bottom-${generationKey}`} className="pedestal-slot-wrapper piece-animating stagger-2">
                    {curatedBottom ? (
                      <InteractiveCard className="pedestal-card" glowColor="var(--gold-glow)" tiltIntensity={7}>
                        <span className="pedestal-tag">02 · Lower Body</span>
                        <div className="pedestal-showcase">
                          <div className="pedestal-base" />
                          <GarmentImage
                            src={curatedBottom.image_url}
                            alt={curatedBottom.name}
                            category={curatedBottom.category}
                            className="pedestal-img"
                          />
                        </div>
                        <div className="pedestal-info">
                          <h4 className="pedestal-name">{curatedBottom.name}</h4>
                          <p className="pedestal-spec">
                            {[curatedBottom.garment_type, curatedBottom.color, curatedBottom.style].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </InteractiveCard>
                    ) : (
                      <div
                        className="empty-pedestal-slot"
                        onClick={() => handleOpenWardrobeWithCategory('bottom')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="empty-slot-icon-ring">
                          <Scissors size={26} />
                        </div>
                        <h4 className="empty-slot-title">02 · Lower Body</h4>
                        <p className="empty-slot-hint">No trousers or bottoms selected</p>
                        <button
                          type="button"
                          className="empty-slot-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWardrobeWithCategory('bottom');
                          }}
                        >
                          <Plus size={13} /> Select from Wardrobe
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3. SHOES */}
                  <div key={`shoes-${generationKey}`} className="pedestal-slot-wrapper piece-animating stagger-3">
                    {curatedShoes ? (
                      <InteractiveCard className="pedestal-card" glowColor="var(--gold-glow)" tiltIntensity={7}>
                        <span className="pedestal-tag">03 · Footwear</span>
                        <div className="pedestal-showcase">
                          <div className="pedestal-base" />
                          <GarmentImage
                            src={curatedShoes.image_url}
                            alt={curatedShoes.name}
                            category={curatedShoes.category}
                            className="pedestal-img"
                          />
                        </div>
                        <div className="pedestal-info">
                          <h4 className="pedestal-name">{curatedShoes.name}</h4>
                          <p className="pedestal-spec">
                            {[curatedShoes.garment_type, curatedShoes.color, curatedShoes.style].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </InteractiveCard>
                    ) : (
                      <div
                        className="empty-pedestal-slot"
                        onClick={() => handleOpenWardrobeWithCategory('shoes')}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="empty-slot-icon-ring">
                          <Footprints size={28} />
                        </div>
                        <h4 className="empty-slot-title">03 · Footwear</h4>
                        <p className="empty-slot-hint">No shoes currently active in look</p>
                        <button
                          type="button"
                          className="empty-slot-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenWardrobeWithCategory('shoes');
                          }}
                        >
                          <Plus size={13} /> Select from Wardrobe
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <button
                    className="btn-shimmer"
                    onClick={() => generateOutfit(selectedOccasion, garments)}
                    disabled={isSynthesizing || garments.length === 0}
                    style={{ minWidth: '240px' }}
                  >
                    <Shuffle size={16} className={isSynthesizing ? 'animate-spin' : ''} />
                    {isSynthesizing ? 'Synthesizing Look...' : 'Regenerate Harmonious Look'}
                  </button>
                </div>

                {/* Dynamic AI Stylist Evaluation & Cohesion Metrics */}
                <div className="critique-banner">
                  <div className="critique-copy">
                    <div className="critique-icon">
                      <Wand2 size={18} />
                    </div>
                    <div className="critique-text">
                      <h4>AI Stylist Evaluation</h4>
                      <p>{dynamicStylistCritique}</p>
                    </div>
                  </div>

                  <div className="critique-metrics">
                    <div className="metric-item">
                      <span className="metric-label">Harmony Score</span>
                      <span className="metric-val" style={{ color: 'var(--gold)' }}>
                        {dynamicHarmonyScore}
                      </span>
                    </div>
                    <div className="metric-item">
                      <span className="metric-label">Color Affinity</span>
                      <span className="metric-val" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <Palette size={14} style={{ color: 'var(--accent)' }} /> {dynamicColorAffinity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ====================================================================
            VIEW 2: SHOWROOM (Wardrobe Catalog & Google Photos Gallery)
            ==================================================================== */}
        {activeTab === 'wardrobe' && (
          <section>
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
                <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 12px auto', color: 'var(--gold)' }} />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', letterSpacing: '0.08em' }}>
                  ACCESSING CLUTUS VAULT...
                </p>
              </div>
            ) : (
              <WardrobeRack
                items={garments}
                onToggleActive={handleToggleActive}
                onDeleteItem={handleDeleteItem}
                onEquipItem={handleEquipItem}
                onNavigateToCapture={() => handleTabChange('capture')}
                initialCategory={wardrobeCategoryFilter}
              />
            )}
          </section>
        )}

        {/* ====================================================================
            VIEW 3: DIGITIZE PIECE (Real Multimodal Vision Ingestion)
            ==================================================================== */}
        {activeTab === 'capture' && (
          <section>
            <span className="editorial-eyebrow">Multimodal Vision Pipeline</span>
            <h2 className="editorial-title">
              Digitize <em>Piece</em>
            </h2>
            <p className="editorial-subtitle">
              Upload garment photos directly. OpenAI Vision extracts categories, textures, and formality scores straight into your Supabase database.
            </p>

            <div
              className={`chamber-dropzone ${isDragging ? 'drag-over' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {/* Precision optical viewfinder corner brackets */}
              <div className="viewfinder-corner corner-tl">
                <span className="viewfinder-tick">+</span>
              </div>
              <div className="viewfinder-corner corner-tr">
                <span className="viewfinder-tick">+</span>
              </div>
              <div className="viewfinder-corner corner-bl">
                <span className="viewfinder-tick">+</span>
              </div>
              <div className="viewfinder-corner corner-br">
                <span className="viewfinder-tick">+</span>
              </div>

              {/* Optical HUD Telemetry */}
              <div className="hud-telemetry hud-tl">
                <span>SENSOR // 4K OPTICAL</span>
                <span>FOCAL: 50mm f/1.4</span>
              </div>
              <div className="hud-telemetry hud-tr">
                <span>AI VISION // ACTIVE</span>
                <span>SPECTRAL: 99.4%</span>
              </div>

              {/* High-tech scanning radar background */}
              <div className="radar-grid" />
              <div className="radar-circle" />
              <div className="radar-crosshair-center">
                <Crosshair size={24} style={{ opacity: 0.35, color: 'var(--gold)' }} />
              </div>

              {/* Laser scan beam when uploading */}
              {isUploading && <div className="scan-beam" />}

              <div className="chamber-icon-ring">
                {isUploading ? (
                  <RefreshCw size={32} className="animate-spin" style={{ color: 'var(--gold)' }} />
                ) : (
                  <Upload size={32} />
                )}
              </div>

              <h3 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '8px', position: 'relative', zIndex: 2 }}>
                {isUploading ? 'Analyzing Garment with AI...' : 'Click or Drop Clothing Image Here'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '440px', margin: '0 auto 24px auto', position: 'relative', zIndex: 2 }}>
                {isUploading
                  ? '[ MULTIMODAL VISION EXTRACTING SILHOUETTE · PALETTE · FORMALITY ]'
                  : 'Uploads to Supabase Storage and triggers multimodal Vision AI to detect garment type, fabric, color, and suitability.'}
              </p>

              {/* Real-time Multi-step Ingestion Feedback */}
              {isUploading && (
                <div className="upload-progress-telemetry">
                  <div className="progress-bar-rail">
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${Math.min(100, uploadStep * 25)}%` }}
                    />
                  </div>
                  <div className="progress-steps-label">
                    <Cpu size={14} style={{ color: 'var(--gold)' }} />
                    <span>
                      {uploadStep === 1 && 'Uploading high-res asset to secure vault...'}
                      {uploadStep === 2 && 'Multimodal Vision parsing silhouette & color gamut...'}
                      {uploadStep === 3 && 'Evaluating style, weave & office suitability...'}
                      {uploadStep >= 4 && 'Persisting to wardrobe database...'}
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', position: 'relative', zIndex: 2 }}>
                <button
                  className="btn-shimmer"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  disabled={isUploading}
                >
                  <Upload size={16} /> {isUploading ? 'Uploading & Analyzing...' : 'Select Image File'}
                </button>
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div style={{ marginTop: '20px', color: '#ef4444', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', position: 'relative', zIndex: 2 }}>
                  <AlertCircle size={16} /> {uploadError}
                </div>
              )}

              {/* Newly Extracted Piece Notification */}
              {newlyAddedGarment && (
                <div
                  style={{
                    marginTop: '28px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-medium)',
                    borderRadius: 'var(--radius-md)',
                    padding: '20px',
                    maxWidth: '480px',
                    margin: '28px auto 0 auto',
                    position: 'relative',
                    zIndex: 2,
                    textAlign: 'left'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', borderRadius: '50%', padding: '6px' }}>
                      <Check size={16} />
                    </div>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 600 }}>{newlyAddedGarment.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        Category: <strong style={{ textTransform: 'capitalize', color: 'var(--gold)' }}>{newlyAddedGarment.category}</strong> · {newlyAddedGarment.color} · {newlyAddedGarment.garment_type}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                    <button
                      className="dock-pill active"
                      style={{ fontSize: '12px', padding: '6px 14px', width: 'auto' }}
                      onClick={() => handleEquipItem(newlyAddedGarment)}
                    >
                      <Sparkles size={13} style={{ marginRight: '4px' }} /> Equip to Atelier
                    </button>
                    <button
                      className="dock-pill"
                      style={{ fontSize: '12px', padding: '6px 14px', width: 'auto' }}
                      onClick={() => handleOpenWardrobeWithCategory(newlyAddedGarment.category)}
                    >
                      View in Wardrobe <ArrowRight size={13} style={{ marginLeft: '4px' }} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ====================================================================
            VIEW 4: STUDIO SETTINGS
            ==================================================================== */}
        {activeTab === 'settings' && (
          <section>
            <span className="editorial-eyebrow">Environment & Preferences</span>
            <h2 className="editorial-title">
              Studio <em>Settings</em>
            </h2>
            <p className="editorial-subtitle">
              Customize sensory audio feedback, visual themes, and cloud pipeline credentials.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '820px' }}>
              {/* Appearance & Audio Card */}
              <div className="pedestal-stage" style={{ padding: '32px', marginBottom: 0 }}>
                <h3 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={18} style={{ color: 'var(--gold)' }} /> Atmosphere & Sensory Audio
                </h3>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Tactile Audio Synthesis</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Zero-latency Web Audio API synthesized mechanical clicks and slides
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className={`dock-pill ${soundOn ? 'active' : ''}`}
                      onClick={toggleSound}
                    >
                      {soundOn ? 'Active' : 'Muted'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '20px' }}>
                  <div>
                    <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Visual Atmosphere</h4>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Current aesthetic theme: <span style={{ textTransform: 'capitalize', color: 'var(--gold)' }}>{theme}</span>
                    </p>
                  </div>
                  <button
                    className="tactile-btn"
                    onClick={toggleTheme}
                    style={{ width: 'auto', padding: '8px 16px', gap: '8px', fontSize: '13px' }}
                  >
                    {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                    Toggle to {theme === 'light' ? 'Dark' : 'Light'}
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

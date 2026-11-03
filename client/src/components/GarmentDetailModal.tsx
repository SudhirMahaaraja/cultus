import { useState } from 'react';
import { X, ShieldAlert, CheckCircle2, Trash2, Sparkles } from 'lucide-react';
import { ClothingItem } from '../types/clothing';
import InteractiveCard from './InteractiveCard';
import GarmentImage from './GarmentImage';

interface GarmentDetailModalProps {
  item: ClothingItem | null;
  onClose: () => void;
  onToggleActive: (id: string) => void;
  onDelete: (id: string) => void;
  onEquipItem?: (item: ClothingItem) => void;
}

export default function GarmentDetailModal({
  item,
  onClose,
  onToggleActive,
  onDelete,
  onEquipItem,
}: GarmentDetailModalProps) {
  const [viewSide, setViewSide] = useState<'front' | 'back'>('front');

  if (!item) return null;

  const currentImage = viewSide === 'back' && item.image_back_url ? item.image_back_url : item.image_url;

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="pedestal-tag" style={{ textTransform: 'uppercase', marginBottom: '6px' }}>
              {item.category}
            </span>
            <h3 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.02em' }}>{item.name}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onEquipItem && (
              <button
                className="btn-shimmer"
                style={{ padding: '8px 18px', fontSize: '12px' }}
                onClick={() => {
                  onEquipItem(item);
                  onClose();
                }}
              >
                <Sparkles size={13} /> Equip to Atelier
              </button>
            )}
            <button 
              className="arrow-btn" 
              onClick={onClose} 
              aria-label="Close dialog"
              style={{ width: '38px', height: '38px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* Visual Showcase Stage with Interactive 3D Tilt */}
          <div className="stage-column">
            <InteractiveCard className="inspect-stage" glowColor="var(--gold-glow)" tiltIntensity={8}>
              <GarmentImage 
                src={currentImage} 
                alt={item.name} 
                category={item.category}
                className="stage-img"
              />
            </InteractiveCard>
            {item.image_back_url && (
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '14px' }}>
                <button 
                  className={`dock-pill ${viewSide === 'front' ? 'active' : ''}`}
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                  onClick={() => setViewSide('front')}
                >
                  Front View
                </button>
                <button 
                  className={`dock-pill ${viewSide === 'back' ? 'active' : ''}`}
                  style={{ fontSize: '12px', padding: '6px 16px' }}
                  onClick={() => setViewSide('back')}
                >
                  Back View
                </button>
              </div>
            )}
          </div>

          {/* Metadata & Actions */}
          <div className="details-column">
            <div className="attribute-grid">
              <div className="attribute-row">
                <span className="attr-label">Garment Type</span>
                <span className="attr-val">{item.garment_type}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Color</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {item.color && (
                    <span 
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        background: item.color.toLowerCase(),
                        border: '1px solid var(--border-medium)',
                        display: 'inline-block'
                      }}
                    />
                  )}
                  <span className="attr-val">{item.color || 'Not specified'}</span>
                </div>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Pattern</span>
                <span className="attr-val">{item.pattern || 'Plain'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Weave / Knit</span>
                <span className="attr-val">{item.weave_knit || 'Standard'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Style</span>
                <span className="attr-val">{item.style || 'Casual'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Warmth</span>
                <span className="attr-val">{item.warmth || 'Moderate'}</span>
              </div>
              <div className="attribute-row">
                <span className="attr-label">Office Suitability</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.office_suitability !== undefined && item.office_suitability !== null ? (
                    <>
                      <div style={{ width: '80px', height: '5px', background: 'var(--bg-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            width: `${Math.round(item.office_suitability * 100)}%`, 
                            height: '100%', 
                            background: 'var(--gold)',
                            boxShadow: '0 0 8px var(--gold)'
                          }} 
                        />
                      </div>
                      <span className="attr-val">{Math.round(item.office_suitability * 100)}%</span>
                    </>
                  ) : (
                    <span className="attr-val">N/A</span>
                  )}
                </div>
              </div>
            </div>

            {/* Recommendation Status Controls */}
            <div className="status-control-box" style={{ background: 'var(--bg-subtle)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-light)', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Recommendation Eligibility</h4>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {item.active ? 'Active in outfit recommendations' : 'Blocked from outfit generation'}
                  </p>
                </div>
                <button 
                  className="dock-pill"
                  style={{ 
                    fontSize: '12px', 
                    padding: '8px 16px', 
                    border: '1px solid var(--border-medium)',
                    background: item.active ? 'var(--bg-card)' : 'var(--text-main)',
                    color: item.active ? 'var(--text-main)' : 'var(--bg-canvas)'
                  }}
                  onClick={() => onToggleActive(item.id)}
                >
                  {item.active ? (
                    <><ShieldAlert size={14} style={{ color: 'var(--danger)', marginRight: '4px' }} /> Block Piece</>
                  ) : (
                    <><CheckCircle2 size={14} style={{ color: 'var(--success)', marginRight: '4px' }} /> Enable Piece</>
                  )}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div style={{ marginTop: 'auto', paddingTop: '20px', borderTop: '1px solid var(--border-light)', display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                className="dock-pill"
                style={{ color: 'var(--danger)', border: '1px solid rgba(220, 38, 38, 0.25)', fontSize: '12px', padding: '8px 18px' }}
                onClick={() => {
                  if (window.confirm(`Delete "${item.name}" from your wardrobe?`)) {
                    onDelete(item.id);
                    onClose();
                  }
                }}
              >
                <Trash2 size={13} style={{ marginRight: '4px' }} /> Remove Piece
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

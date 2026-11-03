import React, { useState } from 'react';
import { Shirt, Scissors, Footprints } from 'lucide-react';
import { GarmentCategory } from '../types/clothing';

interface GarmentImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt: string;
  category?: GarmentCategory | string;
  className?: string;
}

export default function GarmentImage({
  src,
  alt,
  category = 'top',
  className = '',
  ...props
}: GarmentImageProps) {
  const [hasError, setHasError] = useState(false);

  const getCategoryIcon = () => {
    switch (category) {
      case 'bottom':
        return <Scissors size={44} strokeWidth={1.5} />;
      case 'shoes':
        return <Footprints size={44} strokeWidth={1.5} />;
      case 'top':
      default:
        return <Shirt size={44} strokeWidth={1.5} />;
    }
  };

  if (!src || hasError) {
    return (
      <div 
        className={`garment-fallback-stage ${className}`}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '160px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'radial-gradient(circle at 50% 45%, rgba(212, 175, 55, 0.08) 0%, transparent 75%)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--gold)',
          padding: '16px',
          textAlign: 'center',
          userSelect: 'none'
        }}
        aria-label={alt}
      >
        <div 
          style={{
            width: '74px',
            height: '74px',
            borderRadius: '50%',
            background: 'var(--bg-subtle)',
            border: '1.5px solid var(--border-medium)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25), 0 0 16px var(--gold-glow)',
            marginBottom: '10px'
          }}
        >
          {getCategoryIcon()}
        </div>
        <span 
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)'
          }}
        >
          {alt || `${category} piece`}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

import React, { useRef, useState, useCallback } from 'react';

interface InteractiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  tiltIntensity?: number;
}

/**
 * InteractiveCard - Direct implementation of UI Skills (better-ui) principles:
 * 1. Specular cursor-tracking radial highlight.
 * 2. Subtle 3D perspective spring tilt on mouse move.
 * 3. Multi-layer elevation shadow.
 */
export default function InteractiveCard({
  children,
  className = '',
  glowColor = 'rgba(212, 175, 55, 0.15)',
  tiltIntensity = 6,
  ...props
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const xPercent = (x / rect.width) * 100;
    const yPercent = (y / rect.height) * 100;
    setMousePos({ x: xPercent, y: yPercent });

    // Calculate subtle 3D tilt angles
    const tiltX = ((y / rect.height) - 0.5) * -tiltIntensity;
    const tiltY = ((x / rect.width) - 0.5) * tiltIntensity;
    setTilt({ x: tiltX, y: tiltY });
  }, [tiltIntensity]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
  };

  return (
    <div
      ref={cardRef}
      className={`interactive-tilt-card ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateY(-4px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: isHovered
          ? 'transform 0.1s ease-out, box-shadow 0.2s ease-out'
          : 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease-out',
        position: 'relative',
        overflow: 'hidden',
        ...props.style,
      }}
      {...props}
    >
      {/* Specular Radial Spotlight Layer following cursor */}
      <div
        className="specular-spotlight"
        style={{
          opacity: isHovered ? 1 : 0,
          background: `radial-gradient(circle 280px at ${mousePos.x}% ${mousePos.y}%, ${glowColor}, transparent 70%)`,
        }}
        aria-hidden="true"
      />
      {children}
    </div>
  );
}

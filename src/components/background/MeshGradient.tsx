'use client';

import React from 'react';

export const MeshGradient: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {/* Soft animated gradient blobs evoking warm editorial minimalism */}
      <div className="absolute -top-[20%] -left-[10%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-br from-[#1e3a5f]/10 via-[#dee2ec]/30 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '12s' }} />
      <div className="absolute top-[30%] -right-[15%] w-[50vw] h-[50vw] max-w-[500px] max-h-[500px] rounded-full bg-gradient-to-bl from-[#9e5a44]/8 via-[#e4e8f2]/40 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '15s', animationDelay: '3s' }} />
      <div className="absolute -bottom-[10%] left-[20%] w-[55vw] h-[55vw] max-w-[550px] max-h-[550px] rounded-full bg-gradient-to-tr from-[#5e6954]/6 via-[#f0f4fd]/50 to-transparent blur-3xl animate-pulse" style={{ animationDuration: '18s', animationDelay: '6s' }} />
      
      {/* Subtle fine noise overlay for filmic sartorial texture */}
      <div 
        className="absolute inset-0 opacity-[0.025] mix-blend-overlay" 
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
        }} 
      />
    </div>
  );
};

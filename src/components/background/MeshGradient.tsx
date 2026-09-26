'use client';

import React from 'react';

export const MeshGradient: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`fixed inset-0 overflow-hidden pointer-events-none z-0 ${className}`}>
      {/* Dynamic Animated Sartorial Mesh Orbs - Vibrant & Hardware Accelerated */}
      <div
        className="absolute -top-[15%] -left-[15%] w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-gradient-to-br from-[#5CE3E6]/45 via-[#0F9CC2]/35 to-transparent dark:from-[#5CE3E6]/30 dark:via-[#0F9CC2]/25 blur-2xl"
        style={{
          animation: 'floatOrb1 20s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
      <div
        className="absolute top-[20%] -right-[20%] w-[75vw] h-[75vw] max-w-[750px] max-h-[750px] rounded-full bg-gradient-to-bl from-[#274A78]/40 via-[#1e3a5f]/45 to-transparent dark:from-[#0F9CC2]/35 dark:via-[#15253b]/60 blur-2xl"
        style={{
          animation: 'floatOrb2 25s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
      <div
        className="absolute -bottom-[20%] left-[10%] w-[85vw] h-[85vw] max-w-[850px] max-h-[850px] rounded-full bg-gradient-to-tr from-[#5CE3E6]/40 via-[#274A78]/35 to-transparent dark:from-[#0c3a4a]/60 dark:via-[#5CE3E6]/30 blur-2xl"
        style={{
          animation: 'floatOrb3 22s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
      <div
        className="absolute top-[45%] left-[25%] w-[60vw] h-[60vw] max-w-[600px] max-h-[600px] rounded-full bg-gradient-to-r from-[#fdaa8f]/35 via-[#5CE3E6]/35 to-transparent dark:from-[#0F9CC2]/30 dark:via-[#0c3a4a]/40 blur-2xl"
        style={{
          animation: 'floatOrb4 18s ease-in-out infinite alternate',
          willChange: 'transform',
        }}
      />
    </div>
  );
};

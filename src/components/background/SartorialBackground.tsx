'use client';

import React from 'react';
import { MeshGradient } from './MeshGradient';

export const SartorialBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="relative min-h-screen w-full bg-transparent text-[#171c23] dark:text-[#f8fafc] flex flex-col items-center">
      <MeshGradient />
      <div className="relative z-10 w-full max-w-md sm:max-w-xl md:max-w-2xl lg:max-w-4xl min-h-screen flex flex-col pb-24">
        {children}
      </div>
    </div>
  );
};

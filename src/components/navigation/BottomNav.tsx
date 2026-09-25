'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dock } from '@/components/unlumen-ui/dock';
import { Sparkles, Shirt, Camera, CalendarDays } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: <Sparkles className="w-full h-full" /> },
  { href: '/wardrobe', label: 'Wardrobe', icon: <Shirt className="w-full h-full" /> },
  { href: '/add', label: 'Add Garment', icon: <Camera className="w-full h-full" /> },
  { href: '/history', label: 'History', icon: <CalendarDays className="w-full h-full" /> },
] as const;

export const BottomNav: React.FC<{ variant?: 'light' | 'dark' }> = ({ variant = 'light' }) => {
  const router = useRouter();
  const pathname = usePathname();

  const isDark = variant === 'dark';

  const dockItems = NAV_ITEMS.map((item) => {
    const isActive = pathname === item.href;
    return {
      label: item.label,
      icon: (
        <span
          className={`flex items-center justify-center w-full h-full transition-colors duration-150 ${
            isActive
              ? isDark ? 'text-blue-400' : 'text-[#1e3a5f]'
              : isDark ? 'text-white/40' : 'text-[#74777f]'
          }`}
        >
          {item.icon}
        </span>
      ),
      onClick: () => router.push(item.href),
    };
  });

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pt-2 pointer-events-none"
      style={{
        background: isDark
          ? 'linear-gradient(to top, rgba(10,13,19,0.95) 60%, transparent)'
          : 'linear-gradient(to top, rgba(248,249,255,0.95) 60%, transparent)',
      }}
    >
      {/* Active-state dot indicators row */}
      <div className="pointer-events-auto flex flex-col items-center gap-1.5">
        {/* Active dots strip */}
        <div className="flex items-center gap-[14px] px-3">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.href}
              className="flex justify-center"
              style={{ width: 40 }}
            >
              <span
                className={`block rounded-full transition-all duration-300 ${
                  pathname === item.href
                    ? isDark ? 'w-4 h-1 bg-blue-400' : 'w-4 h-1 bg-[#1e3a5f]'
                    : isDark ? 'w-1 h-1 bg-white/20' : 'w-1 h-1 bg-[#c8cdd6]'
                }`}
              />
            </div>
          ))}
        </div>

        <Dock
          items={dockItems}
          iconSize={46}
          magnification={2}
          distance={110}
          gap={6}
          borderRadius={18}
          springOptions={{ stiffness: 420, damping: 26, mass: 0.45 }}
          className={
            isDark
              ? 'rounded-[26px] px-3 py-2.5 bg-black/60 border-white/10 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.5)] backdrop-blur-2xl'
              : 'rounded-[26px] px-3 py-2.5 bg-white/85 border-[#e2e6ea]/80 shadow-[0_8px_32px_-4px_rgba(30,35,42,0.14),0_2px_8px_-2px_rgba(30,35,42,0.06)] backdrop-blur-2xl'
          }
        />
      </div>
    </nav>
  );
};

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Dock, DockItem } from '@/components/unlumen-ui/dock';
import { Sparkles, Shirt, Camera, CalendarDays, Sun, Moon } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Today', icon: <Sparkles className="w-full h-full" /> },
  { href: '/wardrobe', label: 'Wardrobe', icon: <Shirt className="w-full h-full" /> },
  { href: '/add', label: 'Add Garment', icon: <Camera className="w-full h-full" /> },
  { href: '/history', label: 'History', icon: <CalendarDays className="w-full h-full" /> },
] as const;

export const BottomNav: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  useEffect(() => {
    const isDark =
      document.documentElement.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';
    setIsDarkTheme(isDark);
  }, []);

  const handleToggleTheme = () => {
    const nextDark = !isDarkTheme;
    setIsDarkTheme(nextDark);
    try {
      localStorage.setItem('cultus-theme', nextDark ? 'dark' : 'light');
    } catch {}
    document.documentElement.setAttribute('data-theme', nextDark ? 'dark' : 'light');
    if (nextDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.backgroundColor = '#070f1c';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.backgroundColor = '#EAFBF7';
    }
  };

  const dockItems: DockItem[] = [
    ...NAV_ITEMS.map((item, index) => {
      const isActive = pathname === item.href;
      return {
        label: item.label,
        icon: (
          <span
            className={`flex items-center justify-center w-full h-full rounded-xl transition-all duration-300 ${
              isActive
                ? isDarkTheme
                  ? 'text-[#5ce3e6] bg-[#5ce3e6]/15 shadow-[0_0_12px_rgba(92,227,230,0.35)]'
                  : 'text-[#1e3a5f] bg-[#1e3a5f]/10 shadow-[0_0_10px_rgba(30,58,95,0.15)]'
                : isDarkTheme
                ? 'text-slate-400 hover:text-white'
                : 'text-[#74777f] hover:text-[#171c23]'
            }`}
          >
            {item.icon}
          </span>
        ),
        onClick: () => router.push(item.href),
        separator: index === NAV_ITEMS.length - 1,
      };
    }),
    {
      label: isDarkTheme ? 'Light Theme' : 'Dark Theme',
      icon: (
        <span
          className={`flex items-center justify-center w-full h-full rounded-xl transition-all duration-300 ${
            isDarkTheme
              ? 'text-amber-400 bg-amber-400/15 shadow-[0_0_12px_rgba(251,191,36,0.35)]'
              : 'text-[#1e3a5f] bg-[#1e3a5f]/10 shadow-[0_0_10px_rgba(30,58,95,0.15)]'
          }`}
        >
          {isDarkTheme ? <Sun className="w-full h-full" /> : <Moon className="w-full h-full" />}
        </span>
      ),
      onClick: handleToggleTheme,
    },
  ];

  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pt-3 pointer-events-none bg-gradient-to-t from-[#f8f9ff]/95 via-[#f8f9ff]/70 to-transparent dark:from-[#070f1c]/95 dark:via-[#070f1c]/70 dark:to-transparent"
    >
      {/* Floating Glass Dock Container */}
      <div className="pointer-events-auto flex flex-col items-center gap-2">
        {/* Active-state indicator pills */}
        <div className="flex items-center gap-[14px] px-3">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href;
            return (
              <div key={item.href} className="flex justify-center" style={{ width: 40 }}>
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? isDarkTheme
                        ? 'w-5 h-1 bg-[#5ce3e6] shadow-[0_0_10px_#5ce3e6]'
                        : 'w-5 h-1 bg-[#1e3a5f] shadow-[0_0_8px_rgba(30,58,95,0.4)]'
                      : isDarkTheme
                      ? 'w-1 h-1 bg-white/20'
                      : 'w-1 h-1 bg-[#c8cdd6]'
                  }`}
                />
              </div>
            );
          })}
          <div style={{ width: 48 }} />
        </div>

        <Dock
          items={dockItems}
          iconSize={48}
          magnification={1.7}
          distance={100}
          gap={8}
          borderRadius={22}
          alwaysShowLabels={false}
          springOptions={{ stiffness: 420, damping: 26, mass: 0.45 }}
          className={
            isDarkTheme
              ? 'rounded-[28px] px-3.5 py-2.5 bg-[#0d1726]/90 border-[#5ce3e6]/30 shadow-[0_12px_40px_-4px_rgba(0,0,0,0.7),0_0_20px_rgba(92,227,230,0.1)] backdrop-blur-2xl text-white'
              : 'rounded-[28px] px-3.5 py-2.5 bg-white/85 border-[#e2e6ea] shadow-[0_12px_40px_-4px_rgba(30,35,42,0.16),0_2px_10px_-2px_rgba(30,35,42,0.06)] backdrop-blur-2xl'
          }
        />
      </div>
    </nav>
  );
};

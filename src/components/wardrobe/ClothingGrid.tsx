'use client';

import React, { useState } from 'react';
import { ClothingItem, GarmentCategory } from '@/types';
import { ClothingCard } from './ClothingCard';
import { Filter, Search } from 'lucide-react';

interface ClothingGridProps {
  items: ClothingItem[];
  onSelectItem?: (item: ClothingItem) => void;
  onDeleteItem?: (e: React.MouseEvent, item: ClothingItem) => void;
}

export const ClothingGrid: React.FC<ClothingGridProps> = ({ items, onSelectItem, onDeleteItem }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'formal_shirt', label: 'Formal Shirts' },
    { key: 'tshirt', label: 'T-Shirts' },
    { key: 'formal_pants', label: 'Formal Pants' },
    { key: 'joggers', label: 'Joggers' },
    { key: 'white_sneakers', label: 'White Sneakers' },
  ];

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ai_analysis?.visual_summary?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Search Input */}
      <div className="relative w-full">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#74777f]" />
        <input
          type="text"
          placeholder="Search fabric weave, cut, or garment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-11 pl-10 pr-4 bg-white border border-[#e2e6ea] rounded-xl text-xs text-[#171c23] placeholder-[#74777f] focus:outline-none focus:border-[#1e3a5f] focus:ring-2 focus:ring-[#1e3a5f]/10 shadow-level-1 transition-all"
        />
      </div>

      {/* Category Pills Filter Bar */}
      <div className="w-full flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <Filter className="w-4 h-4 text-[#1e3a5f] shrink-0" />
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#1e3a5f] text-white shadow-sm'
                  : 'bg-[#f0f2f5] text-[#43474e] hover:bg-[#eaeef8]'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Grid of Garment Cards */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredItems.map((item) => (
            <ClothingCard
              key={item.id}
              item={item}
              onClick={() => onSelectItem?.(item)}
              onDelete={onDeleteItem}
            />
          ))}
        </div>
      ) : (
        <div className="w-full py-12 text-center bg-white border border-[#e2e6ea] rounded-2xl">
          <p className="text-xs text-[#43474e] font-medium">No garments found in this category.</p>
        </div>
      )}
    </div>
  );
};

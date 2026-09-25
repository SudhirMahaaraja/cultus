import { ClothingItem, OfficeDay, Outfit, OutfitFeedback } from '@/types';
import { INITIAL_CLOTHING_ITEMS, INITIAL_FEEDBACK, INITIAL_OFFICE_DAYS, INITIAL_PAST_OUTFITS } from './mockSeedData';

const STORAGE_KEYS = {
  CLOTHING: 'cultus_clothing_items',
  OFFICE_DAYS: 'cultus_office_days',
  OUTFITS: 'cultus_outfits',
  FEEDBACK: 'cultus_feedback',
};

// Safe localStorage accessor for SSR compatibility with migration fallback
function getItem<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key) || localStorage.getItem(key.replace('cultus_', 'attire_ai_'));
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
}

// Fire-and-forget Supabase sync (browser only)
function syncToSupabase(endpoint: string, payload: object): void {
  if (typeof window === 'undefined') return;
  fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch((e) => console.warn(`Supabase sync warning [${endpoint}]:`, e));
}

export const wardrobeStore = {
  getClothingItems(): ClothingItem[] {
    return getItem<ClothingItem[]>(STORAGE_KEYS.CLOTHING, []);
  },

  addClothingItem(item: Omit<ClothingItem, 'id' | 'created_at' | 'updated_at'>): ClothingItem {
    const items = this.getClothingItems();
    const newItem: ClothingItem = {
      ...item,
      id: `garment-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      wear_count: item.wear_count || 0,
      last_worn_at: item.last_worn_at || null,
    };
    const updated = [newItem, ...items];
    setItem(STORAGE_KEYS.CLOTHING, updated);
    return newItem;
  },

  updateClothingItem(id: string, updates: Partial<ClothingItem>): ClothingItem | null {
    const items = this.getClothingItems();
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return null;

    items[idx] = {
      ...items[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    setItem(STORAGE_KEYS.CLOTHING, items);
    return items[idx];
  },

  deleteClothingItem(id: string): void {
    const items = this.getClothingItems().filter((item) => item.id !== id);
    setItem(STORAGE_KEYS.CLOTHING, items);
  },

  getOfficeDays(): OfficeDay[] {
    return getItem<OfficeDay[]>(STORAGE_KEYS.OFFICE_DAYS, INITIAL_OFFICE_DAYS);
  },

  setTodayOfficeDay(meetingStatus: 'yes' | 'no', meetingType?: 'formal' | 'regular'): OfficeDay {
    const today = new Date().toISOString().split('T')[0];
    const days = this.getOfficeDays();
    const idx = days.findIndex((d) => d.date === today);

    let updatedDay: OfficeDay;

    if (idx >= 0) {
      days[idx] = {
        ...days[idx],
        meeting_status: meetingStatus,
        meeting_type: meetingType || (meetingStatus === 'yes' ? 'formal' : 'regular'),
        updated_at: new Date().toISOString(),
      };
      setItem(STORAGE_KEYS.OFFICE_DAYS, days);
      updatedDay = days[idx];
    } else {
      const newDay: OfficeDay = {
        id: `od-${Date.now()}`,
        date: today,
        is_office_day: true,
        meeting_status: meetingStatus,
        meeting_type: meetingType || (meetingStatus === 'yes' ? 'formal' : 'regular'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newDay, ...days];
      setItem(STORAGE_KEYS.OFFICE_DAYS, updated);
      updatedDay = newDay;
    }

    // Sync to Supabase
    syncToSupabase('/api/office-days', {
      date: today,
      is_office_day: true,
      meeting_status: meetingStatus,
      meeting_type: meetingType || (meetingStatus === 'yes' ? 'formal' : 'regular'),
    });

    return updatedDay;
  },

  getOutfits(): Outfit[] {
    return getItem<Outfit[]>(STORAGE_KEYS.OUTFITS, INITIAL_PAST_OUTFITS);
  },

  getFeedback(): OutfitFeedback[] {
    return getItem<OutfitFeedback[]>(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
  },

  recordDontSuggest(shirtId: string, bottomId: string, footwearId: string, reason?: string): OutfitFeedback {
    const feedbacks = this.getFeedback();
    const newFeedback: OutfitFeedback = {
      id: `fb-${Date.now()}`,
      shirt_id: shirtId,
      bottom_id: bottomId,
      footwear_id: footwearId,
      feedback_type: 'dont_suggest',
      reason: reason || "User requested Don't Suggest This on daily recommendation screen",
      created_at: new Date().toISOString(),
    };
    const updated = [newFeedback, ...feedbacks];
    setItem(STORAGE_KEYS.FEEDBACK, updated);

    // Sync to Supabase (skipped silently if IDs are not UUIDs)
    syncToSupabase('/api/feedback', {
      shirt_id: shirtId,
      bottom_id: bottomId,
      footwear_id: footwearId,
      feedback_type: 'dont_suggest',
      reason: newFeedback.reason,
    });

    return newFeedback;
  },

  restoreFeedback(id: string): void {
    const feedbacks = this.getFeedback().filter((f) => f.id !== id);
    setItem(STORAGE_KEYS.FEEDBACK, feedbacks);
  },

  confirmOutfitWorn(shirtId: string, bottomId: string, footwearId: string, meetingStatus: 'yes' | 'no', aiReason?: string): Outfit {
    const today = new Date().toISOString().split('T')[0];
    const outfits = this.getOutfits();
    const newOutfit: Outfit = {
      id: `outfit-${Date.now()}`,
      shirt_id: shirtId,
      bottom_id: bottomId,
      footwear_id: footwearId,
      meeting_status: meetingStatus,
      status: 'confirmed',
      worn_on: today,
      source: 'ai_recommendation',
      ai_reason: aiReason,
      created_at: new Date().toISOString(),
    };

    setItem(STORAGE_KEYS.OUTFITS, [newOutfit, ...outfits]);

    // Update item wear timestamps & counts in localStorage
    [shirtId, bottomId, footwearId].forEach((itemId) => {
      const item = this.getClothingItems().find((i) => i.id === itemId);
      if (item) {
        this.updateClothingItem(itemId, {
          wear_count: (item.wear_count || 0) + 1,
          last_worn_at: today,
        });
      }
    });

    // Update office day confirmed_outfit_id in localStorage
    const days = this.getOfficeDays();
    const idx = days.findIndex((d) => d.date === today);
    if (idx >= 0) {
      days[idx].confirmed_outfit_id = newOutfit.id;
      setItem(STORAGE_KEYS.OFFICE_DAYS, days);
    } else {
      this.setTodayOfficeDay(meetingStatus);
    }

    // Sync outfit to Supabase (skipped silently if IDs are not UUIDs)
    syncToSupabase('/api/outfits', {
      shirt_id: shirtId,
      bottom_id: bottomId,
      footwear_id: footwearId,
      meeting_status: meetingStatus,
      status: 'confirmed',
      worn_on: today,
      source: 'ai_recommendation',
      ai_reason: aiReason || null,
    });

    // Sync office day to Supabase
    syncToSupabase('/api/office-days', {
      date: today,
      is_office_day: true,
      meeting_status: meetingStatus,
      meeting_type: meetingStatus === 'yes' ? 'formal' : 'regular',
    });

    return newOutfit;
  },

  resetToDefaults(): void {
    setItem(STORAGE_KEYS.CLOTHING, INITIAL_CLOTHING_ITEMS);
    setItem(STORAGE_KEYS.OFFICE_DAYS, INITIAL_OFFICE_DAYS);
    setItem(STORAGE_KEYS.OUTFITS, INITIAL_PAST_OUTFITS);
    setItem(STORAGE_KEYS.FEEDBACK, INITIAL_FEEDBACK);
  },
};

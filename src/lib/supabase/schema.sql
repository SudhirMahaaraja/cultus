-- Cultus Supabase Postgres Database Migration Schema
-- Modern Sartorial Vision Office Outfit Assistant

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CLOTHING ITEMS TABLE
CREATE TABLE IF NOT EXISTS public.clothing_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('formal_shirt', 'tshirt', 'formal_pants', 'joggers', 'white_sneakers')),
    name TEXT NOT NULL,
    image_path TEXT,
    image_url TEXT NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    ai_analysis JSONB DEFAULT '{}'::jsonb,
    analysis_model TEXT DEFAULT 'gemma-2-vision',
    analysis_version TEXT DEFAULT 'v1',
    wear_count INT DEFAULT 0,
    last_worn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. OFFICE DAYS TABLE
CREATE TABLE IF NOT EXISTS public.office_days (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_office_day BOOLEAN DEFAULT TRUE,
    meeting_status TEXT CHECK (meeting_status IN ('yes', 'no')),
    meeting_type TEXT CHECK (meeting_type IN ('formal', 'regular')),
    meeting_notes TEXT,
    selected_outfit_id UUID,
    confirmed_outfit_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- 3. OUTFITS TABLE
CREATE TABLE IF NOT EXISTS public.outfits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    shirt_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    bottom_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    footwear_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    meeting_status TEXT CHECK (meeting_status IN ('yes', 'no')),
    status TEXT CHECK (status IN ('recommendation', 'confirmed', 'rejected')),
    worn_on DATE,
    source TEXT DEFAULT 'ai_recommendation',
    ai_score NUMERIC(4,3),
    ai_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. OUTFIT FEEDBACK TABLE (Don't Suggest This / Likes)
CREATE TABLE IF NOT EXISTS public.outfit_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
    shirt_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    bottom_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    footwear_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('dont_suggest', 'liked')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. WEAR HISTORY DETAILED LOG
CREATE TABLE IF NOT EXISTS public.wear_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    clothing_item_id UUID REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    outfit_id UUID REFERENCES public.outfits(id) ON DELETE CASCADE,
    date_worn DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DATABASE INDEXES FOR FAST QUERYING
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_category ON public.clothing_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_active ON public.clothing_items(user_id, active);
CREATE INDEX IF NOT EXISTS idx_wear_history_user_date ON public.wear_history(user_id, date_worn DESC);
CREATE INDEX IF NOT EXISTS idx_outfits_user_worn_on ON public.outfits(user_id, worn_on DESC);
CREATE INDEX IF NOT EXISTS idx_outfits_combo ON public.outfits(user_id, shirt_id, bottom_id, footwear_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_combo ON public.outfit_feedback(user_id, shirt_id, bottom_id, footwear_id);
CREATE INDEX IF NOT EXISTS idx_office_days_user_date ON public.office_days(user_id, date);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wear_history ENABLE ROW LEVEL SECURITY;

-- Owner Policies
CREATE POLICY "Users access own clothing" ON public.clothing_items FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own office days" ON public.office_days FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own outfits" ON public.outfits FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own feedback" ON public.outfit_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users access own wear history" ON public.wear_history FOR ALL USING (auth.uid() = user_id);

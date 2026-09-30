-- Outfit Planner Initial Migration & Schema Update
-- Safe execution on existing/fresh database

-- 1. Helper function for updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. clothing_items table
CREATE TABLE IF NOT EXISTS public.clothing_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('top', 'bottom', 'shoes')),
    garment_type TEXT NOT NULL,
    color TEXT,
    pattern TEXT CHECK (pattern IN ('solid', 'stripes', 'checks', 'other')),
    weave_knit TEXT,
    style TEXT CHECK (style IN ('executive_formal', 'business_casual', 'minimal_casual', 'casual_only', 'formal', 'smart_casual', 'casual', 'versatile')),
    warmth TEXT,
    climate_suitability JSONB DEFAULT '{}'::jsonb,
    office_suitability NUMERIC,
    formal_meeting_suitability NUMERIC,
    climate_practicality NUMERIC,
    rotation_versatility NUMERIC,
    confidence NUMERIC,
    pairing_rules JSONB DEFAULT '{}'::jsonb,
    user_overrides JSONB DEFAULT '{}'::jsonb,
    image_path TEXT NOT NULL,
    image_url TEXT,
    analysis_model TEXT DEFAULT 'gpt-4o-mini',
    analysis_version TEXT DEFAULT 'v2',
    raw_analysis JSONB DEFAULT '{}'::jsonb,
    is_damaged BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    wear_count INTEGER DEFAULT 0,
    last_worn_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- In case clothing_items already exists, safely modify / drop old check constraints and add new columns
DO $$
BEGIN
    -- Update category check constraint if table already existed
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clothing_items'
    ) THEN
        -- Alter existing columns / constraints if needed
        ALTER TABLE public.clothing_items ALTER COLUMN user_id SET DEFAULT auth.uid();
        ALTER TABLE public.clothing_items ALTER COLUMN user_id SET NOT NULL;
        ALTER TABLE public.clothing_items ALTER COLUMN image_url DROP NOT NULL;
        ALTER TABLE public.clothing_items ALTER COLUMN analysis_model SET DEFAULT 'gpt-4o-mini';
        ALTER TABLE public.clothing_items ALTER COLUMN analysis_version SET DEFAULT 'v2';
        
        -- Drop old category check if present
        ALTER TABLE public.clothing_items DROP CONSTRAINT IF EXISTS clothing_items_category_check;
        ALTER TABLE public.clothing_items ADD CONSTRAINT clothing_items_category_check CHECK (category IN ('top', 'bottom', 'shoes'));
        
        -- Add garment_type if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='garment_type') THEN
            ALTER TABLE public.clothing_items ADD COLUMN garment_type TEXT NOT NULL DEFAULT 'other';
        END IF;

        -- Add user_overrides if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='user_overrides') THEN
            ALTER TABLE public.clothing_items ADD COLUMN user_overrides JSONB DEFAULT '{}'::jsonb;
        END IF;

        -- Add active if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='active') THEN
            ALTER TABLE public.clothing_items ADD COLUMN active BOOLEAN DEFAULT TRUE;
        END IF;

        -- Add is_damaged if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='is_damaged') THEN
            ALTER TABLE public.clothing_items ADD COLUMN is_damaged BOOLEAN DEFAULT FALSE;
        END IF;

        -- Add wear_count if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='wear_count') THEN
            ALTER TABLE public.clothing_items ADD COLUMN wear_count INTEGER DEFAULT 0;
        END IF;

        -- Add last_worn_at if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='clothing_items' AND column_name='last_worn_at') THEN
            ALTER TABLE public.clothing_items ADD COLUMN last_worn_at TIMESTAMPTZ;
        END IF;
    END IF;
END $$;

-- 3. outfits table
CREATE TABLE IF NOT EXISTS public.outfits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    shirt_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    bottom_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    footwear_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'recommendation' CHECK (status IN ('recommendation', 'confirmed', 'rejected')),
    source TEXT NOT NULL DEFAULT 'ai_recommendation' CHECK (source IN ('ai_recommendation', 'manual')),
    ai_score NUMERIC,
    ai_reason TEXT,
    ai_tips JSONB DEFAULT '[]'::jsonb,
    worn_on DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. office_days table
CREATE TABLE IF NOT EXISTS public.office_days (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    is_office_day BOOLEAN DEFAULT TRUE,
    meeting_status TEXT DEFAULT 'no' CHECK (meeting_status IN ('yes', 'no')),
    meeting_type TEXT DEFAULT 'regular' CHECK (meeting_type IN ('formal', 'regular')),
    meeting_notes TEXT,
    selected_outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
    confirmed_outfit_id UUID REFERENCES public.outfits(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Drop old date unique constraint if existing, ensure composite unique(user_id, date)
DO $$
BEGIN
    ALTER TABLE public.office_days DROP CONSTRAINT IF EXISTS office_days_date_key;
    ALTER TABLE public.office_days DROP CONSTRAINT IF EXISTS office_days_user_id_date_key;
    ALTER TABLE public.office_days ADD CONSTRAINT office_days_user_id_date_key UNIQUE (user_id, date);
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- 5. outfit_feedback table
CREATE TABLE IF NOT EXISTS public.outfit_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    shirt_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    bottom_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    footwear_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('dont_suggest', 'liked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT outfit_feedback_unique_triple UNIQUE (user_id, shirt_id, bottom_id, footwear_id, feedback_type)
);

-- 6. Updated_at Triggers
DROP TRIGGER IF EXISTS trg_clothing_items_updated_at ON public.clothing_items;
CREATE TRIGGER trg_clothing_items_updated_at
BEFORE UPDATE ON public.clothing_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_outfits_updated_at ON public.outfits;
CREATE TRIGGER trg_outfits_updated_at
BEFORE UPDATE ON public.outfits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_office_days_updated_at ON public.office_days;
CREATE TRIGGER trg_office_days_updated_at
BEFORE UPDATE ON public.office_days
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 7. Indexes
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_active ON public.clothing_items(user_id, active);
CREATE INDEX IF NOT EXISTS idx_clothing_items_user_category ON public.clothing_items(user_id, category);
CREATE INDEX IF NOT EXISTS idx_outfits_user_worn_on ON public.outfits(user_id, worn_on);
CREATE INDEX IF NOT EXISTS idx_outfits_user_status ON public.outfits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_office_days_user_date ON public.office_days(user_id, date);
CREATE INDEX IF NOT EXISTS idx_outfit_feedback_user_type ON public.outfit_feedback(user_id, feedback_type);

-- 8. Row Level Security (RLS)
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "clothing_items_owner_policy" ON public.clothing_items;
DROP POLICY IF EXISTS "outfits_owner_policy" ON public.outfits;
DROP POLICY IF EXISTS "office_days_owner_policy" ON public.office_days;
DROP POLICY IF EXISTS "outfit_feedback_owner_policy" ON public.outfit_feedback;

CREATE POLICY "clothing_items_owner_policy" ON public.clothing_items
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outfits_owner_policy" ON public.outfits
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "office_days_owner_policy" ON public.office_days
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "outfit_feedback_owner_policy" ON public.outfit_feedback
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 9. confirm_outfit database function
-- Single transaction Wear this handler:
-- 1) Reverts any previously confirmed outfit for this user on this date
-- 2) Marks the target outfit confirmed and sets worn_on
-- 3) Upserts office_days
-- 4) Recounts wear_count and updates last_worn_at for shirt, bottom, and shoes from all confirmed outfits
CREATE OR REPLACE FUNCTION public.confirm_outfit(p_outfit_id UUID, p_date DATE)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_user_id UUID;
    v_shirt_id UUID;
    v_bottom_id UUID;
    v_footwear_id UUID;
    v_old_shirt_id UUID;
    v_old_bottom_id UUID;
    v_old_footwear_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Fetch target outfit and verify ownership
    SELECT shirt_id, bottom_id, footwear_id
    INTO v_shirt_id, v_bottom_id, v_footwear_id
    FROM public.outfits
    WHERE id = p_outfit_id AND user_id = v_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Outfit % not found for current user', p_outfit_id;
    END IF;

    -- 1) If an outfit was already confirmed today, revert it back to 'recommendation' and clear worn_on
    FOR v_old_shirt_id, v_old_bottom_id, v_old_footwear_id IN
        SELECT shirt_id, bottom_id, footwear_id
        FROM public.outfits
        WHERE user_id = v_user_id AND worn_on = p_date AND id <> p_outfit_id AND status = 'confirmed'
    LOOP
        UPDATE public.outfits
        SET status = 'recommendation', worn_on = NULL
        WHERE user_id = v_user_id AND worn_on = p_date AND id <> p_outfit_id AND status = 'confirmed';

        -- Recompute counts for previously confirmed garments
        UPDATE public.clothing_items ci
        SET 
            wear_count = (
                SELECT COUNT(*) FROM public.outfits o
                WHERE o.user_id = v_user_id AND o.status = 'confirmed' 
                  AND (o.shirt_id = ci.id OR o.bottom_id = ci.id OR o.footwear_id = ci.id)
            ),
            last_worn_at = (
                SELECT MAX(o.worn_on) FROM public.outfits o
                WHERE o.user_id = v_user_id AND o.status = 'confirmed' 
                  AND (o.shirt_id = ci.id OR o.bottom_id = ci.id OR o.footwear_id = ci.id)
            )
        WHERE ci.id IN (v_old_shirt_id, v_old_bottom_id, v_old_footwear_id);
    END LOOP;

    -- 2) Confirm the target outfit
    UPDATE public.outfits
    SET status = 'confirmed', worn_on = p_date
    WHERE id = p_outfit_id AND user_id = v_user_id;

    -- 3) Upsert office_days record
    INSERT INTO public.office_days (user_id, date, is_office_day, confirmed_outfit_id)
    VALUES (v_user_id, p_date, true, p_outfit_id)
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        confirmed_outfit_id = p_outfit_id,
        is_office_day = true,
        updated_at = NOW();

    -- 4) Recount wear stats for the 3 confirmed items
    UPDATE public.clothing_items ci
    SET 
        wear_count = (
            SELECT COUNT(*) FROM public.outfits o
            WHERE o.user_id = v_user_id AND o.status = 'confirmed' 
              AND (o.shirt_id = ci.id OR o.bottom_id = ci.id OR o.footwear_id = ci.id)
        ),
        last_worn_at = (
            SELECT MAX(o.worn_on) FROM public.outfits o
            WHERE o.user_id = v_user_id AND o.status = 'confirmed' 
              AND (o.shirt_id = ci.id OR o.bottom_id = ci.id OR o.footwear_id = ci.id)
        )
    WHERE ci.id IN (v_shirt_id, v_bottom_id, v_footwear_id);

    RETURN jsonb_build_object(
        'success', true,
        'outfit_id', p_outfit_id,
        'date', p_date
    );
END;
$$;

-- 10. Storage bucket and security policies
-- Make bucket private and restrict to user folders
INSERT INTO storage.buckets (id, name, public)
VALUES ('garment-images', 'garment-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "Users can read own garment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own garment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own garment images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own garment images" ON storage.objects;

CREATE POLICY "Users can read own garment images"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'garment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can upload own garment images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'garment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own garment images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'garment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own garment images"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'garment-images' 
    AND (storage.foldername(name))[1] = auth.uid()::text
);

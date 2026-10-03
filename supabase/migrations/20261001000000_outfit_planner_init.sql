-- Cultus Outfit Planner Database Migration
-- Safe to execute against fresh or existing project with 0 rows

-- 1. Timestamp update trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing tables if present (clean recreation since tables are empty)
DROP TABLE IF EXISTS public.outfit_feedback CASCADE;
DROP TABLE IF EXISTS public.office_days CASCADE;
DROP TABLE IF EXISTS public.outfits CASCADE;
DROP TABLE IF EXISTS public.clothing_items CASCADE;

-- 3. clothing_items table
CREATE TABLE public.clothing_items (
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

-- 4. outfits table
CREATE TABLE public.outfits (
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

-- 5. office_days table
CREATE TABLE public.office_days (
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT office_days_user_id_date_key UNIQUE (user_id, date)
);

-- 6. outfit_feedback table
CREATE TABLE public.outfit_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    shirt_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    bottom_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    footwear_id UUID NOT NULL REFERENCES public.clothing_items(id) ON DELETE CASCADE,
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('dont_suggest', 'liked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT outfit_feedback_unique_triple UNIQUE (user_id, shirt_id, bottom_id, footwear_id, feedback_type)
);

-- 7. Updated_at Triggers
CREATE TRIGGER trg_clothing_items_updated_at
BEFORE UPDATE ON public.clothing_items
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_outfits_updated_at
BEFORE UPDATE ON public.outfits
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_office_days_updated_at
BEFORE UPDATE ON public.office_days
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 8. Indexes
CREATE INDEX idx_clothing_items_user_active ON public.clothing_items(user_id, active);
CREATE INDEX idx_clothing_items_user_category ON public.clothing_items(user_id, category);
CREATE INDEX idx_outfits_user_worn_on ON public.outfits(user_id, worn_on);
CREATE INDEX idx_outfits_user_status ON public.outfits(user_id, status);
CREATE INDEX idx_office_days_user_date ON public.office_days(user_id, date);
CREATE INDEX idx_outfit_feedback_user_type ON public.outfit_feedback(user_id, feedback_type);

-- 9. Row Level Security (RLS)
ALTER TABLE public.clothing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outfit_feedback ENABLE ROW LEVEL SECURITY;

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

-- 10. confirm_outfit database function (SECURITY INVOKER)
CREATE OR REPLACE FUNCTION public.confirm_outfit(p_outfit_id UUID, p_date DATE)
RETURNS jsonb
SECURITY INVOKER
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

    -- 3) Upsert office_days record (both selected_outfit_id and confirmed_outfit_id)
    INSERT INTO public.office_days (
        user_id,
        date,
        is_office_day,
        selected_outfit_id,
        confirmed_outfit_id
    )
    VALUES (
        v_user_id,
        p_date,
        true,
        p_outfit_id,
        p_outfit_id
    )
    ON CONFLICT (user_id, date)
    DO UPDATE SET 
        selected_outfit_id = p_outfit_id,
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

-- 11. Storage bucket configuration and security policies
-- Make bucket private even if previously public
INSERT INTO storage.buckets (id, name, public)
VALUES ('garment-images', 'garment-images', false)
ON CONFLICT (id) DO UPDATE SET public = false;

UPDATE storage.buckets SET public = false WHERE id = 'garment-images';

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

-- Banner settings — editable from admin dashboard, rendered in enrollment form step 1
-- Run in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.banner_settings (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_text  text        NOT NULL DEFAULT '',
  headline    text        NOT NULL DEFAULT '',
  subtitle    text        NOT NULL DEFAULT '',
  pills       text[]      NOT NULL DEFAULT '{}',
  image_url   text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS banner_settings_updated_at ON public.banner_settings;
CREATE TRIGGER banner_settings_updated_at
  BEFORE UPDATE ON public.banner_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed one default row
INSERT INTO public.banner_settings (badge_text, headline, subtitle, pills)
SELECT b.badge_text, b.headline, b.subtitle, b.pills
FROM (
  VALUES (
    'IIT Preparation Program',
    'Get Into Your Dream IIT',
    'Expert-led coaching - Personalized mentoring - Proven results',
    ARRAY['500+ Students', 'Top IITs', 'Expert Mentors']
  )
) AS b(badge_text, headline, subtitle, pills)
WHERE NOT EXISTS (SELECT 1 FROM public.banner_settings LIMIT 1);

-- RLS

ALTER TABLE public.banner_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banner_settings_select_public" ON public.banner_settings;
CREATE POLICY "banner_settings_select_public"
  ON public.banner_settings FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "banner_settings_admin_all" ON public.banner_settings;
CREATE POLICY "banner_settings_admin_all"
  ON public.banner_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

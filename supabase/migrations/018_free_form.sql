-- Migration 018: Free enrollment form support
-- Run in Supabase Dashboard > SQL Editor

-- 1. Add form_type to plans (paid = existing enrollment form, free = free 1-on-1 form)
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS form_type text NOT NULL DEFAULT 'paid';

-- 2. Relax the submission constraint so free enrollments (no UTR) can be submitted
ALTER TABLE public.enrollments
  DROP CONSTRAINT IF EXISTS enrollments_submitted_requires_fields;

ALTER TABLE public.enrollments
  ADD CONSTRAINT enrollments_submitted_requires_fields
  CHECK (
    status != 'submitted'
    OR (
      full_name IS NOT NULL AND btrim(full_name) != ''
      AND whatsapp IS NOT NULL
      AND plan_id IS NOT NULL
      AND cardinality(target_colleges) >= 1
    )
  );

-- 3. Seed the 3 free session plans
INSERT INTO public.plans (slug, name, price_paise, tag, display_order, form_type, session_limit)
VALUES
  ('free-10', '10 Minutes', 0, 'Default session duration',               1, 'free', '10 Minutes'),
  ('free-12', '12 Minutes', 0, 'I agree to share a short review video after the session', 2, 'free', '12 Minutes'),
  ('free-20', '20 Minutes', 0, 'Short video review + Subscribe to YouTube channel',       3, 'free', '20 Minutes')
ON CONFLICT (slug) DO NOTHING;

-- 4. RLS: anon users must be able to read free plans (they're active = true, already covered by existing policy)
-- No additional policy needed — existing "plans_select_active_public" covers form_type = 'free' plans too.

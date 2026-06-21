-- LearnWithSanu enrollment schema (no login required for public form)
-- Run this entire script in Supabase Dashboard → SQL Editor

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helpers ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── plans ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  name            text NOT NULL,
  price_paise     integer NOT NULL CHECK (price_paise >= 0),
  tag             text,
  display_order   integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS plans_updated_at ON public.plans;
CREATE TRIGGER plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_plans_active_order
  ON public.plans (is_active, display_order, name);

INSERT INTO public.plans (slug, name, price_paise, tag, display_order) VALUES
  ('ai-chatbot',  'AI Chatbot Access',              19900,  NULL,         1),
  ('roadmap',     'Preparation Roadmap & Strategy', 39900,  NULL,         2),
  ('portfolio',   'Portfolio Review',               49900,  NULL,         3),
  ('interview',   'IIT Interview Guidance',         49900,  NULL,         4),
  ('flex',        'Flex Preparation Bundle',       399900,  'Popular',    5),
  ('pro',         'Pro* Preparation Bundle',       799900,  'Best Value', 6),
  ('core',        'Core Preparation Bundle',      1099900,  'Complete',   7)
ON CONFLICT (slug) DO NOTHING;

-- ── payment_settings (admin-managed UPI + QR) ──────────────────────────────

CREATE TABLE IF NOT EXISTS public.payment_settings (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upi_id           text NOT NULL DEFAULT 'sanukumar972@ybl',
  upi_name         text NOT NULL DEFAULT 'Sanu Kumar',
  support_phone    text NOT NULL DEFAULT '9390715011',
  support_display  text NOT NULL DEFAULT '939 071 5011',
  qr_code_url      text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS payment_settings_updated_at ON public.payment_settings;
CREATE TRIGGER payment_settings_updated_at
  BEFORE UPDATE ON public.payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.payment_settings (upi_id, upi_name, support_phone, support_display)
SELECT 'sanukumar972@ybl', 'Sanu Kumar', '9390715011', '939 071 5011'
WHERE NOT EXISTS (SELECT 1 FROM public.payment_settings LIMIT 1);

-- ── admin_profiles ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      text NOT NULL,
  role       text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed an initial admin profile (replace with a real auth.users UUID + email)
INSERT INTO public.admin_profiles (user_id, email, role)
VALUES ('YOUR-AUTH-USER-UUID', 'your-admin@email.com', 'admin');

-- Must be created AFTER admin_profiles table exists
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE user_id = auth.uid()
  );
$$;

-- ── enrollments (single record across all 5 steps) ─────────────────────────

CREATE TABLE IF NOT EXISTS public.enrollments (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token             uuid NOT NULL,

  full_name                 text,
  email                     text NOT NULL,
  whatsapp                  text,

  plan_id                   uuid REFERENCES public.plans(id),
  plan_name_snapshot        text,
  plan_price_snapshot_paise integer,

  utr_number                text,

  target_colleges           text[] NOT NULL DEFAULT '{}',
  referral_source           text,
  referral_other            text,

  remarks                   text,

  current_step              smallint NOT NULL DEFAULT 0 CHECK (current_step BETWEEN 0 AND 4),
  status                    text NOT NULL DEFAULT 'in_progress'
                            CHECK (status IN ('in_progress', 'submitted', 'cancelled')),
  submitted_at              timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT enrollments_email_format
    CHECK (email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  CONSTRAINT enrollments_colleges_max
    CHECK (cardinality(target_colleges) <= 3),
  CONSTRAINT enrollments_submitted_requires_fields
    CHECK (
      status != 'submitted'
      OR (
        full_name IS NOT NULL AND btrim(full_name) != ''
        AND whatsapp IS NOT NULL
        AND plan_id IS NOT NULL
        AND utr_number IS NOT NULL AND btrim(utr_number) != ''
        AND cardinality(target_colleges) >= 1
      )
    )
);

DROP TRIGGER IF EXISTS enrollments_updated_at ON public.enrollments;
CREATE TRIGGER enrollments_updated_at
  BEFORE UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_enrollments_session
  ON public.enrollments (session_token, status);

CREATE INDEX IF NOT EXISTS idx_enrollments_status_submitted
  ON public.enrollments (status, submitted_at DESC NULLS LAST);

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_email_submitted
  ON public.enrollments (lower(email))
  WHERE status = 'submitted';

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_utr_submitted
  ON public.enrollments (upper(btrim(utr_number)))
  WHERE status = 'submitted' AND utr_number IS NOT NULL;

-- ── RPC: save step (no login — session_token proves ownership) ─────────────

CREATE OR REPLACE FUNCTION public.save_enrollment_step(
  p_session_token uuid,
  p_enrollment_id uuid,
  p_step smallint,
  p_full_name text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_whatsapp text DEFAULT NULL,
  p_plan_slug text DEFAULT NULL,
  p_utr_number text DEFAULT NULL,
  p_target_colleges text[] DEFAULT NULL,
  p_referral_source text DEFAULT NULL,
  p_referral_other text DEFAULT NULL,
  p_remarks text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan public.plans%ROWTYPE;
  v_id uuid;
  v_email text;
BEGIN
  IF p_step NOT BETWEEN 0 AND 4 THEN
    RAISE EXCEPTION 'Invalid step';
  END IF;

  v_email := lower(btrim(coalesce(p_email, '')));
  IF v_email = '' OR v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  IF p_plan_slug IS NOT NULL AND btrim(p_plan_slug) != '' THEN
    SELECT * INTO v_plan FROM public.plans
    WHERE slug = p_plan_slug AND is_active = true;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invalid or inactive plan';
    END IF;
  END IF;

  IF p_enrollment_id IS NOT NULL THEN
    UPDATE public.enrollments e
    SET
      full_name = coalesce(nullif(btrim(p_full_name), ''), e.full_name),
      email = v_email,
      whatsapp = coalesce(nullif(btrim(p_whatsapp), ''), e.whatsapp),
      plan_id = CASE WHEN v_plan.id IS NOT NULL THEN v_plan.id ELSE e.plan_id END,
      plan_name_snapshot = CASE WHEN v_plan.id IS NOT NULL THEN v_plan.name ELSE e.plan_name_snapshot END,
      plan_price_snapshot_paise = CASE WHEN v_plan.id IS NOT NULL THEN v_plan.price_paise ELSE e.plan_price_snapshot_paise END,
      utr_number = coalesce(nullif(upper(btrim(p_utr_number)), ''), e.utr_number),
      target_colleges = coalesce(p_target_colleges, e.target_colleges),
      referral_source = coalesce(nullif(btrim(p_referral_source), ''), e.referral_source),
      referral_other = coalesce(nullif(btrim(p_referral_other), ''), e.referral_other),
      remarks = coalesce(p_remarks, e.remarks),
      current_step = greatest(e.current_step, p_step),
      updated_at = now()
    WHERE e.id = p_enrollment_id
      AND e.session_token = p_session_token
      AND e.status = 'in_progress'
    RETURNING e.id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Enrollment not found or already submitted';
    END IF;

    RETURN v_id;
  END IF;

  INSERT INTO public.enrollments (
    session_token, full_name, email, whatsapp,
    plan_id, plan_name_snapshot, plan_price_snapshot_paise,
    utr_number, target_colleges, referral_source, referral_other, remarks,
    current_step
  ) VALUES (
    p_session_token,
    nullif(btrim(p_full_name), ''),
    v_email,
    nullif(btrim(p_whatsapp), ''),
    v_plan.id,
    v_plan.name,
    v_plan.price_paise,
    nullif(upper(btrim(p_utr_number)), ''),
    coalesce(p_target_colleges, '{}'),
    nullif(btrim(p_referral_source), ''),
    nullif(btrim(p_referral_other), ''),
    p_remarks,
    p_step
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ── RPC: final submit ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.submit_enrollment(
  p_session_token uuid,
  p_enrollment_id uuid
)
RETURNS public.enrollments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec public.enrollments;
BEGIN
  SELECT * INTO rec
  FROM public.enrollments
  WHERE id = p_enrollment_id
    AND session_token = p_session_token
    AND status = 'in_progress'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Enrollment not found or already submitted';
  END IF;

  UPDATE public.enrollments
  SET status = 'submitted', submitted_at = now(), current_step = 4, updated_at = now()
  WHERE id = p_enrollment_id
  RETURNING * INTO rec;

  RETURN rec;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'DUPLICATE_SUBMISSION';
END;
$$;

GRANT EXECUTE ON FUNCTION public.save_enrollment_step(
  uuid, uuid, smallint, text, text, text, text, text, text[], text, text, text
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.submit_enrollment(uuid, uuid) TO anon, authenticated;

-- ── RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plans_select_active_public" ON public.plans;
CREATE POLICY "plans_select_active_public"
  ON public.plans FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "plans_admin_all" ON public.plans;
CREATE POLICY "plans_admin_all"
  ON public.plans FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "payment_settings_select_public" ON public.payment_settings;
CREATE POLICY "payment_settings_select_public"
  ON public.payment_settings FOR SELECT TO anon, authenticated
  USING (is_active = true);

DROP POLICY IF EXISTS "payment_settings_admin_all" ON public.payment_settings;
CREATE POLICY "payment_settings_admin_all"
  ON public.payment_settings FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- enrollments: no direct client access — only via RPC above
DROP POLICY IF EXISTS "enrollments_admin_select" ON public.enrollments;
CREATE POLICY "enrollments_admin_select"
  ON public.enrollments FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_profiles_select_self" ON public.admin_profiles;
CREATE POLICY "admin_profiles_select_self"
  ON public.admin_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ── Storage bucket for QR images ───────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-assets',
  'payment-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "payment_assets_public_read" ON storage.objects;
CREATE POLICY "payment_assets_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'payment-assets');

DROP POLICY IF EXISTS "payment_assets_admin_upload" ON storage.objects;
CREATE POLICY "payment_assets_admin_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-assets' AND public.is_admin());

DROP POLICY IF EXISTS "payment_assets_admin_update" ON storage.objects;
CREATE POLICY "payment_assets_admin_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-assets' AND public.is_admin());

DROP POLICY IF EXISTS "payment_assets_admin_delete" ON storage.objects;
CREATE POLICY "payment_assets_admin_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-assets' AND public.is_admin());

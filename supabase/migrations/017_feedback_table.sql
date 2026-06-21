-- Migration 017: feedback table for Tally.so webhook responses

CREATE TABLE IF NOT EXISTS public.feedback (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id  text        UNIQUE,
  form_id      text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  raw_payload  jsonb
);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Authenticated admins can read/write
CREATE POLICY "Authenticated full access on feedback"
  ON public.feedback
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Service role (used by edge function) bypasses RLS
CREATE POLICY "Service role bypass on feedback"
  ON public.feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

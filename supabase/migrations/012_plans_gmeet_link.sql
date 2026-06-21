-- Add gmeet_link column to plans table (per-plan Google Meet link for admin use)
-- Not exposed to the enrollment form — admin dashboard only

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS gmeet_link text;

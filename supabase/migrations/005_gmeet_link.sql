-- Add gmeet_link column to enrollments for Sessions tab
ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS gmeet_link text;

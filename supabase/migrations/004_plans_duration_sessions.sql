-- Add duration_weeks and session_limit to plans table
-- Run in Supabase Dashboard > SQL Editor


ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS duration_weeks  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS session_limit   integer NOT NULL DEFAULT 0;

-- LearnWithSanu dashboard operational columns
-- Run this migration in Supabase Dashboard → SQL Editor after 001_initial.sql.

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS session_date date,
  ADD COLUMN IF NOT EXISTS session_time time without time zone,
  ADD COLUMN IF NOT EXISTS session_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mail_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS mail_sent_date timestamptz,
  ADD COLUMN IF NOT EXISTS template_used text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS plan_expiry_date date;

CREATE INDEX IF NOT EXISTS idx_enrollments_session_date
  ON public.enrollments (session_date, session_time);

CREATE INDEX IF NOT EXISTS idx_enrollments_mail_sent
  ON public.enrollments (mail_sent, mail_sent_date DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_enrollments_plan_expiry
  ON public.enrollments (plan_expiry_date);

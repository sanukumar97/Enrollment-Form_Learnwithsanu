ALTER TABLE public.enrollments ADD COLUMN IF NOT EXISTS sessions_attended integer NOT NULL DEFAULT 0;

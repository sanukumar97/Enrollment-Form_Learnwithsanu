-- Tracks when admin approved an enrollment.
-- NULL = pending review, NOT NULL = approved (moves to Enrolled tab).
-- Rejected enrollments are marked with status = 'cancelled'.

ALTER TABLE public.enrollments
  ADD COLUMN IF NOT EXISTS admin_approved_at timestamptz;

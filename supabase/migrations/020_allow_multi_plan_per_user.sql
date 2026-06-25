-- Allow the same user to enroll in multiple plans simultaneously.
-- Previously unique on (email) per submitted row — now unique on (email, plan_id).

DROP INDEX IF EXISTS uq_enrollments_email_submitted;

CREATE UNIQUE INDEX IF NOT EXISTS uq_enrollments_email_plan_submitted
  ON public.enrollments (lower(email), plan_id)
  WHERE status = 'submitted';

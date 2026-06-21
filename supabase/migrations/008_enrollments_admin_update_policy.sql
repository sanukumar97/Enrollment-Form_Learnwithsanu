-- Admin needs UPDATE access on enrollments for session scheduling,
-- notes, gmeet link, mail status, plan expiry, and cancellation.
-- Migration 001 only added SELECT; this adds the missing UPDATE policy.

DROP POLICY IF EXISTS "enrollments_admin_update" ON public.enrollments;
CREATE POLICY "enrollments_admin_update"
  ON public.enrollments
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

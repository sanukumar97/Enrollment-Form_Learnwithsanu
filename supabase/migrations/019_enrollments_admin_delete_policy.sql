-- Admin needs DELETE access on enrollments for hard-deleting cancelled records.
-- Migrations 001 (SELECT) and 008 (UPDATE) exist but DELETE was missing,
-- causing hardDeleteEnrollment() to silently fail due to RLS.

DROP POLICY IF EXISTS "enrollments_admin_delete" ON public.enrollments;
CREATE POLICY "enrollments_admin_delete"
  ON public.enrollments
  FOR DELETE
  TO authenticated
  USING (public.is_admin());

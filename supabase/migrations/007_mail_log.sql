-- Mail log table for Communications > Mail Log tab
CREATE TABLE IF NOT EXISTS public.mail_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enrollment_id uuid REFERENCES public.enrollments(id) ON DELETE SET NULL,
  sent_to       text NOT NULL,
  email         text NOT NULL,
  template      text NOT NULL,
  sent_date     date NOT NULL DEFAULT CURRENT_DATE,
  status        text NOT NULL DEFAULT 'Sent',  -- 'Sent' | 'Failed'
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mail_log_enrollment_id_idx ON public.mail_log (enrollment_id);
CREATE INDEX IF NOT EXISTS mail_log_created_at_idx    ON public.mail_log (created_at DESC);

ALTER TABLE public.mail_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_mail_log"
  ON public.mail_log
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

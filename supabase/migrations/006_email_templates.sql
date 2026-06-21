-- Email templates table for Communications > Mail Templates tab
CREATE TABLE IF NOT EXISTS public.email_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text NOT NULL DEFAULT '',
  body        text NOT NULL DEFAULT '',
  archived    boolean NOT NULL DEFAULT false,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_email_templates"
  ON public.email_templates
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Seed three starter templates
INSERT INTO public.email_templates (name, description, body) VALUES
(
  'Welcome Mail',
  'Sent after enrollment verification',
  E'Hi {{name}},\n\nWelcome to the {{plan}} plan! We''re thrilled to have you on board.\n\nWe have received your enrollment and will reach out shortly with your next steps.\n\nRegards,\nLearnWithSanu Team'
),
(
  'Session Confirmation',
  'Used after scheduling a 1-on-1 session',
  E'Hi {{name}},\n\nYour session has been scheduled!\n\nDate: {{session_date}}\nTime: {{session_time}}\n\nPlease be available 5 minutes before the session. The meeting link will be shared separately.\n\nRegards,\nLearnWithSanu Team'
),
(
  'Follow-up Mail',
  'Used after session completion',
  E'Hi {{name}},\n\nThank you for attending your session today. It was great connecting with you!\n\nWe will share follow-up notes and resources soon. Feel free to reach out if you have any questions.\n\nRegards,\nLearnWithSanu Team'
)
ON CONFLICT DO NOTHING;

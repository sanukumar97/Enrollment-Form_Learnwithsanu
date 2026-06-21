-- Adds scheduled_for so admins can queue a mail for a future date/time.
-- Status 'Scheduled' is stored; admin clicks "Send Now" in Mail Log to deliver.
ALTER TABLE public.mail_log
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- Plan Upgrade Offer template (4th starter template)
INSERT INTO public.email_templates (name, description, body) VALUES
(
  'Plan Upgrade Offer',
  'Encourages students to upgrade their plan',
  E'Hi {{name}},\n\nYou''ve been making incredible progress on the {{plan}} plan!\n\nI''d love to offer you an exclusive upgrade opportunity. Reply to this email to learn more about what''s available for you.\n\nYour Coach,\nLearnWithSanu Team'
)
ON CONFLICT DO NOTHING;

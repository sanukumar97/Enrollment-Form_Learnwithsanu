-- Store pre-generated email body in mail_log (used for bundle access mails with gmeet links)
-- Edge function uses this body directly if present, otherwise falls back to template lookup

ALTER TABLE public.mail_log
  ADD COLUMN IF NOT EXISTS body text;

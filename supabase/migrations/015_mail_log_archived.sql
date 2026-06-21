ALTER TABLE public.mail_log ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false;

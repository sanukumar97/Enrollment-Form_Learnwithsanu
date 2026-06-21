-- Change duration_weeks and session_limit to text so values like "Unlimited" can be stored as-is

ALTER TABLE public.plans
  ALTER COLUMN duration_weeks TYPE text USING CASE WHEN duration_weeks = 0 THEN '' ELSE duration_weeks::text END,
  ALTER COLUMN session_limit  TYPE text USING CASE WHEN session_limit  = 0 THEN '' ELSE session_limit::text  END;

ALTER TABLE public.plans
  ALTER COLUMN duration_weeks DROP NOT NULL,
  ALTER COLUMN session_limit  DROP NOT NULL;

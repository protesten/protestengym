ALTER TABLE public.sessions ADD COLUMN is_completed boolean NOT NULL DEFAULT false;

-- Mark all existing sessions as completed so they continue to appear in analytics
UPDATE public.sessions SET is_completed = true;
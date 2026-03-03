
-- Add planned_sets jsonb column to routine_exercises
ALTER TABLE public.routine_exercises ADD COLUMN planned_sets jsonb DEFAULT '[]';

-- Add rpe numeric column to sets
ALTER TABLE public.sets ADD COLUMN rpe numeric NULL;

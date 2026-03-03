
-- Add notes column to exercises table for persistent exercise notes
ALTER TABLE public.exercises ADD COLUMN notes text;

-- Add notes column to predefined_exercises too for consistency
ALTER TABLE public.predefined_exercises ADD COLUMN notes text;

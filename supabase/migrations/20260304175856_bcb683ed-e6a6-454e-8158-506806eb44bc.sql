
-- Add new columns to body_measurements
ALTER TABLE public.body_measurements
  ADD COLUMN IF NOT EXISTS neck_cm numeric,
  ADD COLUMN IF NOT EXISTS bicep_right_contracted_cm numeric,
  ADD COLUMN IF NOT EXISTS bicep_right_relaxed_cm numeric,
  ADD COLUMN IF NOT EXISTS bicep_left_contracted_cm numeric,
  ADD COLUMN IF NOT EXISTS bicep_left_relaxed_cm numeric,
  ADD COLUMN IF NOT EXISTS abdomen_cm numeric,
  ADD COLUMN IF NOT EXISTS hip_cm numeric,
  ADD COLUMN IF NOT EXISTS subgluteal_right_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_right_relaxed_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_right_contracted_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_left_relaxed_cm numeric,
  ADD COLUMN IF NOT EXISTS thigh_left_contracted_cm numeric,
  ADD COLUMN IF NOT EXISTS calf_right_cm numeric,
  ADD COLUMN IF NOT EXISTS calf_left_cm numeric;

-- Add height and birth_date to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS birth_date date;

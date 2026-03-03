
-- Body Measurements table
CREATE TABLE public.body_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg NUMERIC NULL,
  body_fat_pct NUMERIC NULL,
  chest_cm NUMERIC NULL,
  waist_cm NUMERIC NULL,
  arm_cm NUMERIC NULL,
  thigh_cm NUMERIC NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own measurements" ON public.body_measurements FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own measurements" ON public.body_measurements FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own measurements" ON public.body_measurements FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own measurements" ON public.body_measurements FOR DELETE USING (user_id = auth.uid());

-- Programs table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  weeks INTEGER NOT NULL DEFAULT 4,
  deload_week INTEGER NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own programs" ON public.programs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users insert own programs" ON public.programs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own programs" ON public.programs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users delete own programs" ON public.programs FOR DELETE USING (user_id = auth.uid());

-- Program Weeks table
CREATE TABLE public.program_weeks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  week_number INTEGER NOT NULL,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  notes TEXT NULL,
  UNIQUE(program_id, week_number)
);

ALTER TABLE public.program_weeks ENABLE ROW LEVEL SECURITY;

-- Helper function for program ownership
CREATE OR REPLACE FUNCTION public.owns_program(_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.programs WHERE id = _program_id AND user_id = auth.uid());
$$;

CREATE POLICY "Users read own program weeks" ON public.program_weeks FOR SELECT USING (owns_program(program_id));
CREATE POLICY "Users insert own program weeks" ON public.program_weeks FOR INSERT WITH CHECK (owns_program(program_id));
CREATE POLICY "Users update own program weeks" ON public.program_weeks FOR UPDATE USING (owns_program(program_id));
CREATE POLICY "Users delete own program weeks" ON public.program_weeks FOR DELETE USING (owns_program(program_id));

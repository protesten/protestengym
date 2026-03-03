
-- Enums
CREATE TYPE public.tracking_type AS ENUM ('weight_reps', 'reps_only', 'time_only', 'distance_time');
CREATE TYPE public.set_type AS ENUM ('warmup', 'approach', 'work');

-- Muscles (shared, read-only)
CREATE TABLE public.muscles (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Exercises
CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  tracking_type public.tracking_type NOT NULL DEFAULT 'weight_reps',
  primary_muscle_ids INT[] DEFAULT '{}',
  secondary_muscle_ids INT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Routines
CREATE TABLE public.routines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Routine exercises
CREATE TABLE public.routine_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id UUID NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0
);

-- Sessions
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  routine_id UUID REFERENCES public.routines(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Session exercises
CREATE TABLE public.session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL DEFAULT 0
);

-- Sets
CREATE TABLE public.sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id UUID NOT NULL REFERENCES public.session_exercises(id) ON DELETE CASCADE,
  set_type public.set_type NOT NULL DEFAULT 'work',
  weight NUMERIC,
  reps INT,
  duration_seconds INT,
  distance_meters NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper functions (SECURITY DEFINER to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.owns_routine(_routine_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.routines WHERE id = _routine_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_session(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.sessions WHERE id = _session_id AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.owns_session_exercise(_se_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.sessions s ON s.id = se.session_id
    WHERE se.id = _se_id AND s.user_id = auth.uid()
  );
$$;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Enable RLS on all tables
ALTER TABLE public.muscles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

-- RLS: muscles (read-only for authenticated)
CREATE POLICY "Anyone can read muscles" ON public.muscles FOR SELECT TO authenticated USING (true);

-- RLS: profiles
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- RLS: exercises
CREATE POLICY "Users read own exercises" ON public.exercises FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own exercises" ON public.exercises FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own exercises" ON public.exercises FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS: routines
CREATE POLICY "Users read own routines" ON public.routines FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own routines" ON public.routines FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own routines" ON public.routines FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own routines" ON public.routines FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS: routine_exercises (check parent ownership)
CREATE POLICY "Users read own routine exercises" ON public.routine_exercises FOR SELECT TO authenticated USING (public.owns_routine(routine_id));
CREATE POLICY "Users insert own routine exercises" ON public.routine_exercises FOR INSERT TO authenticated WITH CHECK (public.owns_routine(routine_id));
CREATE POLICY "Users update own routine exercises" ON public.routine_exercises FOR UPDATE TO authenticated USING (public.owns_routine(routine_id));
CREATE POLICY "Users delete own routine exercises" ON public.routine_exercises FOR DELETE TO authenticated USING (public.owns_routine(routine_id));

-- RLS: sessions
CREATE POLICY "Users read own sessions" ON public.sessions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users insert own sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own sessions" ON public.sessions FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- RLS: session_exercises (check parent ownership)
CREATE POLICY "Users read own session exercises" ON public.session_exercises FOR SELECT TO authenticated USING (public.owns_session(session_id));
CREATE POLICY "Users insert own session exercises" ON public.session_exercises FOR INSERT TO authenticated WITH CHECK (public.owns_session(session_id));
CREATE POLICY "Users update own session exercises" ON public.session_exercises FOR UPDATE TO authenticated USING (public.owns_session(session_id));
CREATE POLICY "Users delete own session exercises" ON public.session_exercises FOR DELETE TO authenticated USING (public.owns_session(session_id));

-- RLS: sets (check parent ownership)
CREATE POLICY "Users read own sets" ON public.sets FOR SELECT TO authenticated USING (public.owns_session_exercise(session_exercise_id));
CREATE POLICY "Users insert own sets" ON public.sets FOR INSERT TO authenticated WITH CHECK (public.owns_session_exercise(session_exercise_id));
CREATE POLICY "Users update own sets" ON public.sets FOR UPDATE TO authenticated USING (public.owns_session_exercise(session_exercise_id));
CREATE POLICY "Users delete own sets" ON public.sets FOR DELETE TO authenticated USING (public.owns_session_exercise(session_exercise_id));

-- Indexes
CREATE INDEX idx_exercises_user ON public.exercises(user_id);
CREATE INDEX idx_routines_user ON public.routines(user_id);
CREATE INDEX idx_sessions_user ON public.sessions(user_id);
CREATE INDEX idx_sessions_date ON public.sessions(date);
CREATE INDEX idx_routine_exercises_routine ON public.routine_exercises(routine_id);
CREATE INDEX idx_session_exercises_session ON public.session_exercises(session_id);
CREATE INDEX idx_sets_session_exercise ON public.sets(session_exercise_id);

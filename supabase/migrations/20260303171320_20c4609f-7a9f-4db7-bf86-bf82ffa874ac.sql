
-- 1. New muscles
INSERT INTO public.muscles (name) VALUES ('Psoas ilíaco') ON CONFLICT DO NOTHING;
INSERT INTO public.muscles (name) VALUES ('Rotadores externos') ON CONFLICT DO NOTHING;

-- 2. App role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3. has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. predefined_exercises table
CREATE TABLE public.predefined_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  tracking_type public.tracking_type NOT NULL DEFAULT 'weight_reps',
  primary_muscle_ids integer[] DEFAULT '{}'::integer[],
  secondary_muscle_ids integer[] DEFAULT '{}'::integer[],
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.predefined_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read predefined exercises"
ON public.predefined_exercises FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert predefined exercises"
ON public.predefined_exercises FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update predefined exercises"
ON public.predefined_exercises FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete predefined exercises"
ON public.predefined_exercises FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Allow routine_exercises and session_exercises to reference predefined_exercises too
-- We need to drop the FK constraint on exercise_id since it can now point to either table
-- Actually, let's keep it simple: predefined exercises will be referenced by ID but we'll
-- remove the FK constraint so it can point to either table
ALTER TABLE public.routine_exercises DROP CONSTRAINT IF EXISTS routine_exercises_exercise_id_fkey;
ALTER TABLE public.session_exercises DROP CONSTRAINT IF EXISTS session_exercises_exercise_id_fkey;

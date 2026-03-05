-- 1. Create is_approved_user() function
CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_approved = true
  );
$$;

-- 2. Recreate policies for exercises
DROP POLICY IF EXISTS "Users read own exercises" ON public.exercises;
CREATE POLICY "Users read own exercises" ON public.exercises FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own exercises" ON public.exercises;
CREATE POLICY "Users insert own exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own exercises" ON public.exercises;
CREATE POLICY "Users update own exercises" ON public.exercises FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own exercises" ON public.exercises;
CREATE POLICY "Users delete own exercises" ON public.exercises FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

-- 3. Recreate policies for sessions
DROP POLICY IF EXISTS "Users read own sessions" ON public.sessions;
CREATE POLICY "Users read own sessions" ON public.sessions FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own sessions" ON public.sessions;
CREATE POLICY "Users insert own sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own sessions" ON public.sessions;
CREATE POLICY "Users update own sessions" ON public.sessions FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own sessions" ON public.sessions;
CREATE POLICY "Users delete own sessions" ON public.sessions FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

-- 4. Recreate policies for session_exercises
DROP POLICY IF EXISTS "Users read own session exercises" ON public.session_exercises;
CREATE POLICY "Users read own session exercises" ON public.session_exercises FOR SELECT TO authenticated USING (owns_session(session_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own session exercises" ON public.session_exercises;
CREATE POLICY "Users insert own session exercises" ON public.session_exercises FOR INSERT TO authenticated WITH CHECK (owns_session(session_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own session exercises" ON public.session_exercises;
CREATE POLICY "Users update own session exercises" ON public.session_exercises FOR UPDATE TO authenticated USING (owns_session(session_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own session exercises" ON public.session_exercises;
CREATE POLICY "Users delete own session exercises" ON public.session_exercises FOR DELETE TO authenticated USING (owns_session(session_id) AND public.is_approved_user());

-- 5. Recreate policies for sets
DROP POLICY IF EXISTS "Users read own sets" ON public.sets;
CREATE POLICY "Users read own sets" ON public.sets FOR SELECT TO authenticated USING (owns_session_exercise(session_exercise_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own sets" ON public.sets;
CREATE POLICY "Users insert own sets" ON public.sets FOR INSERT TO authenticated WITH CHECK (owns_session_exercise(session_exercise_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own sets" ON public.sets;
CREATE POLICY "Users update own sets" ON public.sets FOR UPDATE TO authenticated USING (owns_session_exercise(session_exercise_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own sets" ON public.sets;
CREATE POLICY "Users delete own sets" ON public.sets FOR DELETE TO authenticated USING (owns_session_exercise(session_exercise_id) AND public.is_approved_user());

-- 6. Recreate policies for routines
DROP POLICY IF EXISTS "Users read own routines" ON public.routines;
CREATE POLICY "Users read own routines" ON public.routines FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own routines" ON public.routines;
CREATE POLICY "Users insert own routines" ON public.routines FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own routines" ON public.routines;
CREATE POLICY "Users update own routines" ON public.routines FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own routines" ON public.routines;
CREATE POLICY "Users delete own routines" ON public.routines FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

-- 7. Recreate policies for routine_exercises
DROP POLICY IF EXISTS "Users read own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users read own routine exercises" ON public.routine_exercises FOR SELECT TO authenticated USING (owns_routine(routine_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users insert own routine exercises" ON public.routine_exercises FOR INSERT TO authenticated WITH CHECK (owns_routine(routine_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users update own routine exercises" ON public.routine_exercises FOR UPDATE TO authenticated USING (owns_routine(routine_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own routine exercises" ON public.routine_exercises;
CREATE POLICY "Users delete own routine exercises" ON public.routine_exercises FOR DELETE TO authenticated USING (owns_routine(routine_id) AND public.is_approved_user());

-- 8. Recreate policies for programs
DROP POLICY IF EXISTS "Users read own programs" ON public.programs;
CREATE POLICY "Users read own programs" ON public.programs FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own programs" ON public.programs;
CREATE POLICY "Users insert own programs" ON public.programs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own programs" ON public.programs;
CREATE POLICY "Users update own programs" ON public.programs FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own programs" ON public.programs;
CREATE POLICY "Users delete own programs" ON public.programs FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

-- 9. Recreate policies for program_weeks
DROP POLICY IF EXISTS "Users read own program weeks" ON public.program_weeks;
CREATE POLICY "Users read own program weeks" ON public.program_weeks FOR SELECT TO authenticated USING (owns_program(program_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own program weeks" ON public.program_weeks;
CREATE POLICY "Users insert own program weeks" ON public.program_weeks FOR INSERT TO authenticated WITH CHECK (owns_program(program_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own program weeks" ON public.program_weeks;
CREATE POLICY "Users update own program weeks" ON public.program_weeks FOR UPDATE TO authenticated USING (owns_program(program_id) AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own program weeks" ON public.program_weeks;
CREATE POLICY "Users delete own program weeks" ON public.program_weeks FOR DELETE TO authenticated USING (owns_program(program_id) AND public.is_approved_user());

-- 10. Recreate policies for body_measurements
DROP POLICY IF EXISTS "Users read own measurements" ON public.body_measurements;
CREATE POLICY "Users read own measurements" ON public.body_measurements FOR SELECT TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users insert own measurements" ON public.body_measurements;
CREATE POLICY "Users insert own measurements" ON public.body_measurements FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users update own measurements" ON public.body_measurements;
CREATE POLICY "Users update own measurements" ON public.body_measurements FOR UPDATE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());

DROP POLICY IF EXISTS "Users delete own measurements" ON public.body_measurements;
CREATE POLICY "Users delete own measurements" ON public.body_measurements FOR DELETE TO authenticated USING (user_id = auth.uid() AND public.is_approved_user());
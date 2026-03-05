
-- 1. Muscles: restringir UPDATE a admins
DROP POLICY "Authenticated users can toggle muscle active" ON public.muscles;
CREATE POLICY "Admins can update muscles"
  ON public.muscles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. user_roles: añadir políticas restrictivas para INSERT/UPDATE/DELETE
CREATE POLICY "Admins can insert user roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
  ON public.user_roles FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Actualizar política SELECT de user_roles para especificar TO authenticated
DROP POLICY "Users can read own roles" ON public.user_roles;
CREATE POLICY "Users can read own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 4. profiles: recrear políticas con TO authenticated
DROP POLICY "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. body_measurements: recrear políticas con TO authenticated
DROP POLICY "Users read own measurements" ON public.body_measurements;
CREATE POLICY "Users read own measurements"
  ON public.body_measurements FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY "Users insert own measurements" ON public.body_measurements;
CREATE POLICY "Users insert own measurements"
  ON public.body_measurements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY "Users update own measurements" ON public.body_measurements;
CREATE POLICY "Users update own measurements"
  ON public.body_measurements FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY "Users delete own measurements" ON public.body_measurements;
CREATE POLICY "Users delete own measurements"
  ON public.body_measurements FOR DELETE TO authenticated
  USING (user_id = auth.uid());

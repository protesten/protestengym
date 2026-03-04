
-- 1. Add is_approved column to profiles
ALTER TABLE public.profiles ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- 2. Update handle_new_user trigger to explicitly set is_approved = false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, avatar_url, is_approved)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    false
  );
  RETURN NEW;
END;
$function$;

-- 3. Add RLS policy: admins can read all profiles
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Add RLS policy: admins can update all profiles
CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. Approve existing users (set current profiles to approved)
UPDATE public.profiles SET is_approved = true;


-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can update muscles" ON public.muscles;

-- Create a more restrictive policy: only allow updating is_active
CREATE POLICY "Authenticated users can toggle muscle active"
  ON public.muscles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create a trigger to only allow updating is_active column
CREATE OR REPLACE FUNCTION public.muscles_update_restrict()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow changing is_active, keep everything else the same
  NEW.id := OLD.id;
  NEW.name := OLD.name;
  NEW.recovery_category := OLD.recovery_category;
  NEW.body_region := OLD.body_region;
  RETURN NEW;
END;
$$;

CREATE TRIGGER muscles_restrict_update
  BEFORE UPDATE ON public.muscles
  FOR EACH ROW
  EXECUTE FUNCTION public.muscles_update_restrict();

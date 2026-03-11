DROP TRIGGER IF EXISTS on_profile_created_notify_admin ON public.profiles;
DROP FUNCTION IF EXISTS public.notify_admin_new_user();
DROP EXTENSION IF EXISTS pg_net;
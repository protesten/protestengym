
-- Enable pg_net for HTTP calls from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create function to notify admin on new user
CREATE OR REPLACE FUNCTION public.notify_admin_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets
  SELECT decrypted_secret INTO supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
  SELECT decrypted_secret INTO service_role_key FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;
  
  -- Call edge function
  PERFORM extensions.http_post(
    url := supabase_url || '/functions/v1/notify-admin-new-user',
    body := json_build_object('record', json_build_object('user_id', NEW.user_id, 'display_name', NEW.display_name))::text,
    headers := json_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || service_role_key)::jsonb
  );
  
  RETURN NEW;
END;
$function$;

-- Create trigger on profiles insert
CREATE TRIGGER on_profile_created_notify_admin
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_admin_new_user();

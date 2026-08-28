
-- Fix has_role: remove the auth.uid() IS NULL bypass
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR auth.role() = 'service_role')
  );
$function$;

-- Restrict EXECUTE on internal SECURITY DEFINER functions that shouldn't be
-- directly callable by signed-in users.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.current_role_label() FROM PUBLIC, anon, authenticated;

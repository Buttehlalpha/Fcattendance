
-- 1) Remove duplicate permissive SELECT policy on courses
DROP POLICY IF EXISTS "courses readable" ON public.courses;

-- 2) Add explicit admin-only write policies on user_roles and lock down anon
DROP POLICY IF EXISTS "admins manage user roles" ON public.user_roles;
CREATE POLICY "admins manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

REVOKE ALL ON public.user_roles FROM anon;

-- 3) Restrict has_role() so signed-in users can only ask about themselves.
--    RLS policies always pass auth.uid(), so this doesn't affect them.
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (_user_id = auth.uid() OR auth.uid() IS NULL OR auth.role() = 'service_role')
  );
$$;

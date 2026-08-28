-- Allow authenticated users to read profiles of lecturers (needed for browsing courses)
CREATE POLICY "lecturer profiles visible to authenticated"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(id, 'lecturer'::public.app_role));
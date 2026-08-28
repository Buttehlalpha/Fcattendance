
-- 1) Attendance UPDATE/DELETE by session lecturer or admin
DROP POLICY IF EXISTS "Lecturers or admins can update attendance" ON public.attendance;
CREATE POLICY "Lecturers or admins can update attendance"
ON public.attendance FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = attendance.session_id AND s.lecturer_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = attendance.session_id AND s.lecturer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Lecturers or admins can delete attendance" ON public.attendance;
CREATE POLICY "Lecturers or admins can delete attendance"
ON public.attendance FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = attendance.session_id AND s.lecturer_id = auth.uid()
  )
);

-- 2) session_tokens UPDATE/DELETE by owning lecturer or admin
DROP POLICY IF EXISTS "Lecturers or admins can update tokens" ON public.session_tokens;
CREATE POLICY "Lecturers or admins can update tokens"
ON public.session_tokens FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tokens.session_id AND s.lecturer_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tokens.session_id AND s.lecturer_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Lecturers or admins can delete tokens" ON public.session_tokens;
CREATE POLICY "Lecturers or admins can delete tokens"
ON public.session_tokens FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tokens.session_id AND s.lecturer_id = auth.uid()
  )
);

-- 3) Courses read: keep authenticated browsing (product requirement: students browse all courses),
--    but scope the policy explicitly to the `authenticated` role instead of PUBLIC.
DROP POLICY IF EXISTS "Courses readable" ON public.courses;
DROP POLICY IF EXISTS "Courses readable by authenticated" ON public.courses;
CREATE POLICY "Courses readable by authenticated"
ON public.courses FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.courses FROM anon;

-- 4) Revoke direct execute on the SECURITY DEFINER signup helper.
--    It is only invoked by the auth trigger, never by clients.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

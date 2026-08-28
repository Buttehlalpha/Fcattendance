
-- profiles
DROP POLICY IF EXISTS "profiles readable to authed" ON public.profiles;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    JOIN public.courses c ON c.id = e.course_id
    WHERE e.student_id = profiles.id AND c.lecturer_id = auth.uid()
  )
);

-- sessions
DROP POLICY IF EXISTS "sessions readable to authed" ON public.sessions;
CREATE POLICY "sessions readable to participants" ON public.sessions FOR SELECT TO authenticated
USING (
  lecturer_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.enrollments e
    WHERE e.course_id = sessions.course_id AND e.student_id = auth.uid()
  )
);

-- session_tokens: restrict to lecturer/admin only
DROP POLICY IF EXISTS "tokens readable to authed" ON public.session_tokens;
CREATE POLICY "tokens readable to lecturer" ON public.session_tokens FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_tokens.session_id AND s.lecturer_id = auth.uid()
  )
);

-- Remove session_tokens from realtime publication so tokens are not broadcast
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='session_tokens') THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.session_tokens';
  END IF;
END $$;

-- Revoke execute on internal helper from client roles
REVOKE EXECUTE ON FUNCTION public.current_role_label() FROM PUBLIC, anon, authenticated;

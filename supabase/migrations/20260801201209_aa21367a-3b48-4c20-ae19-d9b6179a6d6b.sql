-- 1) Face enrollment storage
CREATE TABLE public.face_enrollments (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  image_base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.face_enrollments TO authenticated;
GRANT ALL ON public.face_enrollments TO service_role;

ALTER TABLE public.face_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own face" ON public.face_enrollments
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_face_enrollments_updated_at
  BEFORE UPDATE ON public.face_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) Face result columns on attendance
ALTER TABLE public.attendance
  ADD COLUMN IF NOT EXISTS face_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS face_score INTEGER;

-- 3) Server-only attendance marking (face result decided server-side)
CREATE OR REPLACE FUNCTION public.mark_attendance_for(
  _uid uuid,
  _token text,
  _lat double precision,
  _lon double precision,
  _device_hash text,
  _face_verified boolean DEFAULT false,
  _face_score integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tok record;
  _sess record;
  _dist double precision;
  _course record;
  _cleaned text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  _cleaned := trim(_token);

  SELECT id, session_id, expires_at INTO _tok
  FROM public.session_tokens
  WHERE (token = _cleaned OR pin_code = _cleaned)
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF _tok.id IS NULL THEN
    IF EXISTS (SELECT 1 FROM public.session_tokens WHERE token = _cleaned OR pin_code = _cleaned) THEN
      RAISE EXCEPTION 'This code expired. Ask lecturer for the current code.';
    END IF;
    RAISE EXCEPTION 'Invalid code. Check the numbers and try again.';
  END IF;

  SELECT id, status, latitude, longitude, radius_meters, course_id INTO _sess
  FROM public.sessions WHERE id = _tok.session_id;

  IF _sess.status <> 'active' THEN
    RAISE EXCEPTION 'Session is no longer active.';
  END IF;

  IF _sess.latitude IS NOT NULL AND _sess.longitude IS NOT NULL
     AND _lat IS NOT NULL AND _lon IS NOT NULL THEN
    _dist := 2 * 6371000 * asin(sqrt(
      power(sin(radians(_lat - _sess.latitude)/2), 2)
      + cos(radians(_sess.latitude)) * cos(radians(_lat))
      * power(sin(radians(_lon - _sess.longitude)/2), 2)
    ));
    IF _dist > COALESCE(_sess.radius_meters, 50) THEN
      RAISE EXCEPTION 'You are % m away — must be within % m of the lecture hall.',
        round(_dist)::int, COALESCE(_sess.radius_meters, 50);
    END IF;
  END IF;

  BEGIN
    INSERT INTO public.attendance (session_id, student_id, device_hash, latitude, longitude, face_verified, face_score)
    VALUES (_sess.id, _uid, _device_hash, _lat, _lon, COALESCE(_face_verified, false), _face_score);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already signed in for this session.';
  END;

  SELECT code, title INTO _course FROM public.courses WHERE id = _sess.course_id;
  RETURN jsonb_build_object('code', _course.code, 'title', _course.title);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_attendance_for(uuid, text, double precision, double precision, text, boolean, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_attendance_for(uuid, text, double precision, double precision, text, boolean, integer) TO service_role;

-- Old client-callable path is retired in favour of the verified server path
REVOKE ALL ON FUNCTION public.mark_attendance(text, double precision, double precision, text) FROM PUBLIC, anon, authenticated;
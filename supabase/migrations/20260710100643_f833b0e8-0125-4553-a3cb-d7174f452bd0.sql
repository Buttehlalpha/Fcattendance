
CREATE OR REPLACE FUNCTION public.mark_attendance(
  _token text,
  _lat double precision,
  _lon double precision,
  _device_hash text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tok record;
  _sess record;
  _dist double precision;
  _course record;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT id, session_id, expires_at INTO _tok
  FROM public.session_tokens
  WHERE token = _token
  LIMIT 1;

  IF _tok.id IS NULL THEN
    RAISE EXCEPTION 'Invalid QR code. Ask lecturer to display a fresh one.';
  END IF;

  IF _tok.expires_at < now() THEN
    RAISE EXCEPTION 'This code expired. Scan the new one on screen.';
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
    INSERT INTO public.attendance (session_id, student_id, device_hash, latitude, longitude)
    VALUES (_sess.id, _uid, _device_hash, _lat, _lon);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already signed in for this session.';
  END;

  SELECT code, title INTO _course FROM public.courses WHERE id = _sess.course_id;
  RETURN jsonb_build_object('code', _course.code, 'title', _course.title);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_attendance(text, double precision, double precision, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_attendance(text, double precision, double precision, text) TO authenticated;

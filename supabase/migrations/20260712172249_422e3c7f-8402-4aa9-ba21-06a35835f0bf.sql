-- Add 6-digit pin code to session_tokens as alternative to QR
ALTER TABLE public.session_tokens ADD COLUMN IF NOT EXISTS pin_code text;
CREATE INDEX IF NOT EXISTS idx_session_tokens_pin ON public.session_tokens(pin_code) WHERE pin_code IS NOT NULL;

-- Update mark_attendance to accept either QR token or 6-digit pin
CREATE OR REPLACE FUNCTION public.mark_attendance(_token text, _lat double precision, _lon double precision, _device_hash text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
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

  -- Look up by full QR token OR 6-digit pin (case-insensitive), only unexpired
  SELECT id, session_id, expires_at INTO _tok
  FROM public.session_tokens
  WHERE (token = _cleaned OR pin_code = _cleaned)
    AND expires_at > now()
  ORDER BY expires_at DESC
  LIMIT 1;

  IF _tok.id IS NULL THEN
    -- Was it valid but expired?
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
    INSERT INTO public.attendance (session_id, student_id, device_hash, latitude, longitude)
    VALUES (_sess.id, _uid, _device_hash, _lat, _lon);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'You have already signed in for this session.';
  END;

  SELECT code, title INTO _course FROM public.courses WHERE id = _sess.course_id;
  RETURN jsonb_build_object('code', _course.code, 'title', _course.title);
END;
$function$;
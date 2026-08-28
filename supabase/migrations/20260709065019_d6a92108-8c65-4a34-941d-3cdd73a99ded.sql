-- Allow lecturers to create and delete their own courses
CREATE POLICY "lecturers create own courses" ON public.courses
  FOR INSERT TO authenticated
  WITH CHECK (lecturer_id = auth.uid() AND public.has_role(auth.uid(), 'lecturer'));

CREATE POLICY "lecturers delete own courses" ON public.courses
  FOR DELETE TO authenticated
  USING (lecturer_id = auth.uid());
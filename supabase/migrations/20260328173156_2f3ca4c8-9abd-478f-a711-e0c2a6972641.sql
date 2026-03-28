CREATE POLICY "Creator can view own group"
ON public.groups
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);
CREATE POLICY "Group members can view other members profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT gm.user_id FROM public.group_members gm
    WHERE gm.group_id = public.get_user_group_id(auth.uid())
  )
);
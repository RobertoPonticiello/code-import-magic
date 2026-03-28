
-- Function to lookup group by invite code (needed before user is a member)
CREATE OR REPLACE FUNCTION public.lookup_group_by_invite_code(_code text)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.groups WHERE invite_code = _code LIMIT 1;
$$;

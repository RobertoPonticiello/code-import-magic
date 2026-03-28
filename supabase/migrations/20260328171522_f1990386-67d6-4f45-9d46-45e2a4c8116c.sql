
-- Add flagged column to completed_actions
ALTER TABLE public.completed_actions ADD COLUMN IF NOT EXISTS flagged boolean NOT NULL DEFAULT false;

-- Groups table
CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- Group members table
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  crowns integer NOT NULL DEFAULT 0,
  UNIQUE(group_id, user_id)
);
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- Action flags table
CREATE TABLE public.action_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES public.completed_actions(id) ON DELETE CASCADE,
  flagged_by uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(action_id, flagged_by)
);
ALTER TABLE public.action_flags ENABLE ROW LEVEL SECURITY;

-- Weekly winners table
CREATE TABLE public.weekly_winners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_start date NOT NULL,
  total_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, week_start)
);
ALTER TABLE public.weekly_winners ENABLE ROW LEVEL SECURITY;

-- Helper: check if user is member of a group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id uuid, _group_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = _user_id AND group_id = _group_id);
$$;

-- Helper: get user's group id
CREATE OR REPLACE FUNCTION public.get_user_group_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT group_id FROM public.group_members WHERE user_id = _user_id LIMIT 1;
$$;

-- RLS for groups
CREATE POLICY "Members can view their group" ON public.groups FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), id));
CREATE POLICY "Authenticated users can create groups" ON public.groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- RLS for group_members
CREATE POLICY "Members can view group members" ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- RLS for action_flags
CREATE POLICY "Members can view flags in their group" ON public.action_flags FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "Members can flag actions" ON public.action_flags FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = flagged_by AND public.is_group_member(auth.uid(), group_id));

-- RLS for weekly_winners
CREATE POLICY "Members can view winners" ON public.weekly_winners FOR SELECT TO authenticated
  USING (public.is_group_member(auth.uid(), group_id));

-- RLS: group members can view each other's completed_actions
CREATE POLICY "Group members can view group actions" ON public.completed_actions FOR SELECT TO authenticated
  USING (
    user_id IN (
      SELECT gm.user_id FROM public.group_members gm
      WHERE gm.group_id = public.get_user_group_id(auth.uid())
    )
  );

-- Trigger: limit group to 5 members
CREATE OR REPLACE FUNCTION public.check_group_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE member_count integer;
BEGIN
  SELECT count(*) INTO member_count FROM public.group_members WHERE group_id = NEW.group_id;
  IF member_count >= 5 THEN
    RAISE EXCEPTION 'Il gruppo può avere al massimo 5 membri';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_group_member_limit
  BEFORE INSERT ON public.group_members
  FOR EACH ROW EXECUTE FUNCTION public.check_group_member_limit();

-- Trigger: check flags and penalize
CREATE OR REPLACE FUNCTION public.check_flags_and_penalize()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  flag_count integer;
  v_action completed_actions%ROWTYPE;
BEGIN
  SELECT count(*) INTO flag_count FROM public.action_flags WHERE action_id = NEW.action_id;
  IF flag_count >= 2 THEN
    SELECT * INTO v_action FROM public.completed_actions WHERE id = NEW.action_id;
    IF NOT v_action.flagged THEN
      UPDATE public.completed_actions SET flagged = true WHERE id = NEW.action_id;
      UPDATE public.user_stats SET
        xp = GREATEST(xp - 50, 0),
        total_co2_grams = GREATEST(total_co2_grams - v_action.co2_grams, 0),
        updated_at = now()
      WHERE user_id = v_action.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_action_flags
  AFTER INSERT ON public.action_flags
  FOR EACH ROW EXECUTE FUNCTION public.check_flags_and_penalize();

-- Function to resolve weekly winners (called by edge function)
CREATE OR REPLACE FUNCTION public.resolve_weekly_winners()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_group RECORD;
  v_winner RECORD;
  v_week_start date := date_trunc('week', now() - interval '1 day')::date;
BEGIN
  FOR v_group IN SELECT DISTINCT group_id FROM public.group_members LOOP
    SELECT gm.user_id, COALESCE(SUM(ca.co2_grams), 0) as total_points
    INTO v_winner
    FROM public.group_members gm
    LEFT JOIN public.completed_actions ca ON ca.user_id = gm.user_id
      AND ca.completed_at >= v_week_start::timestamptz
      AND ca.completed_at < (v_week_start + 7)::timestamptz
      AND ca.flagged = false
    WHERE gm.group_id = v_group.group_id
    GROUP BY gm.user_id
    ORDER BY total_points DESC
    LIMIT 1;

    IF v_winner IS NOT NULL AND v_winner.total_points > 0 THEN
      INSERT INTO public.weekly_winners (group_id, user_id, week_start, total_points)
      VALUES (v_group.group_id, v_winner.user_id, v_week_start, v_winner.total_points)
      ON CONFLICT (group_id, week_start) DO NOTHING;

      UPDATE public.group_members SET crowns = crowns + 1
      WHERE group_id = v_group.group_id AND user_id = v_winner.user_id;
    END IF;
  END LOOP;
END;
$$;


-- 1. Completed actions: tracks which actions a user has completed
CREATE TABLE public.completed_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action_title text NOT NULL,
  action_description text,
  action_icon text DEFAULT '🌱',
  action_category text NOT NULL DEFAULT 'energia',
  action_difficulty text NOT NULL DEFAULT 'facile',
  co2_grams integer NOT NULL DEFAULT 0,
  completed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.completed_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own completed actions"
  ON public.completed_actions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completed actions"
  ON public.completed_actions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completed actions"
  ON public.completed_actions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. Community reports
CREATE TABLE public.community_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('discarica', 'spreco_idrico', 'aria', 'rumore', 'verde')),
  title text NOT NULL,
  description text NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  address text DEFAULT '',
  severity text NOT NULL CHECK (severity IN ('bassa', 'media', 'alta', 'critica')),
  status text NOT NULL DEFAULT 'aperta' CHECK (status IN ('aperta', 'in_corso', 'risolta')),
  votes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view reports
CREATE POLICY "Anyone can view reports"
  ON public.community_reports FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can create reports"
  ON public.community_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON public.community_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 3. Report votes (prevent double-voting)
CREATE TABLE public.report_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  report_id uuid REFERENCES public.community_reports(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, report_id)
);

ALTER TABLE public.report_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes"
  ON public.report_votes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own votes"
  ON public.report_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.report_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 4. Carbon profiles: store Carbon Mirror results
CREATE TABLE public.carbon_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  transport double precision NOT NULL DEFAULT 0,
  diet double precision NOT NULL DEFAULT 0,
  home double precision NOT NULL DEFAULT 0,
  shopping double precision NOT NULL DEFAULT 0,
  total double precision NOT NULL DEFAULT 0,
  answers jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.carbon_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own carbon profile"
  ON public.carbon_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own carbon profile"
  ON public.carbon_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own carbon profile"
  ON public.carbon_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- 5. User stats: streak, totals
CREATE TABLE public.user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  streak_days integer NOT NULL DEFAULT 0,
  last_action_date date,
  total_actions integer NOT NULL DEFAULT 0,
  total_co2_grams integer NOT NULL DEFAULT 0,
  total_reports integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
  ON public.user_stats FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.user_stats FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.user_stats FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Anyone can view stats for leaderboard
CREATE POLICY "Anyone can view all stats for leaderboard"
  ON public.user_stats FOR SELECT TO authenticated
  USING (true);

-- 6. Function to increment report votes atomically
CREATE OR REPLACE FUNCTION public.vote_report(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.report_votes (user_id, report_id) VALUES (auth.uid(), p_report_id);
  UPDATE public.community_reports SET votes = votes + 1 WHERE id = p_report_id;
EXCEPTION WHEN unique_violation THEN
  -- User already voted, remove vote
  DELETE FROM public.report_votes WHERE user_id = auth.uid() AND report_id = p_report_id;
  UPDATE public.community_reports SET votes = GREATEST(votes - 1, 0) WHERE id = p_report_id;
END;
$$;

-- 7. Function to update user stats when action completed
CREATE OR REPLACE FUNCTION public.on_action_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today date := CURRENT_DATE;
  v_last date;
  v_streak integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Upsert user_stats
    INSERT INTO public.user_stats (user_id, total_actions, total_co2_grams, xp, last_action_date, streak_days)
    VALUES (NEW.user_id, 1, NEW.co2_grams, 50, v_today, 1)
    ON CONFLICT (user_id) DO UPDATE SET
      total_actions = user_stats.total_actions + 1,
      total_co2_grams = user_stats.total_co2_grams + NEW.co2_grams,
      xp = user_stats.xp + 50,
      streak_days = CASE
        WHEN user_stats.last_action_date = v_today - 1 THEN user_stats.streak_days + 1
        WHEN user_stats.last_action_date = v_today THEN user_stats.streak_days
        ELSE 1
      END,
      last_action_date = v_today,
      updated_at = now();
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.user_stats SET
      total_actions = GREATEST(total_actions - 1, 0),
      total_co2_grams = GREATEST(total_co2_grams - OLD.co2_grams, 0),
      xp = GREATEST(xp - 50, 0),
      updated_at = now()
    WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER trg_action_completed
  AFTER INSERT OR DELETE ON public.completed_actions
  FOR EACH ROW EXECUTE FUNCTION public.on_action_completed();

-- 8. Auto-increment report count in user_stats
CREATE OR REPLACE FUNCTION public.on_report_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, total_reports, xp)
  VALUES (NEW.user_id, 1, 100)
  ON CONFLICT (user_id) DO UPDATE SET
    total_reports = user_stats.total_reports + 1,
    xp = user_stats.xp + 100,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_report_created
  AFTER INSERT ON public.community_reports
  FOR EACH ROW EXECUTE FUNCTION public.on_report_created();

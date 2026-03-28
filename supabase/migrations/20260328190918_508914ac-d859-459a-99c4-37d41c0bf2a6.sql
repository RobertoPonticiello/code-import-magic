-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  icon text DEFAULT '🔔',
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

CREATE INDEX idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- Trigger: notify group members when someone completes an action
CREATE OR REPLACE FUNCTION public.notify_group_on_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_group_id uuid;
  v_display_name text;
  v_member RECORD;
BEGIN
  SELECT group_id INTO v_group_id FROM public.group_members WHERE user_id = NEW.user_id LIMIT 1;
  IF v_group_id IS NULL THEN RETURN NEW; END IF;

  SELECT display_name INTO v_display_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  v_display_name := COALESCE(v_display_name, 'Utente');

  FOR v_member IN SELECT user_id FROM public.group_members WHERE group_id = v_group_id AND user_id != NEW.user_id LOOP
    INSERT INTO public.notifications (user_id, type, title, body, icon)
    VALUES (v_member.user_id, 'action_completed', v_display_name || ' ha completato un''azione!', 
            v_display_name || ' ha completato "' || NEW.action_title || '" risparmiando ' || NEW.co2_grams || 'g di CO2', 
            COALESCE(NEW.action_icon, '🌱'));
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_group_on_action
AFTER INSERT ON public.completed_actions
FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_action();

-- Trigger: notify user when their action is flagged
CREATE OR REPLACE FUNCTION public.notify_on_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action completed_actions%ROWTYPE;
  v_flagger_name text;
  v_flag_count integer;
BEGIN
  SELECT * INTO v_action FROM public.completed_actions WHERE id = NEW.action_id;
  IF v_action IS NULL THEN RETURN NEW; END IF;

  SELECT display_name INTO v_flagger_name FROM public.profiles WHERE user_id = NEW.flagged_by LIMIT 1;
  v_flagger_name := COALESCE(v_flagger_name, 'Qualcuno');

  SELECT count(*) INTO v_flag_count FROM public.action_flags WHERE action_id = NEW.action_id;

  INSERT INTO public.notifications (user_id, type, title, body, icon)
  VALUES (v_action.user_id, 'action_flagged', 'Azione segnalata! 🚩',
          v_flagger_name || ' ha segnalato la tua azione "' || v_action.action_title || '". Segnalazioni: ' || v_flag_count || '/2',
          '🚩');

  IF v_flag_count >= 2 AND NOT v_action.flagged THEN
    INSERT INTO public.notifications (user_id, type, title, body, icon)
    VALUES (v_action.user_id, 'action_invalidated', 'Azione invalidata!',
            'La tua azione "' || v_action.action_title || '" e stata invalidata dopo 2 segnalazioni. I punti sono stati sottratti.',
            '⚠️');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_on_flag
AFTER INSERT ON public.action_flags
FOR EACH ROW EXECUTE FUNCTION public.notify_on_flag();

-- Trigger: notify group when someone joins
CREATE OR REPLACE FUNCTION public.notify_group_on_join()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_display_name text;
  v_group_name text;
  v_member RECORD;
BEGIN
  SELECT display_name INTO v_display_name FROM public.profiles WHERE user_id = NEW.user_id LIMIT 1;
  v_display_name := COALESCE(v_display_name, 'Qualcuno');

  SELECT name INTO v_group_name FROM public.groups WHERE id = NEW.group_id LIMIT 1;

  FOR v_member IN SELECT user_id FROM public.group_members WHERE group_id = NEW.group_id AND user_id != NEW.user_id LOOP
    INSERT INTO public.notifications (user_id, type, title, body, icon)
    VALUES (v_member.user_id, 'member_joined', 'Nuovo membro!',
            v_display_name || ' si e unito al gruppo "' || COALESCE(v_group_name, 'il tuo gruppo') || '"',
            '👋');
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_group_on_join
AFTER INSERT ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.notify_group_on_join();

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
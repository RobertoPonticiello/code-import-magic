import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EcoAction } from "@/lib/mockData";

// ─── Completed Actions ───

export interface CompletedAction {
  id: string;
  action_title: string;
  action_description: string | null;
  action_icon: string;
  action_category: string;
  action_difficulty: string;
  co2_grams: number;
  completed_at: string;
}

export function useCompletedActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<CompletedAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user) { setActions([]); setLoading(false); return; }
    const { data } = await supabase
      .from("completed_actions")
      .select("*")
      .eq("user_id", user.id)
      .gte("completed_at", new Date().toISOString().split("T")[0])
      .order("completed_at", { ascending: false });
    setActions((data as CompletedAction[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const completeAction = async (action: EcoAction) => {
    if (!user) return null;
    const { data, error } = await supabase.from("completed_actions").insert({
      user_id: user.id,
      action_title: action.title,
      action_description: action.description,
      action_icon: action.icon,
      action_category: action.category,
      action_difficulty: action.difficulty,
      co2_grams: action.co2_grams,
    }).select().single();
    if (!error && data) {
      setActions((p) => [data as CompletedAction, ...p]);
    }
    return data;
  };

  const uncompleteAction = async (actionTitle: string) => {
    if (!user) return;
    const found = actions.find((a) => a.action_title === actionTitle);
    if (!found) return;
    const { error } = await supabase.from("completed_actions").delete().eq("id", found.id);
    if (!error) {
      setActions((p) => p.filter((a) => a.id !== found.id));
    }
  };

  const isCompleted = (actionTitle: string) => actions.some((a) => a.action_title === actionTitle);

  const todayCo2 = actions.reduce((sum, a) => sum + a.co2_grams, 0);

  return { actions, loading, completeAction, uncompleteAction, isCompleted, todayCo2, refetch: fetchActions };
}

// ─── All-time completed actions (for profile) ───

export function useAllCompletedActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<CompletedAction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setActions([]); setLoading(false); return; }
    supabase
      .from("completed_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setActions((data as CompletedAction[]) || []);
        setLoading(false);
      });
  }, [user]);

  return { actions, loading };
}

// ─── User Stats ───

export interface UserStats {
  streak_days: number;
  total_actions: number;
  total_co2_grams: number;
  total_reports: number;
  xp: number;
  last_action_date: string | null;
}

export function useUserStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) { setStats(null); setLoading(false); return; }
    const { data } = await supabase
      .from("user_stats")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    setStats(data ? {
      streak_days: data.streak_days,
      total_actions: data.total_actions,
      total_co2_grams: data.total_co2_grams,
      total_reports: data.total_reports,
      xp: data.xp,
      last_action_date: data.last_action_date,
    } : { streak_days: 0, total_actions: 0, total_co2_grams: 0, total_reports: 0, xp: 0, last_action_date: null });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}

// ─── Community Reports ───

export interface Report {
  id: string;
  user_id: string;
  type: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  address: string;
  severity: string;
  status: string;
  votes: number;
  created_at: string;
}

export function useCommunityReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("community_reports")
      .select("*")
      .order("created_at", { ascending: false });
    setReports((data as Report[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const createReport = async (report: Omit<Report, "id" | "user_id" | "votes" | "created_at" | "status">) => {
    if (!user) return null;
    const { data, error } = await supabase.from("community_reports").insert({
      user_id: user.id,
      ...report,
    }).select().single();
    if (!error && data) {
      setReports((p) => [data as Report, ...p]);
    }
    return data;
  };

  const voteReport = async (reportId: string) => {
    if (!user) return;
    await supabase.rpc("vote_report", { p_report_id: reportId });
    await fetchReports();
  };

  return { reports, loading, createReport, voteReport, refetch: fetchReports };
}

// ─── Carbon Profile ───

export interface CarbonProfileData {
  transport: number;
  diet: number;
  home: number;
  shopping: number;
  total: number;
  answers: Record<string, any>;
}

export function useCarbonProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CarbonProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setProfile(null); setLoading(false); return; }
    supabase
      .from("carbon_profiles")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setProfile({
            transport: data.transport,
            diet: data.diet,
            home: data.home,
            shopping: data.shopping,
            total: data.total,
            answers: (data.answers as Record<string, any>) || {},
          });
        }
        setLoading(false);
      });
  }, [user]);

  const saveProfile = async (p: CarbonProfileData) => {
    if (!user) return;
    // Upsert: delete old then insert new
    await supabase.from("carbon_profiles").delete().eq("user_id", user.id);
    await supabase.from("carbon_profiles").insert({
      user_id: user.id,
      transport: p.transport,
      diet: p.diet,
      home: p.home,
      shopping: p.shopping,
      total: p.total,
      answers: p.answers,
    });
    setProfile(p);
  };

  return { profile, loading, saveProfile };
}

// ─── Leaderboard ───

export interface LeaderboardEntry {
  rank: number;
  name: string;
  co2_kg: number;
  actions: number;
  streak: number;
  avatar: string;
  isUser?: boolean;
}

export function useLeaderboard() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      // Get top users by xp
      const { data: statsData } = await supabase
        .from("user_stats")
        .select("user_id, total_co2_grams, total_actions, streak_days, xp")
        .order("xp", { ascending: false })
        .limit(20);

      if (!statsData?.length) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Fetch profile names
      const userIds = statsData.map((s: any) => s.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Utente"; });

      const avatars = ["🧑‍💼", "👩‍🔬", "👨‍🎓", "👩‍🎨", "👨‍💻", "👩‍🏫", "🧑‍🌾", "👩‍⚕️"];
      const result: LeaderboardEntry[] = statsData.map((s: any, i: number) => ({
        rank: i + 1,
        name: nameMap[s.user_id] || "Utente",
        co2_kg: Math.round(s.total_co2_grams / 100) / 10,
        actions: s.total_actions,
        streak: s.streak_days,
        avatar: avatars[i % avatars.length],
        isUser: s.user_id === user?.id,
      }));

      setEntries(result);
      setLoading(false);
    })();
  }, [user]);

  return { entries, loading };
}

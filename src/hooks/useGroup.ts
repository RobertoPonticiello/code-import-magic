import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface GroupMember {
  user_id: string;
  display_name: string;
  crowns: number;
  joined_at: string;
}

export interface Group {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
}

export interface GroupActionEntry {
  id: string;
  user_id: string;
  display_name: string;
  action_title: string;
  action_description: string | null;
  action_category: string;
  co2_grams: number;
  completed_at: string;
  user_note: string | null;
  rating: number | null;
  image_url: string | null;
  flagged: boolean;
  flag_count: number;
  user_has_flagged: boolean;
}

export interface WeeklyLeaderboardEntry {
  user_id: string;
  display_name: string;
  crowns: number;
  week_points: number;
  rank: number;
}

export function useGroup() {
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchGroup = useCallback(async () => {
    if (!user) { setGroup(null); setMembers([]); setLoading(false); return; }

    // Get user's group membership
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) { setGroup(null); setMembers([]); setLoading(false); return; }

    // Get group info
    const { data: groupData } = await supabase
      .from("groups")
      .select("*")
      .eq("id", membership.group_id)
      .single();

    if (groupData) setGroup(groupData as Group);

    // Get members with display names
    const { data: membersData } = await supabase
      .from("group_members")
      .select("user_id, crowns, joined_at")
      .eq("group_id", membership.group_id);

    if (membersData) {
      const userIds = membersData.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Utente"; });

      setMembers(membersData.map((m: any) => ({
        user_id: m.user_id,
        display_name: nameMap[m.user_id] || "Utente",
        crowns: m.crowns,
        joined_at: m.joined_at,
      })));
    }

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);

  const createGroup = async (name: string) => {
    if (!user) return null;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase.from("groups").insert({
      name,
      created_by: user.id,
      invite_code: code,
    }).select().single();

    if (error) throw error;
    if (data) {
      // Add creator as member
      await supabase.from("group_members").insert({
        group_id: data.id,
        user_id: user.id,
      });
      await fetchGroup();
    }
    return data;
  };

  const joinGroup = async (inviteCode: string) => {
    if (!user) return null;
    // Use RPC to lookup group by invite code (bypasses RLS)
    const { data: groupId, error: lookupError } = await supabase
      .rpc("lookup_group_by_invite_code", { _code: inviteCode.toUpperCase() });

    if (lookupError || !groupId) throw new Error("Codice invito non valido");

    const { error } = await supabase.from("group_members").insert({
      group_id: groupId,
      user_id: user.id,
    });

    if (error) {
      if (error.message.includes("5 membri")) throw new Error("Il gruppo è pieno (max 5 membri)");
      if (error.code === "23505") throw new Error("Sei già in questo gruppo");
      throw error;
    }

    await fetchGroup();
    return { id: groupId };
  };

  const leaveGroup = async () => {
    if (!user || !group) return;
    await supabase.from("group_members").delete()
      .eq("group_id", group.id)
      .eq("user_id", user.id);
    setGroup(null);
    setMembers([]);
  };

  return { group, members, loading, createGroup, joinGroup, leaveGroup, refetch: fetchGroup };
}

export function useGroupActions() {
  const { user } = useAuth();
  const [actions, setActions] = useState<GroupActionEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = useCallback(async () => {
    if (!user) { setActions([]); setLoading(false); return; }

    // Get user's group
    const { data: membership } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!membership) { setActions([]); setLoading(false); return; }

    // Get all group member ids
    const { data: membersData } = await supabase
      .from("group_members")
      .select("user_id")
      .eq("group_id", membership.group_id);

    if (!membersData?.length) { setActions([]); setLoading(false); return; }

    const userIds = membersData.map((m: any) => m.user_id);

    // Get this week's start (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    // Get completed actions for this week
    const { data: actionsData } = await supabase
      .from("completed_actions")
      .select("*")
      .in("user_id", userIds)
      .gte("completed_at", weekStart.toISOString())
      .order("completed_at", { ascending: false });

    if (!actionsData?.length) { setActions([]); setLoading(false); return; }

    // Get display names
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const nameMap: Record<string, string> = {};
    profiles?.forEach((p: any) => { nameMap[p.user_id] = p.display_name || "Utente"; });

    // Get flags for these actions
    const actionIds = actionsData.map((a: any) => a.id);
    const { data: flagsData } = await supabase
      .from("action_flags")
      .select("action_id, flagged_by")
      .in("action_id", actionIds);

    const flagMap: Record<string, { count: number; userFlagged: boolean }> = {};
    flagsData?.forEach((f: any) => {
      if (!flagMap[f.action_id]) flagMap[f.action_id] = { count: 0, userFlagged: false };
      flagMap[f.action_id].count++;
      if (f.flagged_by === user.id) flagMap[f.action_id].userFlagged = true;
    });

    setActions(actionsData.map((a: any) => ({
      id: a.id,
      user_id: a.user_id,
      display_name: nameMap[a.user_id] || "Utente",
      action_title: a.action_title,
      action_description: a.action_description,
      action_category: a.action_category,
      co2_grams: a.co2_grams,
      completed_at: a.completed_at,
      user_note: a.user_note,
      rating: a.rating,
      image_url: a.image_url,
      flagged: a.flagged || false,
      flag_count: flagMap[a.id]?.count || 0,
      user_has_flagged: flagMap[a.id]?.userFlagged || false,
    })));

    setLoading(false);
  }, [user]);

  useEffect(() => { fetchActions(); }, [fetchActions]);

  const flagAction = async (actionId: string, groupId: string) => {
    if (!user) return;
    const { error } = await supabase.from("action_flags").insert({
      action_id: actionId,
      flagged_by: user.id,
      group_id: groupId,
    });
    if (error && error.code === "23505") return; // already flagged
    if (error) throw error;
    await fetchActions();
  };

  return { actions, loading, flagAction, refetch: fetchActions };
}

export function useGroupLeaderboard(members: GroupMember[], actions: GroupActionEntry[]) {
  const leaderboard: WeeklyLeaderboardEntry[] = members
    .map((m) => {
      const memberActions = actions.filter((a) => a.user_id === m.user_id && !a.flagged);
      const weekPoints = memberActions.reduce((sum, a) => sum + a.co2_grams, 0);
      return {
        user_id: m.user_id,
        display_name: m.display_name,
        crowns: m.crowns,
        week_points: weekPoints,
        rank: 0,
      };
    })
    .sort((a, b) => b.week_points - a.week_points)
    .map((entry, i) => ({ ...entry, rank: i + 1 }));

  return { leaderboard };
}

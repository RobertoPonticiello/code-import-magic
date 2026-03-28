import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface JackpotConfig {
  groupId: string;
  amountPerPerson: number; // €1-€5
  weekStart: string; // ISO date
  participants: string[]; // user_ids who paid
  active: boolean;
}

export interface MemberBalance {
  user_id: string;
  totalWon: number;
  totalPaid: number;
  net: number;
}

const STORAGE_KEY = "ecosignal_jackpot";

function getStoredJackpots(): Record<string, JackpotConfig> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch { return {}; }
}

function saveJackpots(data: Record<string, JackpotConfig>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Mock balances stored per group
const BALANCE_KEY = "ecosignal_balances";

export function getStoredBalances(groupId: string): Record<string, MemberBalance> {
  try {
    const all = JSON.parse(localStorage.getItem(BALANCE_KEY) || "{}");
    return all[groupId] || {};
  } catch { return {}; }
}

function saveBalances(groupId: string, balances: Record<string, MemberBalance>) {
  try {
    const all = JSON.parse(localStorage.getItem(BALANCE_KEY) || "{}");
    all[groupId] = balances;
    localStorage.setItem(BALANCE_KEY, JSON.stringify(all));
  } catch {}
}

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split("T")[0];
}

export function useJackpot(groupId: string | null, memberIds: string[]) {
  const { user } = useAuth();
  const [jackpot, setJackpot] = useState<JackpotConfig | null>(null);
  const [balances, setBalances] = useState<Record<string, MemberBalance>>({});

  const weekStart = getCurrentWeekStart();

  const refresh = useCallback(() => {
    if (!groupId) return;
    const all = getStoredJackpots();
    const current = all[groupId];
    // Only show if it's for this week
    if (current && current.weekStart === weekStart) {
      setJackpot(current);
    } else {
      setJackpot(null);
    }
    setBalances(getStoredBalances(groupId));
  }, [groupId, weekStart]);

  useEffect(() => { refresh(); }, [refresh]);

  const proposeJackpot = (amount: number) => {
    if (!groupId || !user) return;
    const clamped = Math.min(5, Math.max(1, Math.round(amount)));
    const all = getStoredJackpots();
    all[groupId] = {
      groupId,
      amountPerPerson: clamped,
      weekStart,
      participants: [user.id],
      active: true,
    };
    saveJackpots(all);
    refresh();
  };

  const joinJackpot = () => {
    if (!groupId || !user) return;
    const all = getStoredJackpots();
    const current = all[groupId];
    if (!current || current.participants.includes(user.id)) return;
    current.participants.push(user.id);
    all[groupId] = current;
    saveJackpots(all);
    refresh();
  };

  const cancelJackpot = () => {
    if (!groupId) return;
    const all = getStoredJackpots();
    delete all[groupId];
    saveJackpots(all);
    refresh();
  };

  // Simulate awarding the winner (for demo)
  const awardWinner = (winnerId: string) => {
    if (!groupId || !jackpot) return;
    const pot = jackpot.amountPerPerson * jackpot.participants.length;
    const b = getStoredBalances(groupId);
    // Each participant paid
    for (const uid of jackpot.participants) {
      if (!b[uid]) b[uid] = { user_id: uid, totalWon: 0, totalPaid: 0, net: 0 };
      b[uid].totalPaid += jackpot.amountPerPerson;
      b[uid].net = b[uid].totalWon - b[uid].totalPaid;
    }
    // Winner gets pot
    if (!b[winnerId]) b[winnerId] = { user_id: winnerId, totalWon: 0, totalPaid: 0, net: 0 };
    b[winnerId].totalWon += pot;
    b[winnerId].net = b[winnerId].totalWon - b[winnerId].totalPaid;
    saveBalances(groupId, b);
    // Clear jackpot for this week
    cancelJackpot();
  };

  const userHasJoined = jackpot?.participants.includes(user?.id || "") || false;
  const totalPot = jackpot ? jackpot.amountPerPerson * jackpot.participants.length : 0;

  const getMemberBalance = (userId: string): MemberBalance => {
    return balances[userId] || { user_id: userId, totalWon: 0, totalPaid: 0, net: 0 };
  };

  return {
    jackpot,
    userHasJoined,
    totalPot,
    balances,
    proposeJackpot,
    joinJackpot,
    cancelJackpot,
    awardWinner,
    getMemberBalance,
    refresh,
  };
}

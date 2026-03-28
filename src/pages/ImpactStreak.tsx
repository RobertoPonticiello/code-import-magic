import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, Medal, Lock, TrendingUp, Target, Users, Loader2, Euro } from "lucide-react";
import { co2GramsToEuros, formatEuros } from "@/lib/savingsUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getBadges, getWeeklyChallenges } from "@/lib/mockData";
import { useUserStats, useLeaderboard } from "@/hooks/useUserData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

function getLevel(xp: number) {
  const levels = [
    { min: 0, name: "Germoglio", next: 500 },
    { min: 500, name: "Arbusto", next: 1500 },
    { min: 1500, name: "Albero", next: 3500 },
    { min: 3500, name: "Eco Warrior", next: 7000 },
    { min: 7000, name: "Green Champion", next: 15000 },
    { min: 15000, name: "Leggenda Verde", next: 30000 },
  ];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) {
      const c = levels[i];
      return { level: i + 1, name: c.name, progress: Math.min(100, ((xp - c.min) / (c.next - c.min)) * 100), nextXp: c.next, xp };
    }
  }
  return { level: 1, name: "Germoglio", progress: 0, nextXp: 500, xp: 0 };
}

function BadgeGrid() {
  const badges = getBadges();
  const { stats } = useUserStats();

  // Dynamic unlock
  const isUnlocked = (id: string) => {
    if (!stats) return false;
    if (id === "b1") return stats.total_actions >= 1;
    if (id === "b2") return stats.total_actions >= 10;
    if (id === "b3") return stats.streak_days >= 7;
    if (id === "b4") return stats.total_co2_grams >= 5000;
    
    return false;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {badges.map((badge, i) => {
        const unlocked = isUnlocked(badge.id);
        return (
          <motion.div
            key={badge.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`relative p-4 rounded-xl border text-center transition-all ${
              unlocked
                ? "bg-card border-primary/20 shadow-sm hover:shadow-md"
                : "bg-muted/30 border-border opacity-60"
            }`}
          >
            {!unlocked && <Lock className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />}
            <div className="text-3xl mb-2">{badge.icon}</div>
            <p className="text-xs font-bold text-foreground">{badge.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
            {unlocked ? (
              <p className="text-[9px] text-primary font-medium mt-1">✓ Sbloccato</p>
            ) : (
              <p className="text-[9px] text-muted-foreground mt-1">{badge.requirement}</p>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

function Leaderboard() {
  const { entries, loading } = useLeaderboard();

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Nessun dato disponibile. Completa azioni per entrare in classifica!</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((user, i) => (
        <motion.div
          key={user.rank}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            user.isUser ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card border-border"
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            user.rank === 1 ? "bg-amber-400 text-amber-950" :
            user.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
            user.rank === 3 ? "bg-amber-600 text-amber-50" :
            "bg-muted text-muted-foreground"
          }`}>
            {user.rank <= 3 ? ["🥇", "🥈", "🥉"][user.rank - 1] : user.rank}
          </div>
          <span className="text-xl">{user.avatar}</span>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${user.isUser ? "text-primary" : "text-foreground"}`}>
              {user.name} {user.isUser && "(Tu)"}
            </p>
            <p className="text-[10px] text-muted-foreground">{user.actions} azioni · {user.streak} giorni streak</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-primary">{user.co2_kg} kg</p>
            <p className="text-[10px] text-muted-foreground">CO₂ risparmiata</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

function WeeklyChallenges() {
  const challenges = getWeeklyChallenges();
  return (
    <div className="space-y-4">
      {challenges.map((challenge, i) => {
        const pct = (challenge.progress / challenge.total) * 100;
        return (
          <motion.div key={challenge.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Card className="overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-bold text-foreground">{challenge.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{challenge.description}</p>
                  </div>
                  <span className="text-xs bg-accent text-accent-foreground px-2 py-1 rounded-full font-medium shrink-0">
                    {challenge.reward}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-bold text-foreground">{challenge.progress}/{challenge.total}</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </div>
                <div className="flex items-center gap-3 text-[10px] font-medium">
                  <span className="text-primary">Potenziale: {(challenge.co2_potential / 1000).toFixed(1)}kg CO₂</span>
                  <span className="text-emerald-600 dark:text-emerald-400">~{formatEuros(co2GramsToEuros(challenge.co2_potential))}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

export default function ImpactStreak() {
  const [tab, setTab] = useState<"badges" | "classifica" | "sfide">("sfide");
  const { stats, loading } = useUserStats();

  const xp = stats?.xp || 0;
  const levelInfo = getLevel(xp);

  const totalEuros = co2GramsToEuros(stats?.total_co2_grams || 0);
  const statCards = [
    { label: "Streak Corrente", value: `${stats?.streak_days || 0} giorni`, icon: Flame, color: "text-orange-600 dark:text-orange-400" },
    { label: "Azioni Totali", value: `${stats?.total_actions || 0}`, icon: Star, color: "text-amber-600 dark:text-amber-400" },
    { label: "CO₂ Risparmiata", value: `${((stats?.total_co2_grams || 0) / 1000).toFixed(1)} kg`, icon: TrendingUp, color: "text-primary" },
    { label: "€ Risparmiati", value: formatEuros(totalEuros), icon: Euro, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🏆 Impact Streak</h1>
        <p className="text-muted-foreground mt-1">Sfide, badge e classifiche per salvare il pianeta</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div key={stat.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
            <Card>
              <CardContent className="p-4 text-center">
                <stat.icon className={`w-6 h-6 mx-auto mb-2 ${stat.color}`} />
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">{stat.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Level */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6 flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-3xl">🌿</span>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-foreground">Livello {levelInfo.level} — {levelInfo.name}</h3>
                <span className="text-xs text-muted-foreground">{xp}/{levelInfo.nextXp} XP</span>
              </div>
              <Progress value={levelInfo.progress} className="h-3" />
              <p className="text-xs text-muted-foreground">{levelInfo.nextXp - xp} XP al prossimo livello</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[
            { id: "sfide" as const, label: "Sfide Settimanali", icon: Target },
            { id: "badges" as const, label: "Badge", icon: Trophy },
            { id: "classifica" as const, label: "Classifica", icon: Users },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {tab === "sfide" && <WeeklyChallenges />}
        {tab === "badges" && <BadgeGrid />}
        {tab === "classifica" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Classifica — Chi salva di più
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Leaderboard />
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}

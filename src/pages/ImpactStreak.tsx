import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, TrendingUp, Loader2, Euro, Gift, Clock } from "lucide-react";
import { co2GramsToEuros, formatEuros } from "@/lib/savingsUtils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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

const WEEKLY_PRIZES = [
  { rank: 1, emoji: "🥇", prize: "Buono EcoShop 50€", description: "Gift card per prodotti eco-sostenibili + Badge Oro + 1000 XP", color: "from-amber-400/20 to-amber-500/5 border-amber-400/30" },
  { rank: 2, emoji: "🥈", prize: "Buono EcoShop 35€", description: "Gift card per prodotti eco-sostenibili + Badge Argento + 750 XP", color: "from-slate-300/20 to-slate-400/5 border-slate-400/30" },
  { rank: 3, emoji: "🥉", prize: "Buono EcoShop 25€", description: "Gift card per prodotti eco-sostenibili + Badge Bronzo + 500 XP", color: "from-amber-600/20 to-amber-700/5 border-amber-600/30" },
  { rank: 4, emoji: "4️⃣", prize: "Buono EcoShop 20€", description: "Gift card + 400 XP Bonus", color: "" },
  { rank: 5, emoji: "5️⃣", prize: "Buono EcoShop 15€", description: "Gift card + 350 XP Bonus", color: "" },
  { rank: 6, emoji: "6️⃣", prize: "Buono EcoShop 12€", description: "Gift card + 300 XP Bonus", color: "" },
  { rank: 7, emoji: "7️⃣", prize: "Buono EcoShop 10€", description: "Gift card + 250 XP Bonus", color: "" },
  { rank: 8, emoji: "8️⃣", prize: "Buono EcoShop 8€", description: "Gift card + 200 XP Bonus", color: "" },
  { rank: 9, emoji: "9️⃣", prize: "Buono EcoShop 6€", description: "Gift card + 150 XP Bonus", color: "" },
  { rank: 10, emoji: "🔟", prize: "Buono EcoShop 5€", description: "Gift card + 100 XP Bonus", color: "" },
];

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState("");
  useEffect(() => {
    const calc = () => {
      const now = new Date();
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + (7 - now.getDay()) % 7 || 7);
      nextSunday.setHours(0, 0, 0, 0);
      if (now.getDay() === 0 && now.getHours() === 0 && now.getMinutes() === 0) {
        nextSunday.setDate(nextSunday.getDate() + 7);
      }
      const diff = nextSunday.getTime() - now.getTime();
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${d}g ${h}h ${m}m ${s}s`);
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, []);
  return timeLeft;
}

function LeaderboardWithPrizes() {
  const { entries, loading } = useLeaderboard();
  const countdown = useCountdown();

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          Classifica & Premi Settimanali
        </CardTitle>
        <div className="flex items-center gap-2 mt-2 bg-muted/50 rounded-lg px-3 py-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Premi sbloccati tra:</span>
          <span className="text-sm font-bold text-primary font-mono">{countdown}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nessun dato disponibile. Completa azioni per entrare in classifica!</p>
        ) : (
          entries.map((user, i) => {
            const prize = WEEKLY_PRIZES.find(p => p.rank === user.rank);
            return (
              <motion.div
                key={user.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  user.rank <= 3 && prize
                    ? `bg-gradient-to-r ${prize.color}`
                    : user.isUser
                      ? "bg-primary/5 border-primary/20 shadow-sm"
                      : "bg-card border-border"
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                  user.rank === 1 ? "bg-amber-400 text-amber-950" :
                  user.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                  user.rank === 3 ? "bg-amber-600 text-amber-50" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {user.rank <= 3 ? ["🥇", "🥈", "🥉"][user.rank - 1] : user.rank}
                </div>
                <span className="text-xl shrink-0">{user.avatar}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${user.isUser ? "text-primary" : "text-foreground"}`}>
                    {user.name} {user.isUser && "(Tu)"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{user.actions} azioni · {user.streak}g streak · {user.co2_kg} kg CO₂</p>
                </div>
                {prize && (
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary flex items-center gap-1 justify-end">
                      <Gift className="w-3 h-3" />
                      {prize.prize}
                    </p>
                    <p className="text-[9px] text-muted-foreground max-w-[120px] text-right">{prize.description}</p>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </CardContent>
    </Card>
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
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🏆 Classifica</h1>
        <p className="text-muted-foreground mt-1">Scala la classifica e vinci premi settimanali</p>
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

      {/* Leaderboard */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <LeaderboardWithPrizes />
      </motion.div>
    </div>
  );
}

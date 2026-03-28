import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Star, Medal, Lock, TrendingUp, Target, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getBadges, getLeaderboard, getWeeklyChallenges } from "@/lib/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

function BadgeGrid() {
  const badges = getBadges();
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {badges.map((badge, i) => (
        <motion.div
          key={badge.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          className={`relative p-4 rounded-xl border text-center transition-all ${
            badge.unlocked
              ? "bg-card border-primary/20 shadow-sm hover:shadow-md"
              : "bg-muted/30 border-border opacity-60"
          }`}
        >
          {!badge.unlocked && (
            <Lock className="w-3 h-3 text-muted-foreground absolute top-2 right-2" />
          )}
          <div className="text-3xl mb-2">{badge.icon}</div>
          <p className="text-xs font-bold text-foreground">{badge.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
          {badge.unlocked && badge.unlockedAt && (
            <p className="text-[9px] text-primary font-medium mt-1">
              ✓ Sbloccato
            </p>
          )}
          {!badge.unlocked && (
            <p className="text-[9px] text-muted-foreground mt-1">{badge.requirement}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}

function Leaderboard() {
  const users = getLeaderboard();
  return (
    <div className="space-y-2">
      {users.map((user, i) => (
        <motion.div
          key={user.rank}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
            user.isUser
              ? "bg-primary/5 border-primary/20 shadow-sm"
              : "bg-card border-border"
          }`}
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            user.rank === 1 ? "bg-amber-400 text-amber-900" :
            user.rank === 2 ? "bg-gray-300 text-gray-700" :
            user.rank === 3 ? "bg-amber-600 text-amber-100" :
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
          <motion.div
            key={challenge.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
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
                <p className="text-[10px] text-primary font-medium">
                  Potenziale risparmio: {(challenge.co2_potential / 1000).toFixed(1)}kg CO₂
                </p>
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

  const stats = [
    { label: "Streak Corrente", value: "7 giorni", icon: Flame, color: "text-orange-500" },
    { label: "Azioni Totali", value: "22", icon: Star, color: "text-amber-500" },
    { label: "CO₂ Risparmiata", value: "8.2 kg", icon: TrendingUp, color: "text-primary" },
    { label: "Posizione", value: "#3", icon: Medal, color: "text-blue-500" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🏆 Impact Streak</h1>
        <p className="text-muted-foreground mt-1">Sfide, badge e classifiche per salvare il pianeta</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
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
                <h3 className="font-bold text-foreground">Livello 4 — Eco Warrior</h3>
                <span className="text-xs text-muted-foreground">220/300 XP</span>
              </div>
              <Progress value={73} className="h-3" />
              <p className="text-xs text-muted-foreground">80 XP al prossimo livello: <span className="font-bold text-foreground">Green Champion</span></p>
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
                tab === t.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
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
                <Trophy className="w-5 h-5 text-amber-500" />
                Classifica Settimanale — Roma
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

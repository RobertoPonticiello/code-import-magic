import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Leaf, MapPin, Trophy, Flame, TrendingUp, Zap,
  Droplets, ShoppingBag, Car, Utensils, Home, Award,
  BarChart3, Target, TreePine, Recycle
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { getCarbonProfile, getBadges, type EcoAction } from "@/lib/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.45 } }),
};

// XP / level system
function getLevel(xp: number) {
  const levels = [
    { min: 0, name: "Germoglio", icon: "🌱", next: 500 },
    { min: 500, name: "Arbusto", icon: "🌿", next: 1500 },
    { min: 1500, name: "Albero", icon: "🌳", next: 3500 },
    { min: 3500, name: "Foresta", icon: "🏞️", next: 7000 },
    { min: 7000, name: "Ecosistema", icon: "🌍", next: 15000 },
    { min: 15000, name: "Leggenda Verde", icon: "👑", next: 30000 },
  ];
  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i].min) {
      const current = levels[i];
      const progressInLevel = xp - current.min;
      const levelRange = current.next - current.min;
      return {
        level: i + 1,
        name: current.name,
        icon: current.icon,
        xp,
        progress: Math.min(100, (progressInLevel / levelRange) * 100),
        nextXp: current.next,
      };
    }
  }
  return { level: 1, name: "Germoglio", icon: "🌱", xp: 0, progress: 0, nextXp: 500 };
}

export default function Profile() {
  const { user } = useAuth();
  const carbonProfile = getCarbonProfile();
  const badges = getBadges();

  // Pull completed actions from localStorage
  const completedActions: EcoAction[] = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("eco_completed_actions") || "[]"); }
    catch { return []; }
  }, []);

  const totalCo2Grams = completedActions.reduce((sum, a) => sum + (a.co2_grams || 0), 0);
  const totalCo2Kg = totalCo2Grams / 1000;

  // Fake cumulative stats (would come from DB in production)
  const stats = {
    totalActions: 22 + completedActions.length,
    totalCo2Kg: 8.2 + totalCo2Kg,
    streakDays: 7,
    reports: 3,
    treesEquiv: ((8.2 + totalCo2Kg) / 21).toFixed(1), // ~21kg CO2/tree/year
    kmSaved: ((8.2 + totalCo2Kg) * 5.5).toFixed(0),
  };

  const xp = stats.totalActions * 50 + stats.streakDays * 30 + stats.reports * 100;
  const levelInfo = getLevel(xp);

  const unlockedBadges = badges.filter((b) => b.unlocked);
  const lockedBadges = badges.filter((b) => !b.unlocked);

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Utente";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  // Category breakdown from carbon profile
  const categories = [
    { label: "Trasporti", value: carbonProfile.transport, icon: Car, color: "text-blue-500" },
    { label: "Alimentazione", value: carbonProfile.diet, icon: Utensils, color: "text-orange-500" },
    { label: "Casa", value: carbonProfile.home, icon: Home, color: "text-amber-500" },
    { label: "Acquisti", value: carbonProfile.shopping, icon: ShoppingBag, color: "text-purple-500" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      {/* Hero card: Avatar + Level + Key stats */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-transparent p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-2xl bg-primary flex items-center justify-center text-3xl font-bold text-primary-foreground shadow-lg">
                  {initials}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-card rounded-full px-2 py-0.5 border border-border shadow text-sm">
                  {levelInfo.icon}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center sm:text-left space-y-3">
                <div>
                  <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                  <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Roma, Italia</span>
                  </div>
                </div>

                {/* Level bar */}
                <div className="space-y-1.5 max-w-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground">
                      Lv. {levelInfo.level} — {levelInfo.name}
                    </span>
                    <span className="text-muted-foreground">{xp} / {levelInfo.nextXp} XP</span>
                  </div>
                  <Progress value={levelInfo.progress} className="h-2.5" />
                </div>

                {/* Quick stats row */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-4 pt-1">
                  {[
                    { icon: Flame, value: `${stats.streakDays}g`, label: "Streak" },
                    { icon: Leaf, value: `${stats.totalCo2Kg.toFixed(1)}kg`, label: "CO₂ salvati" },
                    { icon: Target, value: stats.totalActions, label: "Azioni" },
                    { icon: MapPin, value: stats.reports, label: "Segnalazioni" },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-1.5">
                      <s.icon className="w-4 h-4 text-primary" />
                      <span className="text-sm font-bold text-foreground">{s.value}</span>
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Alberi equivalenti", value: stats.treesEquiv, unit: "🌳", desc: "CO₂ assorbita/anno" },
          { title: "Km non percorsi", value: stats.kmSaved, unit: "🚗", desc: "in auto evitati" },
          { title: "Impronta annua", value: `${carbonProfile.total}t`, unit: "📊", desc: `Media IT: ${carbonProfile.nationalAvg}t` },
          { title: "Risparmio vs media", value: `${((1 - carbonProfile.total / carbonProfile.nationalAvg) * 100).toFixed(0)}%`, unit: "📉", desc: "sotto la media nazionale" },
        ].map((stat, i) => (
          <motion.div key={stat.title} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardContent className="p-4 text-center space-y-1">
                <span className="text-2xl">{stat.unit}</span>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs font-semibold text-muted-foreground">{stat.title}</p>
                <p className="text-[10px] text-muted-foreground">{stat.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Carbon breakdown */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card className="h-full">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Impronta per Categoria</h3>
              </div>
              <div className="space-y-3">
                {categories.map((cat) => {
                  const pct = (cat.value / carbonProfile.total) * 100;
                  return (
                    <div key={cat.label} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <cat.icon className={`w-4 h-4 ${cat.color}`} />
                          <span className="font-medium text-foreground">{cat.label}</span>
                        </div>
                        <span className="text-muted-foreground">{cat.value}t CO₂/anno</span>
                      </div>
                      <div className="h-2 bg-accent rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-2 border-t border-border flex justify-between text-xs text-muted-foreground">
                <span>Totale: <strong className="text-foreground">{carbonProfile.total}t</strong>/anno</span>
                <span>Media EU: {carbonProfile.europeanAvg}t</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Badges */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          <Card className="h-full">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-foreground">Badge</h3>
                </div>
                <span className="text-xs text-muted-foreground bg-accent px-2 py-1 rounded-full">
                  {unlockedBadges.length}/{badges.length}
                </span>
              </div>

              {/* Unlocked */}
              <div className="grid grid-cols-4 gap-3">
                {unlockedBadges.map((badge) => (
                  <div key={badge.id} className="text-center group" title={`${badge.name}: ${badge.description}`}>
                    <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                      {badge.icon}
                    </div>
                    <p className="text-[10px] font-medium text-foreground mt-1 truncate">{badge.name}</p>
                  </div>
                ))}
              </div>

              {/* Locked */}
              {lockedBadges.length > 0 && (
                <>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Da sbloccare</p>
                  <div className="grid grid-cols-4 gap-3">
                    {lockedBadges.map((badge) => (
                      <div key={badge.id} className="text-center opacity-40" title={`${badge.requirement}`}>
                        <div className="w-12 h-12 mx-auto rounded-xl bg-accent flex items-center justify-center text-2xl grayscale">
                          {badge.icon}
                        </div>
                        <p className="text-[10px] font-medium text-muted-foreground mt-1 truncate">{badge.name}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Azioni recenti completate */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={7}>
        <Card>
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Recycle className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-foreground">Azioni Completate di Recente</h3>
            </div>
            {completedActions.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {completedActions.slice(0, 6).map((action, i) => (
                  <div
                    key={action.id || i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
                  >
                    <span className="text-xl">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{action.title}</p>
                      <p className="text-xs text-primary font-bold">-{action.co2_grams}g CO₂</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nessuna azione completata ancora. Vai alla Dashboard per iniziare! 🌿
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Eco-tips */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={8}>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground text-sm">Come salire di livello</h3>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                  <li>✅ Completa azioni quotidiane → <strong className="text-foreground">+50 XP</strong> ciascuna</li>
                  <li>🔥 Mantieni la streak → <strong className="text-foreground">+30 XP</strong> al giorno</li>
                  <li>📍 Fai segnalazioni su Quartiere Vivo → <strong className="text-foreground">+100 XP</strong></li>
                  <li>🪞 Aggiorna il tuo Carbon Mirror periodicamente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

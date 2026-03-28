import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Wind, Thermometer, Leaf, TrendingUp, ArrowRight,
  CheckCircle2, Circle, Flame, RefreshCw, MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { getDailyActions, type EcoAction } from "@/lib/mockData";
import { useUserLocation } from "@/hooks/useUserLocation";
import { fetchAirQuality, fetchWeather, type AirQualityData, type WeatherData } from "@/lib/airQualityApi";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useCompletedActions, useUserStats } from "@/hooks/useUserData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5 } }),
};

function AqiIndicator({ level, color, pm25 }: { level: string; color: string; pm25: number }) {
  const colorMap: Record<string, string> = {
    green: "from-emerald-400 to-emerald-600",
    yellow: "from-amber-400 to-amber-500",
    orange: "from-orange-400 to-orange-600",
    red: "from-red-400 to-red-600",
  };
  return (
    <div className="relative flex items-center justify-center">
      <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${colorMap[color] || colorMap.yellow} flex items-center justify-center shadow-lg`}>
        <div className="text-center">
          <p className="text-lg font-bold text-white">{pm25}</p>
          <p className="text-[9px] text-white/80 font-medium">µg/m³</p>
        </div>
      </div>
    </div>
  );
}

const REGENERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/regenerate-actions`;

export function Dashboard() {
  const { user } = useAuth();
  const { location } = useUserLocation();
  const { toast } = useToast();
  const { actions: completedActions, completeAction, uncompleteAction, isCompleted, todayCo2, loading: actionsLoading } = useCompletedActions();
  const { stats, refetch: refetchStats } = useUserStats();

  const [aqData, setAqData] = useState<AirQualityData | null>(null);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [actions, setActions] = useState<EcoAction[]>(getDailyActions());
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchAirQuality(location.latitude, location.longitude),
      fetchWeather(location.latitude, location.longitude),
    ]).then(([aq, w]) => {
      setAqData(aq.current);
      setWeatherData(w);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [location.latitude, location.longitude]);

  const handleToggle = async (action: EcoAction) => {
    if (isCompleted(action.title)) {
      await uncompleteAction(action.title);
    } else {
      await completeAction(action);
    }
    // Refresh stats after a short delay for trigger to complete
    setTimeout(() => refetchStats(), 500);
  };

  const handleRegenerate = async () => {
    if (!feedback.trim()) {
      toast({ title: "Scrivi un feedback", description: "Dimmi cosa non va nelle azioni attuali", variant: "destructive" });
      return;
    }
    setRegenerating(true);
    try {
      const resp = await fetch(REGENERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          currentActions: actions,
          feedback,
          userCity: location.city || "Roma",
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Errore" }));
        toast({ title: "Errore", description: err.error || "Impossibile rigenerare le azioni", variant: "destructive" });
        setRegenerating(false);
        return;
      }

      const data = await resp.json();
      if (data.actions?.length) {
        setActions(data.actions);
        setFeedback("");
        setShowFeedback(false);
        toast({ title: "Azioni rigenerate! 🌿", description: "Le nuove azioni sono personalizzate in base al tuo feedback" });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Errore di connessione", description: "Riprova più tardi", variant: "destructive" });
    }
    setRegenerating(false);
  };

  const streakDays = stats?.streak_days || 0;
  const dailyGoalKg = 2;
  const co2SavedKg = todayCo2 / 1000;
  const goalProgress = Math.min(100, (co2SavedKg / dailyGoalKg) * 100);
  const completedCount = actions.filter((a) => isCompleted(a.title)).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Leaf className="w-12 h-12 text-primary" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Buongiorno{user?.user_metadata?.full_name ? `, ${user.user_metadata.full_name.split(' ')[0]}` : ''}! 🌿</h1>
            <p className="text-muted-foreground mt-1">
              {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })} — {location.city || "La tua posizione"}
            </p>
          </div>
          <div className="flex items-center gap-2 bg-accent rounded-xl px-4 py-2">
            <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span className="text-sm font-bold text-foreground">{streakDays} giorni di streak</span>
          </div>
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            title: "Qualità Aria",
            content: aqData ? <AqiIndicator level={aqData.level} color={aqData.color} pm25={aqData.pm25} /> : null,
            subtitle: aqData?.level || "—",
            icon: Wind,
          },
          {
            title: "Temperatura",
            content: <p className="text-3xl font-bold text-foreground">{weatherData?.temperature ?? "—"}°C</p>,
            subtitle: `Umidità ${weatherData?.humidity ?? "—"}%`,
            icon: Thermometer,
          },
          {
            title: "CO₂ Risparmiata",
            content: <p className="text-3xl font-bold text-primary">{co2SavedKg.toFixed(2)} kg</p>,
            subtitle: "con le azioni di oggi",
            icon: Leaf,
          },
          {
            title: "Obiettivo Giornaliero",
            content: (
              <div className="space-y-2 w-full">
                <div className="flex justify-between text-sm">
                  <span className="font-bold text-foreground">{goalProgress.toFixed(0)}%</span>
                  <span className="text-muted-foreground">{dailyGoalKg}kg</span>
                </div>
                <Progress value={goalProgress} className="h-3" />
              </div>
            ),
            subtitle: `${completedCount}/${actions.length} azioni completate`,
            icon: TrendingUp,
          },
        ].map((kpi, i) => (
          <motion.div key={kpi.title} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
            <Card className="h-full border-border/50 hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="flex items-center gap-2 w-full">
                  <kpi.icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                </div>
                <div className="flex-1 flex items-center justify-center w-full">{kpi.content}</div>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actions */}
        <motion.div className="lg:col-span-2" initial="hidden" animate="visible" variants={fadeUp} custom={5}>
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Azioni di Oggi</CardTitle>
                <span className="text-xs text-muted-foreground bg-accent px-3 py-1 rounded-full">
                  {completedCount}/{actions.length} completate
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {actions.map((action, i) => {
                const isDone = isCompleted(action.title);
                return (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                      isDone ? "bg-primary/5 border-primary/20" : "bg-card border-border hover:border-primary/30 hover:shadow-sm"
                    }`}
                  >
                    <span className="text-2xl">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {action.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{action.description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-primary">-{action.co2_grams}g CO₂</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{action.difficulty}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleToggle(action)}
                      className="shrink-0"
                      title={isDone ? "Rimuovi completamento" : "Segna come completata"}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-7 h-7 text-primary hover:text-primary/70 transition-colors" />
                      ) : (
                        <Circle className="w-7 h-7 text-border hover:text-primary transition-colors" />
                      )}
                    </button>
                  </motion.div>
                );
              })}

              {/* Feedback section */}
              <div className="pt-3 border-t border-border space-y-3">
                <button
                  onClick={() => setShowFeedback(!showFeedback)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <MessageSquare className="w-4 h-4" />
                  {showFeedback ? "Nascondi feedback" : "Dai feedback e rigenera azioni"}
                </button>

                {showFeedback && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <Textarea
                      placeholder="Es. 'Non faccio la doccia oggi', 'Non ho l'auto', 'Vorrei azioni più legate al cibo'..."
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      className="text-sm resize-none"
                      rows={3}
                    />
                    <Button
                      onClick={handleRegenerate}
                      disabled={regenerating || !feedback.trim()}
                      size="sm"
                      className="gap-2"
                    >
                      {regenerating ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {regenerating ? "Rigenerazione in corso..." : "Rigenera azioni con AI"}
                    </Button>
                    <p className="text-[10px] text-muted-foreground">
                      Le stime CO₂ sono basate su fonti ISPRA, EEA ed ENEA
                    </p>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sidebar */}
        <motion.div className="space-y-6" initial="hidden" animate="visible" variants={fadeUp} custom={6}>
          {/* Impact */}
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Leaf className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-foreground">Il tuo impatto</h3>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card/80 backdrop-blur rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-primary">{co2SavedKg.toFixed(1)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">kg CO₂ oggi</p>
                </div>
                <div className="bg-card/80 backdrop-blur rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-foreground">{completedCount}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">azioni fatte</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Equivale a{" "}
                <span className="font-bold text-foreground">{(co2SavedKg * 5.5).toFixed(0)} km</span> non percorsi in auto
              </p>
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <h3 className="font-bold text-sm text-foreground mb-3">Esplora</h3>
              {[
                { label: "La tua impronta di carbonio", path: "/carbon-mirror", icon: "🪞" },
                { label: "Allerte aria in tempo reale", path: "/air-alert", icon: "🌡️" },
                { label: "Sfide e classifiche", path: "/impact-streak", icon: "🏆" },
                { label: "Segnala un problema", path: "/quartiere-vivo", icon: "📍" },
                { label: "Il tuo profilo eco", path: "/profile", icon: "🌿" },
              ].map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors group"
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="text-sm font-medium text-foreground flex-1">{link.label}</span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </CardContent>
          </Card>

          {/* Data source */}
          <div className="text-center text-[10px] text-muted-foreground">
            <p>Dati: Open-Meteo Air Quality + Forecast (live)</p>
            <p className="mt-0.5">Stime CO₂: fonti ISPRA, EEA, ENEA</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Dashboard;

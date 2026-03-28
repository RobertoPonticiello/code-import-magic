import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar, Star, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ContributionHeatmap } from "@/components/ContributionHeatmap";
import { co2GramsToEuros, formatEuros } from "@/lib/savingsUtils";

interface HistoryAction {
  id: string;
  action_title: string;
  action_description: string | null;
  action_icon: string | null;
  action_category: string;
  co2_grams: number;
  completed_at: string;
  user_note: string | null;
  rating: number | null;
  image_url: string | null;
}

export default function ActionHistory() {
  const { user } = useAuth();
  const [actions, setActions] = useState<HistoryAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  // Fetch all actions for heatmap + detail
  useEffect(() => {
    if (!user) return;
    supabase
      .from("completed_actions")
      .select("*")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(1000)
      .then(({ data }) => {
        setActions((data as HistoryAction[]) || []);
        setLoading(false);
      });
  }, [user]);

  // Build heatmap data
  const heatmapData = useMemo(() => {
    const map: Record<string, number> = {};
    actions.forEach((a) => {
      const day = a.completed_at.split("T")[0];
      map[day] = (map[day] || 0) + 1;
    });
    return map;
  }, [actions]);

  // Actions for selected date
  const dayActions = useMemo(() => {
    return actions.filter((a) => a.completed_at.split("T")[0] === selectedDate);
  }, [actions, selectedDate]);

  const navigateDay = (offset: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === new Date().toISOString().split("T")[0];
  const displayDate = new Date(selectedDate + "T12:00:00").toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const dayCo2 = dayActions.reduce((s, a) => s + a.co2_grams, 0);

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
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
          <Calendar className="w-8 h-8 text-primary" />
          Diario delle Azioni
        </h1>
        <p className="text-muted-foreground mt-1">Il tuo storico giorno per giorno</p>
      </motion.div>

      {/* Heatmap */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-5">
            <ContributionHeatmap data={heatmapData} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Day picker + detail */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={() => navigateDay(-1)}>
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <div className="text-center">
                <CardTitle className="text-base capitalize">{displayDate}</CardTitle>
                {dayActions.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {dayActions.length} {dayActions.length === 1 ? "azione" : "azioni"} · -{(dayCo2 / 1000).toFixed(1)}kg CO₂ · {formatEuros(co2GramsToEuros(dayCo2))}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => navigateDay(1)} disabled={isToday}>
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {dayActions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground text-sm">Nessuna azione completata in questo giorno</p>
              </div>
            ) : (
              dayActions.map((action) => (
                <div
                  key={action.id}
                  className="p-4 rounded-xl border border-border bg-card space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{action.action_icon || "🌱"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{action.action_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{action.action_description}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-primary">-{action.co2_grams}g CO₂</span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ~{formatEuros(co2GramsToEuros(action.co2_grams))}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(action.completed_at).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>
                    {action.rating != null && action.rating > 0 && (
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((v) => (
                          <Star
                            key={v}
                            className={`w-4 h-4 ${v <= action.rating! ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {action.user_note && (
                    <div className="bg-accent/50 rounded-lg p-3">
                      <p className="text-sm text-foreground italic">"{action.user_note}"</p>
                    </div>
                  )}

                  {action.image_url && (
                    <img
                      src={action.image_url}
                      alt={action.action_title}
                      className="w-full max-h-60 object-cover rounded-lg"
                    />
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

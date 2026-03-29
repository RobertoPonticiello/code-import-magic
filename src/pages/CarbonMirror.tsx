import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Car, UtensilsCrossed, Home, ShoppingBag, BarChart3, Leaf, Sparkles, Loader2, Euro, Plane, Droplets, FileText, History, ChevronDown, ChevronUp, Calendar } from "lucide-react";
import { annualSavingsFromProfile, formatEuros } from "@/lib/savingsUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";
import BillScanner from "@/components/BillScanner";

interface QuestionOption {
  label: string;
  value: number;
  icon: string;
}

interface Question {
  id: string;
  category: string;
  categoryIcon: React.ReactNode;
  question: string;
  source: string;
  options: QuestionOption[];
}

// Questions redesigned with multiplicative transport model
// transport-type = emission factor (multiplier), transport-distance = base weekly emissions
// Final transport CO2 = type * distance
const questions: Question[] = [
  {
    id: "transport-type", category: "Trasporti", categoryIcon: <Car className="w-5 h-5" />,
    question: "Come ti sposti principalmente?",
    source: "Fonte: ISPRA 2024 — Fattori emissione trasporti Italia",
    options: [
      { label: "Auto a benzina/diesel", value: 1.0, icon: "🚗" },
      { label: "Auto ibrida/elettrica", value: 0.4, icon: "⚡" },
      { label: "Mezzi pubblici", value: 0.22, icon: "🚇" },
      { label: "Bici / A piedi", value: 0.01, icon: "🚲" },
    ],
  },
  {
    id: "transport-distance", category: "Trasporti", categoryIcon: <Car className="w-5 h-5" />,
    question: "Quanti km percorri in media al giorno?",
    source: "Fonte: ISPRA — Media italiana ~30 km/giorno in auto",
    options: [
      { label: "Meno di 5 km", value: 0.6, icon: "📍" },
      { label: "5-20 km", value: 2.0, icon: "🛣️" },
      { label: "20-50 km", value: 4.5, icon: "🏎️" },
      { label: "Più di 50 km", value: 8.0, icon: "🚀" },
    ],
  },
  {
    id: "transport-flights", category: "Trasporti", categoryIcon: <Plane className="w-5 h-5" />,
    question: "Quanti voli prendi all'anno?",
    source: "Fonte: ICAO — ~0.255 kg CO₂/km per passeggero su volo medio",
    options: [
      { label: "Nessuno", value: 0, icon: "🚫" },
      { label: "1-2 voli (corto raggio)", value: 0.8, icon: "✈️" },
      { label: "3-5 voli", value: 2.0, icon: "🌍" },
      { label: "Più di 5 voli", value: 4.5, icon: "🌏" },
    ],
  },
  {
    id: "diet", category: "Alimentazione", categoryIcon: <UtensilsCrossed className="w-5 h-5" />,
    question: "Com'è la tua dieta?",
    source: "Fonte: EEA 2023 — Emissioni per tipo di dieta",
    options: [
      { label: "Carne ogni giorno", value: 3.3, icon: "🥩" },
      { label: "Carne 2-3 volte a settimana", value: 2.0, icon: "🍗" },
      { label: "Vegetariano", value: 1.2, icon: "🥗" },
      { label: "Vegano", value: 0.7, icon: "🌱" },
    ],
  },
  {
    id: "food-waste", category: "Alimentazione", categoryIcon: <UtensilsCrossed className="w-5 h-5" />,
    question: "Quanto cibo butti via a settimana?",
    source: "Fonte: FAO — 1.3 miliardi ton spreco alimentare/anno",
    options: [
      { label: "Quasi nulla", value: 0.2, icon: "✨" },
      { label: "Poco (1-2 porzioni)", value: 0.5, icon: "🍽️" },
      { label: "Moderato (3-5 porzioni)", value: 1.0, icon: "🗑️" },
      { label: "Molto (più di 5)", value: 1.8, icon: "😰" },
    ],
  },
  {
    id: "food-local", category: "Alimentazione", categoryIcon: <UtensilsCrossed className="w-5 h-5" />,
    question: "Compri prodotti locali e di stagione?",
    source: "Fonte: ISMEA — Filiera corta riduce emissioni fino al 30%",
    options: [
      { label: "Sempre, km 0", value: -0.4, icon: "🏡" },
      { label: "Spesso, mercati locali", value: -0.2, icon: "🥕" },
      { label: "A volte", value: 0, icon: "🛒" },
      { label: "Mai, tutto dal supermercato", value: 0.3, icon: "📦" },
    ],
  },
  {
    id: "home-energy", category: "Casa", categoryIcon: <Home className="w-5 h-5" />,
    question: "Che tipo di energia usi in casa?",
    source: "Fonte: GSE 2024 — Mix energetico italiano",
    options: [
      { label: "100% rinnovabile", value: 0.3, icon: "☀️" },
      { label: "Mix rinnovabile/fossile", value: 1.2, icon: "⚡" },
      { label: "Principalmente gas", value: 2.0, icon: "🔥" },
      { label: "Non lo so", value: 1.5, icon: "🤷" },
    ],
  },
  {
    id: "home-heating", category: "Casa", categoryIcon: <Home className="w-5 h-5" />,
    question: "A quale temperatura tieni il riscaldamento?",
    source: "Fonte: ENEA — Ogni grado in più = +7% consumi",
    options: [
      { label: "18-19°C", value: 0.5, icon: "❄️" },
      { label: "20-21°C", value: 1.0, icon: "🌡️" },
      { label: "22-23°C", value: 1.8, icon: "🔥" },
      { label: "Più di 23°C", value: 2.5, icon: "🥵" },
    ],
  },
  {
    id: "home-water", category: "Casa", categoryIcon: <Droplets className="w-5 h-5" />,
    question: "Come usi l'acqua in casa?",
    source: "Fonte: ISTAT — Media italiana: 220L/giorno per persona",
    options: [
      { label: "Molto attento (docce brevi, lavatrice piena)", value: 0.2, icon: "💧" },
      { label: "Abbastanza attento", value: 0.5, icon: "🚿" },
      { label: "Non ci penso molto", value: 0.9, icon: "🛁" },
      { label: "Uso abbondante", value: 1.3, icon: "🌊" },
    ],
  },
  {
    id: "shopping", category: "Consumi", categoryIcon: <ShoppingBag className="w-5 h-5" />,
    question: "Quanto acquisti abbigliamento nuovo?",
    source: "Fonte: EEA — Fast fashion = 10% emissioni globali",
    options: [
      { label: "Quasi mai / Second-hand", value: 0.2, icon: "♻️" },
      { label: "Pochi capi essenziali", value: 0.5, icon: "👕" },
      { label: "Regolarmente", value: 1.2, icon: "🛍️" },
      { label: "Fast fashion frequente", value: 2.5, icon: "📦" },
    ],
  },
];

// Compute emissions with multiplicative transport model
function computeEmissions(answers: Record<string, number>) {
  const transportType = answers["transport-type"] ?? 0;
  const transportDist = answers["transport-distance"] ?? 0;
  const transportFlights = answers["transport-flights"] ?? 0;
  // Multiplicative: if you walk, multiplier ~0.01, so even 50km = ~0.08 kg
  const transport = transportType * transportDist + transportFlights;

  const diet = (answers["diet"] ?? 0) + (answers["food-waste"] ?? 0) + (answers["food-local"] ?? 0);
  const home = (answers["home-energy"] ?? 0) + (answers["home-heating"] ?? 0) + (answers["home-water"] ?? 0);
  const shopping = answers["shopping"] ?? 0;
  const total = Math.max(0, transport + Math.max(0, diet) + home + shopping);

  return { transport: Math.max(0, transport), diet: Math.max(0, diet), home, shopping, total };
}

function ResultsView({ answers, answerLabels }: { answers: Record<string, number>; answerLabels: Record<string, string> }) {
  const { transport, diet, home, shopping, total } = computeEmissions(answers);
  const nationalAvg = 8.2;
  const europeanAvg = 7.5;

  const [aiTips, setAiTips] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (saved) return;
    const saveProfile = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { error } = await supabase.from("carbon_profiles").insert({
        user_id: authData.user.id,
        transport, diet, home, shopping, total,
        answers: answerLabels as unknown as import("@/integrations/supabase/types").Json,
      });
      if (error) {
        console.error("Failed to save carbon profile:", error);
        toast({ title: "Errore nel salvataggio", description: error.message, variant: "destructive" });
      } else {
        setSaved(true);
        toast({ title: "Risultato salvato!", description: "Puoi vedere lo storico nel tuo profilo" });
      }
    };
    saveProfile();
  }, [saved, transport, diet, home, shopping, total, answerLabels, toast]);

  const categories = [
    { name: "Trasporti", value: transport, color: "bg-blue-500", icon: "🚗", pct: total > 0 ? (transport / total) * 100 : 0 },
    { name: "Alimentazione", value: diet, color: "bg-amber-500", icon: "🍽️", pct: total > 0 ? (diet / total) * 100 : 0 },
    { name: "Casa", value: home, color: "bg-emerald-500", icon: "🏠", pct: total > 0 ? (home / total) * 100 : 0 },
    { name: "Consumi", value: shopping, color: "bg-purple-500", icon: "🛍️", pct: total > 0 ? (shopping / total) * 100 : 0 },
  ];

  const comparison = total < europeanAvg ? "sotto" : "sopra";
  const diffNational = ((total - nationalAvg) / nationalAvg * 100).toFixed(0);

  const fetchAiTips = async () => {
    setAiLoading(true);
    setAiTips("");
    try {
      const profile = {
        transport, diet, home, shopping, total,
        transportType: answerLabels["transport-type"] || "",
        transportDistance: answerLabels["transport-distance"] || "",
        transportFlights: answerLabels["transport-flights"] || "",
        dietType: answerLabels["diet"] || "",
        foodWaste: answerLabels["food-waste"] || "",
        foodLocal: answerLabels["food-local"] || "",
        homeEnergy: answerLabels["home-energy"] || "",
        homeHeating: answerLabels["home-heating"] || "",
        homeWater: answerLabels["home-water"] || "",
        shoppingHabit: answerLabels["shopping"] || "",
      };

      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/carbon-ai-tips`;
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ profile }),
      });

      if (resp.status === 429) {
        toast({ title: "Troppe richieste", description: "Riprova tra qualche secondo", variant: "destructive" });
        setAiLoading(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Crediti AI esauriti", description: "Aggiungi crediti nelle impostazioni", variant: "destructive" });
        setAiLoading(false);
        return;
      }
      if (!resp.ok || !resp.body) throw new Error("Stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAiTips(fullText);
            }
          } catch {}
        }
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Errore", description: "Impossibile generare consigli AI", variant: "destructive" });
    }
    setAiLoading(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border-4 border-primary/30">
          <div>
            <p className="text-3xl font-bold text-foreground">{total.toFixed(1)}</p>
            <p className="text-[10px] text-muted-foreground uppercase font-semibold">kg CO₂/sett</p>
          </div>
        </motion.div>
        <p className="text-lg text-foreground">
          La tua impronta è{" "}
          <span className={`font-bold ${total < nationalAvg ? "text-primary" : "text-destructive"}`}>
            {Math.abs(Number(diffNational))}% {comparison}
          </span>{" "}la media italiana
        </p>
      </div>

      {/* Breakdown */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2"><BarChart3 className="w-5 h-5 text-primary" />Ripartizione per categoria</h3>
          {categories.map((cat) => (
            <div key={cat.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span>{cat.icon}</span><span className="font-medium text-foreground">{cat.name}</span></span>
                <span className="font-bold text-foreground">{cat.value.toFixed(1)} kg</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} className={`h-full rounded-full ${cat.color}`} />
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">Calcoli basati su fattori di emissione ISPRA 2024 e EEA 2023. Trasporti = mezzo × distanza.</p>
        </CardContent>
      </Card>

      {/* Economic Impact */}
      {(() => {
        const savings = annualSavingsFromProfile({ transport, diet, home, shopping, total });
        const isPositive = savings.totalAnnual >= 0;
        const cats = [
          { label: "Trasporti", value: savings.byCategory.transport, icon: "🚗" },
          { label: "Alimentazione", value: savings.byCategory.diet, icon: "🍽️" },
          { label: "Casa", value: savings.byCategory.home, icon: "🏠" },
          { label: "Consumi", value: savings.byCategory.shopping, icon: "🛍️" },
        ];
        return (
          <Card className={isPositive ? "border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent" : "border-red-500/20 bg-gradient-to-br from-red-500/5 to-transparent"}>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-foreground flex items-center gap-2">
                <Euro className={`w-5 h-5 ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`} />
                {isPositive ? "Risparmio Economico Stimato" : "Costo Extra Stimato"}
              </h3>
              <div className="text-center py-2">
                <p className={`text-4xl font-bold ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {isPositive ? "+" : ""}{formatEuros(savings.totalAnnual)}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isPositive ? "di risparmio annuo rispetto alla media italiana" : "di spesa extra annua rispetto alla media italiana"}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {cats.map((cat) => (
                  <div key={cat.label} className="bg-card rounded-lg p-3 text-center border border-border">
                    <span className="text-lg">{cat.icon}</span>
                    <p className={`text-sm font-bold mt-1 ${cat.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {cat.value > 0 ? "+" : ""}{formatEuros(cat.value)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{cat.label}/anno</p>
                  </div>
                ))}
              </div>
              {!isPositive && (
                <p className="text-sm text-center text-red-600 dark:text-red-400 font-medium">
                  ⚠️ Stai spendendo di più della media — segui i consigli AI per risparmiare!
                </p>
              )}
              <p className="text-[10px] text-muted-foreground">
                Stime basate su costi medi italiani: carburante (MASE 2024), bollette (ARERA), alimentazione (ISTAT)
              </p>
            </CardContent>
          </Card>
        );
      })()}

      {/* Comparison */}
      <Card>
        <CardContent className="p-6 space-y-3">
          <h3 className="font-bold text-foreground">Confronto</h3>
          {[
            { label: "Tu", value: total, color: "bg-primary" },
            { label: "Media Italiana", value: nationalAvg, color: "bg-amber-500" },
            { label: "Media Europea", value: europeanAvg, color: "bg-blue-500" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-sm font-medium text-foreground w-28 shrink-0">{item.label}</span>
              <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden relative">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min((item.value / 15) * 100, 100)}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${item.color} flex items-center justify-end pr-2`}>
                  <span className="text-[10px] font-bold text-primary-foreground drop-shadow-sm">{item.value.toFixed(1)} kg</span>
                </motion.div>
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground">Fonti: ISPRA Rapporto Emissioni 2024, EEA Greenhouse gas emissions per capita 2023</p>
        </CardContent>
      </Card>

      {/* AI Tips */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />Consigli AI personalizzati
            </h3>
            {!aiTips && !aiLoading && (
              <Button size="sm" onClick={fetchAiTips}>
                <Sparkles className="w-4 h-4 mr-1" />Genera consigli
              </Button>
            )}
          </div>

          {aiLoading && !aiTips && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              L'AI sta analizzando il tuo profilo per categoria...
            </div>
          )}

          {aiTips && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm max-w-none text-foreground [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-2 [&_h2]:pb-2 [&_h2]:border-b [&_h2]:border-border [&_h2:first-child]:mt-0 [&_ul]:space-y-1 [&_li]:text-sm [&_p]:text-sm">
              <ReactMarkdown>{aiTips}</ReactMarkdown>
            </motion.div>
          )}

          {aiTips && (
            <div className="pt-2 border-t border-border">
              <Button size="sm" variant="outline" onClick={fetchAiTips} disabled={aiLoading} className="gap-1">
                {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                Rigenera consigli
              </Button>
            </div>
          )}

          {!aiTips && !aiLoading && (
            <p className="text-sm text-muted-foreground">
              Clicca "Genera consigli" per ricevere suggerimenti personalizzati suddivisi per Trasporti, Alimentazione, Casa e Consumi.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function HistoryView() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) { setLoading(false); return; }
      const { data } = await supabase
        .from("carbon_profiles")
        .select("*")
        .eq("user_id", authData.user.id)
        .order("created_at", { ascending: false });
      setEntries(data || []);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center space-y-3">
          <History className="w-12 h-12 mx-auto text-muted-foreground/40" />
          <h3 className="font-semibold text-foreground">Nessun questionario completato</h3>
          <p className="text-sm text-muted-foreground">Completa il questionario CO₂ per vedere il tuo storico qui.</p>
        </CardContent>
      </Card>
    );
  }

  const categoryColors: Record<string, string> = {
    Trasporti: "bg-blue-500",
    Alimentazione: "bg-amber-500",
    Casa: "bg-emerald-500",
    Consumi: "bg-purple-500",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <p className="text-sm text-muted-foreground">{entries.length} questionari{entries.length === 1 ? "o" : ""} completat{entries.length === 1 ? "o" : "i"}</p>

      {/* Trend mini-chart if 2+ entries */}
      {entries.length >= 2 && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardContent className="p-4 space-y-0">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-primary" /> Evoluzione
            </h3>
            <div className="flex items-end gap-2 h-40">
              {[...entries].reverse().map((e, i, arr) => {
                const maxVal = Math.max(...arr.map((x: any) => x.total), 1);
                const pct = (e.total / maxVal) * 100;
                const isLast = i === arr.length - 1;
                return (
                  <div key={e.id} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-base font-bold text-foreground">{e.total.toFixed(1)}</span>
                    <div
                      className={`w-full rounded-t transition-all ${isLast ? "bg-primary" : "bg-primary/30"}`}
                      style={{ height: `${Math.max(pct, 8)}%` }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString("it-IT", { day: "2-digit", month: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
            {(() => {
              const sorted = [...entries].reverse();
              const first = sorted[0]?.total ?? 0;
              const last = sorted[sorted.length - 1]?.total ?? 0;
              const diff = last - first;
              if (Math.abs(diff) < 0.05) return null;
              return (
                <p className={`text-xs font-medium text-center ${diff < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  {diff < 0 ? "📉" : "📈"} {diff > 0 ? "+" : ""}{diff.toFixed(1)} kg CO₂/sett dal primo test
                </p>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Entry list */}
      {entries.map((entry, idx) => {
        const isExpanded = expandedId === entry.id;
        const date = new Date(entry.created_at);
        const cats = [
          { name: "Trasporti", value: entry.transport, icon: "🚗" },
          { name: "Alimentazione", value: entry.diet, icon: "🍽️" },
          { name: "Casa", value: entry.home, icon: "🏠" },
          { name: "Consumi", value: entry.shopping, icon: "🛍️" },
        ];
        const answers = (entry.answers as Record<string, string>) || {};
        const prevEntry = entries[idx + 1];
        const diff = prevEntry ? entry.total - prevEntry.total : null;

        return (
          <Card key={entry.id} className="overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {date.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {date.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-bold text-foreground">{entry.total.toFixed(1)} <span className="text-xs font-normal text-muted-foreground">kg</span></p>
                  {diff !== null && Math.abs(diff) >= 0.05 && (
                    <p className={`text-[10px] font-medium ${diff < 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {diff > 0 ? "+" : ""}{diff.toFixed(1)} vs prec.
                    </p>
                  )}
                </div>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                    {/* Category breakdown */}
                    <div className="space-y-2">
                      {cats.map((cat) => {
                        const pct = entry.total > 0 ? (cat.value / entry.total) * 100 : 0;
                        return (
                          <div key={cat.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1.5">
                                <span>{cat.icon}</span>
                                <span className="font-medium text-foreground">{cat.name}</span>
                              </span>
                              <span className="font-bold text-foreground">{cat.value.toFixed(1)} kg</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${categoryColors[cat.name] || "bg-primary"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Answer details */}
                    {Object.keys(answers).length > 0 && (
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Le tue risposte</h4>
                        <div className="grid gap-1">
                          {Object.entries(answers).map(([key, val]) => {
                            const q = questions.find((q) => q.id === key);
                            return (
                              <div key={key} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-muted/50">
                                <span className="text-muted-foreground truncate mr-2">{q?.question || key}</span>
                                <span className="font-medium text-foreground shrink-0">{String(val)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </motion.div>
  );
}

export default function CarbonMirror() {
  const [tab, setTab] = useState<"quiz" | "bills" | "history">("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [answerLabels, setAnswerLabels] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const showResults = step >= questions.length;

  const handleSelect = (value: number, label: string) => {
    setSelected(value);
    setSelectedLabel(label);
  };

  const handleNext = () => {
    if (selected === null) return;
    setAnswers((p) => ({ ...p, [questions[step].id]: selected }));
    setAnswerLabels((p) => ({ ...p, [questions[step].id]: selectedLabel }));
    setSelected(null);
    setSelectedLabel("");
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step > 0) {
      setStep((s) => s - 1);
      setSelected(answers[questions[step - 1].id] ?? null);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">🪞 Carbon Mirror</h1>
          <p className="text-muted-foreground mt-1">Scopri la tua impronta di carbonio e traccia i tuoi consumi energetici</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button variant={tab === "quiz" ? "default" : "outline"} size="sm" onClick={() => setTab("quiz")} className="gap-2">
            <Leaf className="w-4 h-4" />Questionario CO₂
          </Button>
          <Button variant={tab === "bills" ? "default" : "outline"} size="sm" onClick={() => setTab("bills")} className="gap-2">
            <FileText className="w-4 h-4" />Bollette
          </Button>
          <Button variant={tab === "history" ? "default" : "outline"} size="sm" onClick={() => setTab("history")} className="gap-2">
            <History className="w-4 h-4" />Storico
          </Button>
        </div>

        {tab === "history" ? (
          <HistoryView />
        ) : tab === "bills" ? (
          <BillScanner />
        ) : (
          <>
            {!showResults && (
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-2">
                    {questions[step].categoryIcon}
                    <span className="font-medium">{questions[step].category}</span>
                  </span>
                  <span>{step + 1}/{questions.length}</span>
                </div>
                <Progress value={((step + 1) / questions.length) * 100} className="h-2" />
              </div>
            )}

            <AnimatePresence mode="wait">
              {showResults ? (
                <ResultsView answers={answers} answerLabels={answerLabels} />
              ) : (
                <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3 }}>
                  <Card>
                    <CardContent className="p-6 space-y-6">
                      <h2 className="text-xl font-bold text-foreground">{questions[step].question}</h2>
                      <div className="grid gap-3">
                        {questions[step].options.map((opt) => (
                          <button key={opt.label} onClick={() => handleSelect(opt.value, opt.label)}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                              selected === opt.value ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/30 hover:bg-accent"
                            }`}>
                            <span className="text-2xl">{opt.icon}</span>
                            <span className="text-sm font-medium text-foreground">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-muted-foreground">{questions[step].source}</p>
                      <div className="flex justify-between pt-2">
                        <Button variant="ghost" onClick={handleBack} disabled={step === 0}>
                          <ArrowLeft className="w-4 h-4 mr-2" /> Indietro
                        </Button>
                        <Button onClick={handleNext} disabled={selected === null}>
                          {step === questions.length - 1 ? "Vedi risultati" : "Avanti"}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
}

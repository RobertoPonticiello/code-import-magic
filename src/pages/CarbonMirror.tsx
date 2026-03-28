import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Car, UtensilsCrossed, Home, ShoppingBag, BarChart3, Leaf, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import ReactMarkdown from "react-markdown";
import { useToast } from "@/hooks/use-toast";

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

const questions: Question[] = [
  {
    id: "transport-type", category: "Trasporti", categoryIcon: <Car className="w-5 h-5" />,
    question: "Come ti sposti principalmente?",
    source: "Fonte: ISPRA 2024 — Fattori emissione trasporti Italia",
    options: [
      { label: "Auto a benzina/diesel", value: 4.2, icon: "🚗" },
      { label: "Auto ibrida/elettrica", value: 1.8, icon: "⚡" },
      { label: "Mezzi pubblici", value: 0.9, icon: "🚇" },
      { label: "Bici / A piedi", value: 0.1, icon: "🚲" },
    ],
  },
  {
    id: "transport-distance", category: "Trasporti", categoryIcon: <Car className="w-5 h-5" />,
    question: "Quanti km percorri in media al giorno?",
    source: "Fonte: ISPRA — 120-180g CO₂/km auto media",
    options: [
      { label: "Meno di 5 km", value: 0.3, icon: "📍" },
      { label: "5-20 km", value: 1.0, icon: "🛣️" },
      { label: "20-50 km", value: 2.2, icon: "🏎️" },
      { label: "Più di 50 km", value: 4.0, icon: "✈️" },
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

function ResultsView({ answers, answerLabels }: { answers: Record<string, number>; answerLabels: Record<string, string> }) {
  const transport = (answers["transport-type"] || 0) + (answers["transport-distance"] || 0);
  const diet = (answers["diet"] || 0) + (answers["food-waste"] || 0);
  const home = (answers["home-energy"] || 0) + (answers["home-heating"] || 0);
  const shopping = answers["shopping"] || 0;
  const total = transport + diet + home + shopping;
  const nationalAvg = 8.2;
  const europeanAvg = 7.5;

  const [aiTips, setAiTips] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  // Save to DB
  useEffect(() => {
    if (saved) return;
    import("@/integrations/supabase/client").then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        if (!data.user) return;
        supabase.from("carbon_profiles").delete().eq("user_id", data.user.id).then(() => {
          supabase.from("carbon_profiles").insert({
            user_id: data.user!.id,
            transport, diet, home, shopping, total,
            answers: answerLabels,
          });
        });
        setSaved(true);
      });
    });
  }, [saved, transport, diet, home, shopping, total, answerLabels]);

  const categories = [
    { name: "Trasporti", value: transport, color: "bg-blue-500", icon: "🚗", pct: (transport / total) * 100 },
    { name: "Alimentazione", value: diet, color: "bg-amber-500", icon: "🍽️", pct: (diet / total) * 100 },
    { name: "Casa", value: home, color: "bg-emerald-500", icon: "🏠", pct: (home / total) * 100 },
    { name: "Consumi", value: shopping, color: "bg-purple-500", icon: "🛍️", pct: (shopping / total) * 100 },
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
        dietType: answerLabels["diet"] || "",
        foodWaste: answerLabels["food-waste"] || "",
        homeEnergy: answerLabels["home-energy"] || "",
        homeHeating: answerLabels["home-heating"] || "",
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
        toast({ title: "Troppi richieste", description: "Riprova tra qualche secondo", variant: "destructive" });
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
          <p className="text-[10px] text-muted-foreground">Calcoli basati su fattori di emissione ISPRA 2024 e EEA 2023</p>
        </CardContent>
      </Card>

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
                <motion.div initial={{ width: 0 }} animate={{ width: `${(item.value / 12) * 100}%` }} transition={{ duration: 0.8 }} className={`h-full rounded-full ${item.color} flex items-center justify-end pr-2`}>
                  <span className="text-[10px] font-bold text-white">{item.value.toFixed(1)} kg</span>
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
              L'AI sta analizzando il tuo profilo...
            </div>
          )}

          {aiTips && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="prose prose-sm max-w-none text-foreground">
              <ReactMarkdown>{aiTips}</ReactMarkdown>
            </motion.div>
          )}

          {!aiTips && !aiLoading && (
            <p className="text-sm text-muted-foreground">
              Clicca "Genera consigli" per ricevere suggerimenti personalizzati basati sulle tue risposte, con stime di risparmio CO₂ e un piano settimanale.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function CarbonMirror() {
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">🪞 Carbon Mirror</h1>
          <p className="text-muted-foreground mt-1">Scopri la tua impronta di carbonio settimanale in 2 minuti</p>
        </div>

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
      </motion.div>
    </div>
  );
}

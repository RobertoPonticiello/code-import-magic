import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Camera, ShoppingCart, Leaf, AlertTriangle, ThumbsUp, Lightbulb, Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface ReceiptItem {
  name: string;
  price: number | null;
  category: string;
  sustainability: "alta" | "media" | "bassa";
  note: string;
}

interface ReceiptData {
  store_name: string | null;
  date: string | null;
  total_euros: number | null;
  sustainability_score: number;
  items: ReceiptItem[];
  summary: string;
  tips: string[];
  co2_estimate_kg: number | null;
  positive_aspects: string[];
  negative_aspects: string[];
}

const categoryLabels: Record<string, string> = {
  frutta_verdura: "🥬 Frutta e Verdura",
  carne: "🥩 Carne",
  pesce: "🐟 Pesce",
  latticini: "🧀 Latticini",
  cereali: "🌾 Cereali",
  bevande: "🥤 Bevande",
  confezionati: "📦 Confezionati",
  surgelati: "🧊 Surgelati",
  pulizia: "🧹 Pulizia",
  igiene: "🧴 Igiene",
  altro: "🛒 Altro",
};

const sustainabilityColor = {
  alta: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
  media: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  bassa: "text-red-600 dark:text-red-400 bg-red-500/10",
};

const sustainabilityLabel = { alta: "Alta", media: "Media", bassa: "Bassa" };

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 7 ? "text-emerald-500" : score >= 4 ? "text-amber-500" : "text-red-500";
  const bg = score >= 7 ? "bg-emerald-500" : score >= 4 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`text-5xl font-black ${color}`}>{score}/10</div>
      <Progress value={score * 10} className={`h-3 w-32 [&>div]:${bg}`} />
      <p className="text-sm text-muted-foreground font-medium">
        {score >= 7 ? "Spesa sostenibile! 🌿" : score >= 4 ? "Può migliorare 🔄" : "Poco sostenibile ⚠️"}
      </p>
    </div>
  );
}

export default function ReceiptScanner() {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ReceiptData | null>(null);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 10MB", variant: "destructive" });
      return;
    }

    setScanning(true);
    setResult(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-receipt`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
      });

      if (resp.status === 429) {
        toast({ title: "Troppe richieste", description: "Riprova tra qualche secondo", variant: "destructive" });
        setScanning(false);
        return;
      }
      if (resp.status === 402) {
        toast({ title: "Crediti AI esauriti", variant: "destructive" });
        setScanning(false);
        return;
      }
      if (!resp.ok) throw new Error("Scan failed");

      const data = await resp.json();
      if (!data.success) throw new Error(data.error || "Scan failed");

      setResult(data.data);
      toast({ title: "Scontrino analizzato! ✅" });
    } catch (err) {
      console.error(err);
      toast({ title: "Errore scansione", description: "Riprova con un'immagine più chiara", variant: "destructive" });
    }
    setScanning(false);
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              {scanning ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <ShoppingCart className="w-8 h-8 text-primary" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Scansiona uno Scontrino</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Carica una foto dello scontrino della spesa. L'AI analizzerà la sostenibilità dei tuoi acquisti.
              </p>
            </div>
            <label className="inline-block cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={scanning} />
              <Button asChild disabled={scanning} className="gap-2">
                <span>
                  {scanning ? <><Loader2 className="w-4 h-4 animate-spin" />Analisi in corso...</> : <><Camera className="w-4 h-4" />Carica scontrino</>}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Score */}
            <Card className="border-primary/20">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                      <Leaf className="w-5 h-5 text-emerald-500" /> Punteggio Sostenibilità
                    </h3>
                    {result.store_name && <p className="text-sm text-muted-foreground">{result.store_name}</p>}
                    {result.date && <p className="text-xs text-muted-foreground">{new Date(result.date).toLocaleDateString("it")}</p>}
                  </div>
                  {result.total_euros != null && (
                    <div className="text-right">
                      <p className="text-2xl font-bold text-foreground">€{result.total_euros.toFixed(2)}</p>
                      {result.co2_estimate_kg != null && (
                        <p className="text-xs text-muted-foreground">~{result.co2_estimate_kg.toFixed(1)} kg CO₂</p>
                      )}
                    </div>
                  )}
                </div>
                <ScoreGauge score={result.sustainability_score} />
                <p className="text-sm text-muted-foreground text-center">{result.summary}</p>
              </CardContent>
            </Card>

            {/* Positive / Negative */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {result.positive_aspects.length > 0 && (
                <Card className="border-emerald-500/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <ThumbsUp className="w-4 h-4 text-emerald-500" /> Punti di forza
                    </h4>
                    <ul className="space-y-1">
                      {result.positive_aspects.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-emerald-500 mt-0.5">✓</span>{a}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
              {result.negative_aspects.length > 0 && (
                <Card className="border-red-500/20">
                  <CardContent className="p-4 space-y-2">
                    <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-red-500" /> Da migliorare
                    </h4>
                    <ul className="space-y-1">
                      {result.negative_aspects.map((a, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                          <span className="text-red-500 mt-0.5">✗</span>{a}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Items */}
            {result.items.length > 0 && (
              <Card>
                <CardContent className="p-4 space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-primary" /> Prodotti ({result.items.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {result.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-accent/50 border border-border">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs">{categoryLabels[item.category]?.split(" ")[0] || "🛒"}</span>
                            <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          </div>
                          {item.note && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.note}</p>}
                        </div>
                        <div className="flex items-center gap-3 ml-2 shrink-0">
                          {item.price != null && <span className="text-xs text-muted-foreground">€{item.price.toFixed(2)}</span>}
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sustainabilityColor[item.sustainability]}`}>
                            {sustainabilityLabel[item.sustainability]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tips */}
            {result.tips.length > 0 && (
              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                    <Lightbulb className="w-4 h-4 text-amber-500" /> Suggerimenti per migliorare
                  </h4>
                  <ul className="space-y-2">
                    {result.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary font-bold">{i + 1}.</span>{tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

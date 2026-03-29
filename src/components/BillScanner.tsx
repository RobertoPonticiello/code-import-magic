import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Loader2, Zap, Flame, Trash2, TrendingDown, TrendingUp, FileText, Camera } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface BillData {
  bill_type: string;
  provider: string | null;
  period_start: string | null;
  period_end: string | null;
  kwh: number | null;
  gas_smc: number | null;
  cost_euros: number | null;
  notes: string | null;
}

interface BillRecord {
  id: string;
  bill_type: string;
  provider: string | null;
  period_start: string | null;
  period_end: string | null;
  kwh: number | null;
  cost_euros: number | null;
  gas_smc: number | null;
  created_at: string;
}

export default function BillScanner() {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<BillData | null>(null);
  const [bills, setBills] = useState<BillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchBills = useCallback(async () => {
    if (!user) return;
    const { data, error } = await (supabase as any)
      .from("energy_bills")
      .select("*")
      .eq("user_id", user.id)
      .order("period_end", { ascending: false });
    if (!error && data) setBills(data as BillRecord[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File troppo grande", description: "Max 10MB", variant: "destructive" });
      return;
    }

    setScanning(true);
    setScanResult(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scan-bill`, {
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

      const result = await resp.json();
      if (!result.success) throw new Error(result.error || "Scan failed");

      setScanResult(result.data);

      // Save to DB
      const billData = result.data as BillData;
      const { error } = await (supabase as any).from("energy_bills").insert({
        user_id: user.id,
        bill_type: billData.bill_type || "electricity",
        provider: billData.provider,
        period_start: billData.period_start,
        period_end: billData.period_end,
        kwh: billData.kwh,
        cost_euros: billData.cost_euros,
        gas_smc: billData.gas_smc,
        raw_extraction: billData,
      });

      if (error) {
        console.error("Save error:", error);
        toast({ title: "Errore salvataggio", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Bolletta salvata! ✅" });
        fetchBills();
      }
    } catch (err) {
      console.error(err);
      toast({ title: "Errore scansione", description: "Riprova con un'immagine più chiara", variant: "destructive" });
    }
    setScanning(false);
  };

  const deleteBill = async (id: string) => {
    const { error } = await supabase.from("energy_bills").delete().eq("id", id);
    if (!error) {
      setBills((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Bolletta eliminata" });
    }
  };

  const elecBills = bills.filter((b) => b.bill_type === "electricity").sort((a, b) => 
    (a.period_end || "").localeCompare(b.period_end || ""));
  const gasBills = bills.filter((b) => b.bill_type === "gas").sort((a, b) => 
    (a.period_end || "").localeCompare(b.period_end || ""));

  const getTrend = (sorted: BillRecord[], key: "kwh" | "gas_smc" | "cost_euros") => {
    if (sorted.length < 2) return null;
    const last = sorted[sorted.length - 1][key];
    const prev = sorted[sorted.length - 2][key];
    if (last == null || prev == null || prev === 0) return null;
    return ((last - prev) / prev) * 100;
  };

  return (
    <div className="space-y-6">
      {/* Upload */}
      <Card className="border-dashed border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
              {scanning ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <Camera className="w-8 h-8 text-primary" />}
            </div>
            <div>
              <h3 className="font-bold text-foreground text-lg">Scansiona una Bolletta</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Carica una foto della tua bolletta luce o gas. L'AI estrarrà automaticamente i consumi.
              </p>
            </div>
            <label className="inline-block cursor-pointer">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={scanning} />
              <Button asChild disabled={scanning} className="gap-2">
                <span>
                  {scanning ? <><Loader2 className="w-4 h-4 animate-spin" />Analisi in corso...</> : <><Upload className="w-4 h-4" />Carica bolletta</>}
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Scan result */}
      <AnimatePresence>
        {scanResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  {scanResult.bill_type === "gas" ? <Flame className="w-5 h-5 text-orange-500" /> : <Zap className="w-5 h-5 text-yellow-500" />}
                  Ultima scansione
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">Fornitore</p>
                    <p className="font-medium text-foreground">{scanResult.provider || "N/D"}</p>
                  </div>
                  <div className="bg-card p-3 rounded-lg border border-border">
                    <p className="text-muted-foreground text-xs">Periodo</p>
                    <p className="font-medium text-foreground">
                      {scanResult.period_start && scanResult.period_end
                        ? `${new Date(scanResult.period_start).toLocaleDateString("it")} — ${new Date(scanResult.period_end).toLocaleDateString("it")}`
                        : "N/D"}
                    </p>
                  </div>
                  {scanResult.kwh != null && (
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-muted-foreground text-xs">Consumo</p>
                      <p className="font-bold text-foreground">{scanResult.kwh} kWh</p>
                    </div>
                  )}
                  {scanResult.gas_smc != null && (
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-muted-foreground text-xs">Consumo</p>
                      <p className="font-bold text-foreground">{scanResult.gas_smc} Smc</p>
                    </div>
                  )}
                  {scanResult.cost_euros != null && (
                    <div className="bg-card p-3 rounded-lg border border-border">
                      <p className="text-muted-foreground text-xs">Costo</p>
                      <p className="font-bold text-foreground">€{scanResult.cost_euros.toFixed(2)}</p>
                    </div>
                  )}
                </div>
                {scanResult.notes && <p className="text-xs text-muted-foreground italic">{scanResult.notes}</p>}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trend cards */}
      {bills.length >= 2 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {elecBills.length >= 2 && (() => {
            const trend = getTrend(elecBills, "kwh");
            if (trend == null) return null;
            const down = trend < 0;
            return (
              <Card className={down ? "border-emerald-500/20" : "border-red-500/20"}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${down ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {down ? <TrendingDown className="w-5 h-5 text-emerald-500" /> : <TrendingUp className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Consumo Elettrico</p>
                    <p className={`text-lg font-bold ${down ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {down ? "" : "+"}{trend.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">vs bolletta precedente</p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
          {gasBills.length >= 2 && (() => {
            const trend = getTrend(gasBills, "gas_smc");
            if (trend == null) return null;
            const down = trend < 0;
            return (
              <Card className={down ? "border-emerald-500/20" : "border-red-500/20"}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${down ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                    {down ? <TrendingDown className="w-5 h-5 text-emerald-500" /> : <TrendingUp className="w-5 h-5 text-red-500" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Consumo Gas</p>
                    <p className={`text-lg font-bold ${down ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {down ? "" : "+"}{trend.toFixed(1)}%
                    </p>
                    <p className="text-xs text-muted-foreground">vs bolletta precedente</p>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {/* History */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <h3 className="font-bold text-foreground flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />Storico Bollette
          </h3>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />Caricamento...
            </div>
          ) : bills.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nessuna bolletta ancora. Carica la tua prima bolletta per iniziare a tracciare i consumi!
            </p>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <motion.div key={bill.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-accent/50 border border-border">
                  <div className="flex items-center gap-3">
                    {bill.bill_type === "gas"
                      ? <Flame className="w-5 h-5 text-orange-500" />
                      : <Zap className="w-5 h-5 text-yellow-500" />}
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {bill.provider || (bill.bill_type === "gas" ? "Gas" : "Luce")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {bill.period_start && bill.period_end
                          ? `${new Date(bill.period_start).toLocaleDateString("it")} — ${new Date(bill.period_end).toLocaleDateString("it")}`
                          : new Date(bill.created_at).toLocaleDateString("it")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      {bill.kwh != null && <p className="text-sm font-bold text-foreground">{bill.kwh} kWh</p>}
                      {bill.gas_smc != null && <p className="text-sm font-bold text-foreground">{bill.gas_smc} Smc</p>}
                      {bill.cost_euros != null && <p className="text-xs text-muted-foreground">€{bill.cost_euros.toFixed(2)}</p>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => deleteBill(bill.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wind, Shield, Thermometer, Droplets, Activity, MapPin, Loader2, Sparkles, Info, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserLocation } from "@/hooks/useUserLocation";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  fetchAirQuality,
  fetchWeather,
  type AirQualityData,
  type AirQualityHourly,
  type WeatherData,
} from "@/lib/airQualityApi";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1 } }),
};

const levelConfig: Record<string, { bg: string; text: string; border: string }> = {
  Ottima: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20" },
  Buona: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/20" },
  Moderata: { bg: "bg-orange-500/10", text: "text-orange-600 dark:text-orange-400", border: "border-orange-500/20" },
  Scarsa: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400", border: "border-red-500/20" },
};

const pollutantInfo: Record<string, { health: string; protect: string }> = {
  "PM2.5": {
    health: "Le polveri sottili PM2.5 penetrano in profondità nei polmoni e nel sangue, causando infiammazioni, problemi cardiovascolari, asma, e aumentando il rischio di tumori polmonari. Sono particolarmente pericolose per bambini, anziani e chi soffre di patologie respiratorie.",
    protect: "Usa mascherine FFP2 nei giorni critici, evita attività fisica intensa all'aperto, usa purificatori d'aria in casa, tieni chiuse le finestre nelle ore di traffico intenso e non bruciare legna o rifiuti.",
  },
  "PM10": {
    health: "Le polveri inalabili PM10 si depositano nelle vie respiratorie superiori causando irritazione, tosse, bronchiti e peggioramento di asma e allergie. L'esposizione prolungata aumenta il rischio di malattie polmonari croniche.",
    protect: "Evita di camminare lungo strade trafficate, preferisci percorsi in aree verdi, arieggia la casa nelle ore meno inquinate (prima mattina o tarda sera), e mantieni puliti i filtri dell'aria condizionata.",
  },
  "O3": {
    health: "L'ozono troposferico irrita le vie respiratorie, riduce la funzionalità polmonare, provoca dolore toracico, tosse e difficoltà respiratorie. Si forma nelle giornate calde e soleggiate dal traffico e industrie.",
    protect: "Evita attività all'aperto nelle ore più calde (12-17), resta in ambienti climatizzati, bevi molta acqua. L'ozono non penetra facilmente in casa, quindi tenere chiuse le finestre nelle ore di picco è efficace.",
  },
  "NO2": {
    health: "Il biossido di azoto infiamma le vie aeree, riduce le difese immunitarie polmonari, peggiora l'asma e aumenta la suscettibilità alle infezioni respiratorie. Proviene principalmente dal traffico veicolare.",
    protect: "Evita zone ad alto traffico, usa trasporto pubblico o bicicletta su percorsi alternativi, tieni chiusi i finestrini dell'auto nel traffico, e sostieni politiche per la mobilità sostenibile.",
  },
};

function AqiGauge({ aqi, level, color }: { aqi: number; level: string; color: string }) {
  const colorMap: Record<string, string> = {
    green: "from-emerald-400 to-emerald-600",
    yellow: "from-amber-400 to-amber-500",
    orange: "from-orange-400 to-orange-600",
    red: "from-red-500 to-red-700",
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 150 }}
        className={`w-36 h-36 rounded-full bg-gradient-to-br ${colorMap[color] || colorMap.yellow} flex items-center justify-center shadow-xl relative`}
      >
        <div className="absolute inset-2 rounded-full bg-card/90 flex flex-col items-center justify-center">
          <p className="text-4xl font-bold text-foreground">{aqi}</p>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold mt-0.5">European AQI</p>
        </div>
      </motion.div>
      <Badge className={`${levelConfig[level]?.bg} ${levelConfig[level]?.text} ${levelConfig[level]?.border} text-sm px-4 py-1`}>
        Qualità: {level}
      </Badge>
    </div>
  );
}

function ForecastChart({ forecast }: { forecast: AirQualityHourly[] }) {
  const maxAqi = Math.max(...forecast.map((f) => f.european_aqi), 1);
  return (
    <div className="space-y-3">
      <div className="flex gap-1 items-end h-32">
        {forecast.slice(0, 24).map((f, i) => {
          const h = Math.max(8, (f.european_aqi / maxAqi) * 100);
          const colorMap: Record<string, string> = { green: "bg-emerald-400", yellow: "bg-amber-400", orange: "bg-orange-400", red: "bg-red-500" };
          return (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.02, duration: 0.4 }} className="flex-1 group relative">
              <div className={`w-full h-full rounded-t-sm ${colorMap[f.color] || "bg-amber-400"}`} />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-[10px] whitespace-nowrap">
                  <p className="font-bold text-foreground">{f.hour}</p>
                  <p className="text-muted-foreground">AQI: {f.european_aqi} | PM2.5: {f.pm25}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {[0, 6, 12, 18, 23].map((i) => (
          <span key={i}>{forecast[i]?.hour || ""}</span>
        ))}
      </div>
    </div>
  );
}

function PollutantInfoPanel({ pollutantKey, onClose }: { pollutantKey: string; onClose: () => void }) {
  const info = pollutantInfo[pollutantKey];
  if (!info) return null;
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden"
    >
      <div className="mt-2 p-3 rounded-lg bg-accent/50 border border-border text-xs space-y-2">
        <div className="flex justify-between items-start">
          <p className="font-bold text-foreground">⚠️ Rischi per la salute</p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-muted-foreground leading-relaxed">{info.health}</p>
        <p className="font-bold text-foreground">🛡️ Come proteggersi</p>
        <p className="text-muted-foreground leading-relaxed">{info.protect}</p>
      </div>
    </motion.div>
  );
}

export default function AirAlert() {
  const { location } = useUserLocation();
  const [aq, setAq] = useState<AirQualityData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<AirQualityHourly[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiTips, setAiTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [expandedPollutant, setExpandedPollutant] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [aqData, weatherData] = await Promise.all([
          fetchAirQuality(location.latitude, location.longitude),
          fetchWeather(location.latitude, location.longitude),
        ]);
        setAq(aqData.current);
        setForecast(aqData.hourly);
        setWeather(weatherData);
      } catch (e) {
        console.error("Failed to load air quality data", e);
      }
      setLoading(false);
    };
    load();
  }, [location.latitude, location.longitude]);

  const generateAiTips = async () => {
    if (!aq) return;
    setLoadingTips(true);
    setAiTips([]);
    try {
      const { data, error } = await supabase.functions.invoke("air-quality-tips", {
        body: {
          airData: {
            european_aqi: aq.european_aqi,
            level: aq.level,
            pm25: aq.pm25,
            pm10: aq.pm10,
            o3: aq.o3,
            no2: aq.no2,
          },
          weatherData: weather
            ? { temperature: weather.temperature, humidity: weather.humidity, wind_speed: weather.wind_speed }
            : null,
          city: location.city || "la mia città",
        },
      });
      if (error) throw error;
      setAiTips(data.tips || []);
    } catch (e: any) {
      console.error("AI tips error:", e);
      toast.error("Errore nella generazione dei consigli AI");
    }
    setLoadingTips(false);
  };

  if (loading || !aq || !weather) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const config = levelConfig[aq.level] || levelConfig.Buona;

  const pollutants = [
    { name: "Polveri sottili (PM2.5)", key: "PM2.5", value: Math.round(aq.pm25 * 10) / 10, unit: "µg/m³", limit: 25, icon: "🫁" },
    { name: "Polveri inalabili (PM10)", key: "PM10", value: Math.round(aq.pm10 * 10) / 10, unit: "µg/m³", limit: 50, icon: "💨" },
    { name: "Ozono", key: "O3", value: Math.round(aq.o3 * 10) / 10, unit: "µg/m³", limit: 120, icon: "☀️" },
    { name: "Biossido di azoto", key: "NO2", value: Math.round(aq.no2 * 10) / 10, unit: "µg/m³", limit: 40, icon: "🏭" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🌡️ AirAlert</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          Qualità dell'aria in tempo reale — {location.city || "La tua posizione"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          📅 {new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · 🕐 {new Date().toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Fonte: Open-Meteo Air Quality API · Indice European AQI
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className={`${config.bg} ${config.border}`}>
            <CardContent className="p-8 flex flex-col items-center">
              <AqiGauge aqi={aq.european_aqi} level={aq.level} color={aq.color} />
              <div className="grid grid-cols-3 gap-6 mt-8 w-full">
                {[
                  { label: "Temperatura", value: `${weather.temperature}°C`, icon: Thermometer },
                  { label: "Umidità", value: `${weather.humidity}%`, icon: Droplets },
                  { label: "Vento", value: `${weather.wind_speed} km/h`, icon: Wind },
                ].map((item) => (
                  <div key={item.label} className="text-center">
                    <item.icon className="w-5 h-5 mx-auto text-muted-foreground mb-1" />
                    <p className="text-sm font-bold text-foreground">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Tips Section */}
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card className="h-full flex flex-col">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Consigli AI personalizzati
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {aiTips.length === 0 && !loadingTips && (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Consigli basati sull'aria di oggi</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      L'AI analizzerà i dati in tempo reale e ti darà suggerimenti personalizzati
                    </p>
                  </div>
                  <Button onClick={generateAiTips} className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    Genera consigli
                  </Button>
                </div>
              )}

              {loadingTips && (
                <div className="flex-1 flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground">Analisi dei dati in corso…</p>
                </div>
              )}

              {aiTips.length > 0 && !loadingTips && (
                <div className="space-y-2">
                  {aiTips.map((tip, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-3 bg-accent rounded-lg text-sm text-foreground"
                    >
                      {tip}
                    </motion.div>
                  ))}
                  <Button variant="outline" size="sm" onClick={generateAiTips} className="w-full mt-3 gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Rigenera consigli
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Forecast */}
      {forecast.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Qualità dell'aria nelle prossime 24 ore
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ForecastChart forecast={forecast} />
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                {[
                  { label: "Ottima (≤20)", color: "bg-emerald-400" },
                  { label: "Buona (21-40)", color: "bg-amber-400" },
                  { label: "Moderata (41-60)", color: "bg-orange-400" },
                  { label: "Scarsa (>60)", color: "bg-red-500" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <div className={`w-3 h-3 rounded-sm ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pollutants with info */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {pollutants.map((p) => {
            const pct = Math.min(100, (p.value / p.limit) * 100);
            const isOk = pct < 80;
            const isExpanded = expandedPollutant === p.key;
            return (
              <Card key={p.name}>
                <CardContent className="p-4 text-center space-y-2">
                  <p className="text-xl">{p.icon}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs font-bold text-muted-foreground uppercase">{p.name}</p>
                    <button
                      onClick={() => setExpandedPollutant(isExpanded ? null : p.key)}
                      className="text-primary hover:text-primary/80 transition-colors"
                      title="Info su questo inquinante"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className={`text-2xl font-bold ${isOk ? "text-foreground" : "text-destructive"}`}>{p.value}</p>
                  <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isOk ? "bg-primary" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground">Limite OMS: {p.limit} {p.unit}</p>
                  <AnimatePresence>
                    {isExpanded && <PollutantInfoPanel pollutantKey={p.key} onClose={() => setExpandedPollutant(null)} />}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

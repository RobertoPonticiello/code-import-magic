import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wind, Shield, Thermometer, Droplets, Activity, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useUserLocation } from "@/hooks/useUserLocation";
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

const levelConfig: Record<string, { bg: string; text: string; border: string; advice: string[] }> = {
  Ottima: {
    bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/20",
    advice: ["🏃 Giornata perfetta per attività all'aperto", "🪟 Apri le finestre e arieggia bene la casa", "🌳 Approfitta per una passeggiata al parco"],
  },
  Buona: {
    bg: "bg-amber-500/10", text: "text-amber-600", border: "border-amber-500/20",
    advice: ["✅ Attività all'aperto consentite", "👶 Chi è sensibile limiti sforzi intensi", "🏠 Arieggia nelle ore meno trafficate"],
  },
  Moderata: {
    bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/20",
    advice: ["⚠️ Evita attività sportive all'aperto prolungate", "😷 Chi soffre d'asma usi la mascherina FFP2", "🪟 Tieni chiuse le finestre nelle ore di punta", "🚗 Evita di usare l'auto per ridurre le emissioni"],
  },
  Scarsa: {
    bg: "bg-red-500/10", text: "text-red-600", border: "border-red-500/20",
    advice: ["🚨 Resta in casa il più possibile", "😷 Mascherina FFP2 obbligatoria all'aperto", "🏋️ Niente sport all'aperto", "👴 Anziani e bambini: massima cautela"],
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

export default function AirAlert() {
  const { location } = useUserLocation();
  const [aq, setAq] = useState<AirQualityData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<AirQualityHourly[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || !aq || !weather) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const config = levelConfig[aq.level] || levelConfig.Buona;

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">🌡️ AirAlert</h1>
        <p className="text-muted-foreground mt-1 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          Qualità dell'aria in tempo reale — {location.city || "La tua posizione"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          Fonte: Open-Meteo Air Quality API (dati reali European AQI)
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

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Consigli per oggi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {config.advice.map((tip, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="p-3 bg-accent rounded-lg text-sm text-foreground">
                  {tip}
                </motion.div>
              ))}
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
                Previsione 24 ore — European AQI (dati reali)
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

      {/* Pollutants - REAL DATA */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={4}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { name: "PM2.5", value: Math.round(aq.pm25 * 10) / 10, unit: "µg/m³", limit: 25, icon: "🫁" },
            { name: "PM10", value: Math.round(aq.pm10 * 10) / 10, unit: "µg/m³", limit: 50, icon: "💨" },
            { name: "O₃", value: Math.round(aq.o3 * 10) / 10, unit: "µg/m³", limit: 120, icon: "☀️" },
            { name: "NO₂", value: Math.round(aq.no2 * 10) / 10, unit: "µg/m³", limit: 40, icon: "🏭" },
          ].map((p) => {
            const pct = Math.min(100, (p.value / p.limit) * 100);
            const isOk = pct < 80;
            return (
              <Card key={p.name}>
                <CardContent className="p-4 text-center space-y-2">
                  <p className="text-xl">{p.icon}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase">{p.name}</p>
                  <p className={`text-2xl font-bold ${isOk ? "text-foreground" : "text-destructive"}`}>{p.value}</p>
                  <p className="text-[10px] text-muted-foreground">{p.unit}</p>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isOk ? "bg-primary" : "bg-destructive"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-[9px] text-muted-foreground">Limite OMS: {p.limit} {p.unit}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// EcoSignal - Mock data layer (replaces localhost:8000 backend)
// In production, these would be API calls

export interface EnvData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
  aqi_pm25: number;
  aqi_level: string;
  aqi_color: string;
  co2_saved_today_kg: number;
  source: string;
}

export interface EcoAction {
  id: string;
  title: string;
  description: string;
  co2_grams: number;
  difficulty: "facile" | "medio" | "difficile";
  category: "trasporti" | "alimentazione" | "energia" | "rifiuti" | "acqua";
  icon: string;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  requirement: string;
}

export interface CarbonProfile {
  transport: number;
  diet: number;
  home: number;
  shopping: number;
  total: number;
  nationalAvg: number;
  europeanAvg: number;
}

export interface AirQualityForecast {
  hour: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  level: string;
  color: string;
}

// Fetch real env data from Open-Meteo
export async function fetchEnvData(): Promise<EnvData> {
  try {
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=41.9028&longitude=12.4964&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&hourly=pm10,pm2_5&timezone=Europe/Rome"
    );
    if (res.ok) {
      const data = await res.json();
      const current = data.current || {};
      const hourly = data.hourly || {};
      const pm25Values = hourly.pm2_5 || [];
      const pm25 = pm25Values[0] || 18.5;
      const level = pm25 < 12 ? "Ottima" : pm25 < 35 ? "Buona" : pm25 < 55 ? "Moderata" : "Scarsa";
      const color = pm25 < 12 ? "green" : pm25 < 35 ? "yellow" : pm25 < 55 ? "orange" : "red";
      return {
        temperature: current.temperature_2m ?? 21.3,
        humidity: current.relative_humidity_2m ?? 58,
        wind_speed: current.wind_speed_10m ?? 12.4,
        precipitation: current.precipitation ?? 0,
        aqi_pm25: Math.round(pm25 * 10) / 10,
        aqi_level: level,
        aqi_color: color,
        co2_saved_today_kg: 0,
        source: "Open-Meteo (live)",
      };
    }
  } catch {
    // fallback
  }
  return {
    temperature: 21.3,
    humidity: 58,
    wind_speed: 12.4,
    precipitation: 0,
    aqi_pm25: 18.5,
    aqi_level: "Buona",
    aqi_color: "yellow",
    co2_saved_today_kg: 0,
    source: "Dati simulati",
  };
}

export function getDailyActions(): EcoAction[] {
  return [
    {
      id: "action-1",
      title: "Usa i mezzi pubblici",
      description: "Lascia l'auto per gli spostamenti di oggi. Un viaggio in metro produce 10x meno CO₂.",
      co2_grams: 2200,
      difficulty: "facile",
      category: "trasporti",
      icon: "🚇",
    },
    {
      id: "action-2",
      title: "Pasto vegetariano",
      description: "Un pasto senza carne riduce l'impronta idrica di 1.500L e quella carbonica di 900g.",
      co2_grams: 900,
      difficulty: "facile",
      category: "alimentazione",
      icon: "🥗",
    },
    {
      id: "action-3",
      title: "Abbassa il riscaldamento",
      description: "Riduci di 1°C il termostato: -7% di consumi e ~150g CO₂ in meno.",
      co2_grams: 150,
      difficulty: "facile",
      category: "energia",
      icon: "🌡️",
    },
    {
      id: "action-4",
      title: "Doccia di 5 minuti",
      description: "Riduci il tempo della doccia a 5 minuti, risparmiando 40L d'acqua e gas.",
      co2_grams: 350,
      difficulty: "medio",
      category: "acqua",
      icon: "🚿",
    },
    {
      id: "action-5",
      title: "Spegni standby elettronici",
      description: "Spegni completamente TV, console e caricatori: lo standby consuma fino a 10% dell'energia domestica.",
      co2_grams: 180,
      difficulty: "facile",
      category: "energia",
      icon: "🔌",
    },
    {
      id: "action-6",
      title: "Fai la spesa a km zero",
      description: "Compra prodotti locali e di stagione al mercato rionale: meno trasporto, più freschezza.",
      co2_grams: 400,
      difficulty: "medio",
      category: "alimentazione",
      icon: "🛒",
    },
  ];
}

export function getBadges(): Badge[] {
  return [
    { id: "b1", name: "Primo Passo", description: "Completa la tua prima azione", icon: "🌱", unlocked: true, unlockedAt: "2026-03-25", requirement: "1 azione" },
    { id: "b2", name: "Eco Warrior", description: "Completa 10 azioni", icon: "⚔️", unlocked: true, unlockedAt: "2026-03-27", requirement: "10 azioni" },
    { id: "b3", name: "Streak Master", description: "Mantieni una streak di 7 giorni", icon: "🔥", unlocked: true, unlockedAt: "2026-03-28", requirement: "7 giorni streak" },
    { id: "b4", name: "Carbon Saver", description: "Risparmia 5kg di CO₂", icon: "💎", unlocked: false, requirement: "5kg CO₂" },
    
    { id: "b6", name: "Influencer Verde", description: "Ispira 5 amici a unirsi", icon: "🌍", unlocked: false, requirement: "5 inviti" },
    { id: "b7", name: "Zero Waste Hero", description: "7 giorni senza rifiuti indifferenziati", icon: "♻️", unlocked: false, requirement: "7 giorni zero waste" },
    { id: "b8", name: "Leggenda Eco", description: "Completa 100 azioni", icon: "👑", unlocked: false, requirement: "100 azioni" },
  ];
}

export function getAirQualityForecast(): AirQualityForecast[] {
  const hours: AirQualityForecast[] = [];
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const h = new Date(now);
    h.setHours(now.getHours() + i, 0, 0, 0);
    const pm25 = Math.round((15 + Math.sin(i / 3) * 12 + Math.random() * 8) * 10) / 10;
    const level = pm25 < 12 ? "Ottima" : pm25 < 35 ? "Buona" : pm25 < 55 ? "Moderata" : "Scarsa";
    const color = pm25 < 12 ? "green" : pm25 < 35 ? "yellow" : pm25 < 55 ? "orange" : "red";
    hours.push({
      hour: h.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      pm25,
      pm10: Math.round((pm25 * 1.5 + Math.random() * 10) * 10) / 10,
      o3: Math.round((40 + Math.sin(i / 4) * 30 + Math.random() * 15) * 10) / 10,
      no2: Math.round((20 + Math.cos(i / 5) * 15 + Math.random() * 10) * 10) / 10,
      level,
      color,
    });
  }
  return hours;
}

export function getLeaderboard() {
  return [
    { rank: 1, name: "Marco R.", co2_kg: 12.4, actions: 34, streak: 14, avatar: "🧑‍💼" },
    { rank: 2, name: "Giulia S.", co2_kg: 11.8, actions: 31, streak: 12, avatar: "👩‍🔬" },
    { rank: 3, name: "Tu", co2_kg: 8.2, actions: 22, streak: 7, avatar: "🌟", isUser: true },
    { rank: 4, name: "Luca M.", co2_kg: 7.5, actions: 20, streak: 5, avatar: "👨‍🎓" },
    { rank: 5, name: "Sara P.", co2_kg: 6.9, actions: 18, streak: 9, avatar: "👩‍🎨" },
    { rank: 6, name: "Andrea F.", co2_kg: 5.3, actions: 15, streak: 3, avatar: "👨‍💻" },
    { rank: 7, name: "Elena B.", co2_kg: 4.8, actions: 13, streak: 4, avatar: "👩‍🏫" },
  ];
}

export function getWeeklyChallenges() {
  return [
    { id: "c1", title: "Settimana senz'auto", description: "Non usare l'auto per 7 giorni consecutivi", progress: 5, total: 7, reward: "Badge Ciclista Urbano 🚴", co2_potential: 15400 },
    { id: "c2", title: "5 pasti green", description: "Mangia vegetariano per 5 pasti questa settimana", progress: 3, total: 5, reward: "Badge Chef Verde 🌿", co2_potential: 4500 },
    { id: "c3", title: "Risparmio energetico", description: "Riduci il consumo elettrico del 15%", progress: 8, total: 15, reward: "Badge Efficienza ⚡", co2_potential: 2100 },
  ];
}

export function getCarbonProfile(): CarbonProfile {
  return {
    transport: 2.8,
    diet: 1.9,
    home: 1.4,
    shopping: 0.8,
    total: 6.9,
    nationalAvg: 8.2,
    europeanAvg: 7.5,
  };
}


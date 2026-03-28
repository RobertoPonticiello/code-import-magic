// Real air quality data from Open-Meteo Air Quality API (free, no key)

export interface AirQualityData {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  european_aqi: number;
  level: string;
  color: string;
}

export interface AirQualityHourly {
  hour: string;
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
  european_aqi: number;
  level: string;
  color: string;
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  wind_speed: number;
  precipitation: number;
}

function aqiToLevel(aqi: number): { level: string; color: string } {
  if (aqi <= 20) return { level: "Ottima", color: "green" };
  if (aqi <= 40) return { level: "Buona", color: "yellow" };
  if (aqi <= 60) return { level: "Moderata", color: "orange" };
  return { level: "Scarsa", color: "red" };
}

export async function fetchAirQuality(lat: number, lon: number): Promise<{
  current: AirQualityData;
  hourly: AirQualityHourly[];
}> {
  const res = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi&hourly=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi&timezone=Europe/Rome&forecast_days=1`
  );
  
  if (!res.ok) throw new Error("Air quality API error");
  
  const data = await res.json();
  const c = data.current;
  const { level, color } = aqiToLevel(c.european_aqi ?? 30);
  
  const current: AirQualityData = {
    pm25: c.pm2_5 ?? 0,
    pm10: c.pm10 ?? 0,
    o3: c.ozone ?? 0,
    no2: c.nitrogen_dioxide ?? 0,
    european_aqi: c.european_aqi ?? 0,
    level,
    color,
  };

  const h = data.hourly;
  const hourly: AirQualityHourly[] = (h.time || []).map((t: string, i: number) => {
    const pm25 = h.pm2_5?.[i] ?? 0;
    const aqi = h.european_aqi?.[i] ?? 0;
    const lc = aqiToLevel(aqi);
    return {
      hour: new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }),
      pm25,
      pm10: h.pm10?.[i] ?? 0,
      o3: h.ozone?.[i] ?? 0,
      no2: h.nitrogen_dioxide?.[i] ?? 0,
      european_aqi: aqi,
      ...lc,
    };
  });

  return { current, hourly };
}

export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=Europe/Rome`
  );
  if (!res.ok) throw new Error("Weather API error");
  const data = await res.json();
  const c = data.current;
  return {
    temperature: c.temperature_2m ?? 0,
    humidity: c.relative_humidity_2m ?? 0,
    wind_speed: c.wind_speed_10m ?? 0,
    precipitation: c.precipitation ?? 0,
  };
}

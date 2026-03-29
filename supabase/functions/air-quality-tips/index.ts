import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { airData, weatherData, city } = await req.json();

    if (!airData) {
      return new Response(JSON.stringify({ error: "Missing air quality data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sei un esperto di qualità dell'aria e salute ambientale italiano. 
Genera 4-5 consigli personalizzati e pratici basati sui dati reali di qualità dell'aria forniti.
Ogni consiglio deve:
- Iniziare con un emoji pertinente
- Essere specifico ai dati (non generico)
- Includere un'azione concreta che l'utente può fare
- Essere scritto in italiano in modo chiaro e diretto
Rispondi SOLO con i consigli, uno per riga, senza numerazione.`;

    const userPrompt = `Dati qualità dell'aria per ${city || "la mia città"}:
- European AQI: ${airData.european_aqi} (livello: ${airData.level})
- PM2.5: ${airData.pm25} µg/m³ (limite OMS: 25)
- PM10: ${airData.pm10} µg/m³ (limite OMS: 50)
- Ozono (O3): ${airData.o3} µg/m³ (limite OMS: 120)
- Biossido di azoto (NO2): ${airData.no2} µg/m³ (limite OMS: 40)
${weatherData ? `- Temperatura: ${weatherData.temperature}°C, Umidità: ${weatherData.humidity}%, Vento: ${weatherData.wind_speed} km/h` : ""}

Genera consigli personalizzati per oggi.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Troppi richieste, riprova tra qualche secondo." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Errore AI gateway" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || "";
    const tips = content.split("\n").filter((line: string) => line.trim().length > 0);

    return new Response(JSON.stringify({ tips }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("air-quality-tips error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

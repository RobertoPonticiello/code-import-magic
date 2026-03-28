import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { profile } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Sei un esperto di sostenibilità ambientale italiano. L'utente ha appena completato il questionario Carbon Mirror.
Analizza il suo profilo di emissioni CO₂ settimanali e fornisci:
1. Un'analisi personalizzata del suo impatto (2-3 frasi)
2. 4-5 consigli CONCRETI e SPECIFICI basati sulle sue risposte, con stime di risparmio CO₂ in kg/settimana
3. Un piano settimanale sintetico con 3 azioni prioritarie
4. Un confronto motivazionale con la media italiana (8.2 kg/sett) e europea (7.5 kg/sett)

Usa emoji, sii diretto e motivante. Rispondi in italiano. Basa i calcoli su fonti ISPRA e EEA.
Formatta la risposta in markdown.`;

    const userPrompt = `Ecco il mio profilo Carbon Mirror:
- Trasporti: ${profile.transport.toFixed(1)} kg CO₂/sett (tipo: ${profile.transportType}, distanza: ${profile.transportDistance})
- Alimentazione: ${profile.diet.toFixed(1)} kg CO₂/sett (dieta: ${profile.dietType}, spreco: ${profile.foodWaste})
- Casa: ${profile.home.toFixed(1)} kg CO₂/sett (energia: ${profile.homeEnergy}, riscaldamento: ${profile.homeHeating})
- Consumi: ${profile.shopping.toFixed(1)} kg CO₂/sett (abbigliamento: ${profile.shoppingHabit})
- TOTALE: ${profile.total.toFixed(1)} kg CO₂/sett
- Media italiana: 8.2 kg/sett | Media europea: 7.5 kg/sett`;

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
        stream: true,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Troppi richieste, riprova tra poco." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("carbon-ai-tips error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { completedActions, carbonProfile, feedback, reports, userName } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sei un analista di sostenibilità personale. Scrivi in italiano. Analizza il profilo ecologico dell'utente basandoti sui dati forniti.

Struttura la risposta così:
## 🌿 La tua Eco-Persona
Dai un nome creativo al profilo (es. "Il Pendolare Consapevole", "L'Eco-Chef Urbano")

## 📊 Analisi del Profilo
Analisi dettagliata basata sui dati reali

## 💪 Punti di Forza
Cosa fa bene l'utente

## 🎯 Aree di Miglioramento  
Dove può migliorare con suggerimenti concreti

## 🌍 Il tuo Impatto
Contestualizza l'impatto (equivalenze: km in auto, alberi, docce...)

Sii specifico, usa i dati forniti, non inventare numeri. Se i dati sono limitati, dillo e dai consigli generali.`;

    const userPrompt = `Nome utente: ${userName || "Utente"}

Azioni completate oggi: ${JSON.stringify(completedActions || [])}

Profilo carbonio: ${JSON.stringify(carbonProfile || {})}

Feedback sulle azioni: "${feedback || "Nessuno"}"

Segnalazioni ambientali fatte: ${reports || 0}

Genera un'analisi personalizzata del profilo di sostenibilità.`;

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
        return new Response(JSON.stringify({ error: "Troppe richieste, riprova tra poco." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("eco-profile error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

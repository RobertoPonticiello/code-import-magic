import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { currentActions, feedback, userCity } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sei un esperto di sostenibilità ambientale italiano. Genera azioni ecologiche quotidiane personalizzate per un utente che vive a ${userCity || "Roma"}.

REGOLE CRITICHE per i grammi di CO2:
- Ogni stima DEVE essere basata su fonti scientifiche verificate: ISPRA (Istituto Superiore per la Protezione e la Ricerca Ambientale), EEA (European Environment Agency), ENEA, FAO.
- Trasporti: un'auto media emette ~120g CO2/km (fonte ISPRA 2023). Bus/metro: ~30-50g CO2/km per passeggero.
- Alimentazione: un pasto con carne bovina produce ~3.3kg CO2eq (fonte FAO). Un pasto vegetariano ~0.5-1kg CO2eq.
- Energia domestica: mix elettrico italiano ~250g CO2/kWh (fonte ISPRA 2023). Gas naturale ~200g CO2/kWh.
- Acqua calda: ~30-50g CO2 per litro riscaldato con gas (fonte ENEA).
- Rifiuti: riciclare 1kg di plastica risparmia ~1.5kg CO2 (fonte EEA).

Genera esattamente 6 azioni. Ogni azione deve avere stime CO2 REALISTICHE e CONSERVATIVE. Non gonfiare i numeri.
Le azioni devono essere DIVERSE tra le categorie: trasporti, alimentazione, energia, rifiuti, acqua.
Ogni azione deve avere una emoji appropriata come icona.

IMPORTANTE: Considera il feedback dell'utente per personalizzare le azioni. Se l'utente dice che un'azione non è rilevante, sostituiscila con qualcosa di più adatto.`;

    const userPrompt = `Azioni attuali: ${JSON.stringify(currentActions?.map((a: any) => a.title) || [])}

Feedback dell'utente: "${feedback || "Nessun feedback"}"

Genera 6 nuove azioni personalizzate basate sul feedback.`;

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
        tools: [
          {
            type: "function",
            function: {
              name: "generate_eco_actions",
              description: "Generate 6 personalized eco actions with verified CO2 savings",
              parameters: {
                type: "object",
                properties: {
                  actions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string", description: "Unique ID like action-1" },
                        title: { type: "string", description: "Short action title in Italian" },
                        description: { type: "string", description: "Brief description with CO2 context in Italian" },
                        co2_grams: { type: "number", description: "Grams of CO2 saved, based on ISPRA/EEA/ENEA sources" },
                        difficulty: { type: "string", enum: ["facile", "medio", "difficile"] },
                        category: { type: "string", enum: ["trasporti", "alimentazione", "energia", "rifiuti", "acqua"] },
                        icon: { type: "string", description: "Single emoji icon" },
                      },
                      required: ["id", "title", "description", "co2_grams", "difficulty", "category", "icon"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["actions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_eco_actions" } },
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

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("regenerate-actions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

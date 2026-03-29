import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, mimeType } = await req.json();
    if (!imageBase64) throw new Error("imageBase64 is required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Sei un esperto di sostenibilità alimentare e ambientale.
Analizza l'immagine dello scontrino della spesa e valuta la sostenibilità dei prodotti acquistati.

RISPONDI SOLO con un JSON valido, senza markdown, senza commenti, senza testo aggiuntivo.

Schema JSON richiesto:
{
  "store_name": "nome del negozio se visibile, altrimenti null",
  "date": "YYYY-MM-DD se visibile, altrimenti null",
  "total_euros": numero totale speso o null,
  "sustainability_score": numero da 1 a 10 (1=molto insostenibile, 10=molto sostenibile),
  "items": [
    {
      "name": "nome prodotto",
      "price": numero o null,
      "category": "frutta_verdura" | "carne" | "pesce" | "latticini" | "cereali" | "bevande" | "confezionati" | "surgelati" | "pulizia" | "igiene" | "altro",
      "sustainability": "alta" | "media" | "bassa",
      "note": "breve nota sulla sostenibilità del prodotto"
    }
  ],
  "summary": "breve analisi complessiva della sostenibilità della spesa (2-3 frasi)",
  "tips": ["suggerimento 1 per migliorare", "suggerimento 2", "suggerimento 3"],
  "co2_estimate_kg": stima approssimativa di kg CO2 associati alla spesa o null,
  "positive_aspects": ["aspetto positivo 1", "aspetto positivo 2"],
  "negative_aspects": ["aspetto negativo 1", "aspetto negativo 2"]
}

Valuta la sostenibilità in base a:
- Prodotti locali vs importati
- Prodotti freschi vs confezionati
- Impatto ambientale della produzione (carne bovina = alto, frutta/verdura = basso)
- Presenza di prodotti biologici
- Packaging e materiali
- Stagionalità dei prodotti

Se non riesci a leggere un campo, metti null. Non inventare dati sui prezzi.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analizza questo scontrino della spesa e valuta la sostenibilità dei prodotti acquistati." },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Troppe richieste" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Crediti AI esauriti" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ error: "Impossibile interpretare lo scontrino", raw: content }), {
        status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, data: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("scan-receipt error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

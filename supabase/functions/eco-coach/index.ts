import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Non autenticato" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { messages } = await req.json();

    // Fetch all user context in parallel
    const [profileRes, statsRes, carbonRes, actionsRes, billsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_stats").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("carbon_profiles").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("completed_actions").select("action_title, action_category, co2_grams, completed_at, rating, action_difficulty").eq("user_id", userId).order("completed_at", { ascending: false }).limit(50),
      supabase.from("energy_bills").select("bill_type, provider, period_start, period_end, kwh, gas_smc, cost_euros, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
    ]);

    const profile = profileRes.data;
    const stats = statsRes.data;
    const carbonProfiles = carbonRes.data || [];
    const latestCarbon = carbonProfiles[0] || null;
    const carbonHistory = carbonProfiles.slice(0, 5);
    const actions = actionsRes.data || [];
    const bills = billsRes.data || [];

    // Analyze patterns
    const categoryCount: Record<string, number> = {};
    const categoryCo2: Record<string, number> = {};
    for (const a of actions) {
      categoryCount[a.action_category] = (categoryCount[a.action_category] || 0) + 1;
      categoryCo2[a.action_category] = (categoryCo2[a.action_category] || 0) + a.co2_grams;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todayActions = actions.filter(a => a.completed_at?.startsWith(today));
    const lastWeekActions = actions.filter(a => {
      const d = new Date(a.completed_at);
      return d >= new Date(Date.now() - 7 * 86400000);
    });

    const systemPrompt = `Sei EcoCoach, un assistente AI esperto di sostenibilità personale. Parli italiano con tono amichevole e motivazionale. 

CONTESTO UTENTE COMPLETO:
- Nome: ${profile?.display_name || "Utente"}
- Città: ${profile?.city || "Non specificata"}
- XP totali: ${stats?.xp || 0}, Livello streak: ${stats?.streak_days || 0} giorni
- Azioni totali completate: ${stats?.total_actions || 0}
- CO₂ totale risparmiata: ${(stats?.total_co2_grams || 0)}g (${((stats?.total_co2_grams || 0) / 1000).toFixed(1)}kg)


PROFILO CARBONIO (ultima compilazione):
${latestCarbon ? `- Trasporti: ${latestCarbon.transport} kg CO₂/sett
- Alimentazione: ${latestCarbon.diet} kg CO₂/sett
- Casa: ${latestCarbon.home} kg CO₂/sett
- Shopping: ${latestCarbon.shopping} kg CO₂/sett
- Totale: ${latestCarbon.total} kg CO₂/sett
- Risposte dettagliate: ${JSON.stringify(latestCarbon.answers)}` : "Non ancora compilato"}

EVOLUZIONE PROFILO CARBONIO (ultimi ${carbonHistory.length} aggiornamenti):
${carbonHistory.map((c: any) => `[${c.created_at?.slice(0, 10)}] Tot: ${c.total}kg (T:${c.transport} A:${c.diet} C:${c.home} S:${c.shopping})`).join("\n") || "Nessuno storico"}

AZIONI RECENTI (ultime 50):
${actions.slice(0, 20).map((a: any) => `- [${a.completed_at?.slice(0, 10)}] ${a.action_title} (${a.action_category}, ${a.co2_grams}g CO₂, diff: ${a.action_difficulty}${a.rating ? `, voto: ${a.rating}/5` : ""})`).join("\n") || "Nessuna azione"}

DISTRIBUZIONE PER CATEGORIA:
${Object.entries(categoryCount).map(([k, v]) => `- ${k}: ${v} azioni, ${categoryCo2[k]}g CO₂`).join("\n") || "Nessun dato"}

AZIONI DI OGGI: ${todayActions.length} completate (${todayActions.reduce((s: number, a: any) => s + a.co2_grams, 0)}g CO₂)
AZIONI ULTIMA SETTIMANA: ${lastWeekActions.length} completate

BOLLETTE ENERGETICHE:
${bills.length > 0 ? bills.map((b: any) => `- ${b.bill_type} ${b.provider || ""}: ${b.period_start || "?"} → ${b.period_end || "?"}, ${b.kwh ? b.kwh + " kWh" : ""}${b.gas_smc ? ", " + b.gas_smc + " Smc" : ""}, €${b.cost_euros || "?"}`).join("\n") : "Nessuna bolletta caricata"}

SEGNALAZIONI AMBIENTALI:
${reports.length > 0 ? reports.map((r: any) => `- [${r.created_at?.slice(0, 10)}] ${r.title} (${r.type}, ${r.severity})`).join("\n") : "Nessuna segnalazione"}

REGOLE:
1. Rispondi SEMPRE in italiano
2. Usa i DATI REALI dell'utente per personalizzare ogni risposta
3. Identifica PUNTI DI FORZA (categorie dove l'utente è più attivo) e PUNTI DEBOLI (categorie trascurate)
4. Suggerisci azioni CONCRETE e misurabili
5. Confronta con medie nazionali italiane quando rilevante (media italiana: ~8.2 kg CO₂/sett)
6. Se l'utente chiede dei consumi energetici, analizza l'evoluzione delle bollette
7. Motiva sempre con dati e equivalenze (km in auto, alberi, docce, ecc.)
8. Sii empatico ma onesto. Se l'utente può migliorare, dillo con gentilezza
9. Usa emoji con moderazione per rendere la chat piacevole
10. Risposte concise ma complete. Non ripetere sempre tutti i dati, usali quando servono`;

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
          ...messages,
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
    console.error("eco-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

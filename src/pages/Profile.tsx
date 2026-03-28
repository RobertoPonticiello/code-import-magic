import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Leaf, RefreshCw, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getCarbonProfile } from "@/lib/mockData";
import ReactMarkdown from "react-markdown";

const PROFILE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/eco-profile`;

export default function Profile() {
  const { user } = useAuth();
  const [profileText, setProfileText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  const generateProfile = async () => {
    setIsLoading(true);
    setProfileText("");
    setHasGenerated(true);

    try {
      // Gather data from localStorage or defaults
      const completedActions = JSON.parse(localStorage.getItem("eco_completed_actions") || "[]");
      const feedback = localStorage.getItem("eco_last_feedback") || "";
      const carbonProfile = getCarbonProfile();

      const resp = await fetch(PROFILE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          completedActions,
          carbonProfile,
          feedback,
          reports: 0,
          userName: user?.user_metadata?.full_name || user?.email || "Utente",
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Errore sconosciuto" }));
        setProfileText(`❌ ${err.error || "Errore nella generazione del profilo"}`);
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setProfileText(fullText);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      setProfileText("❌ Errore di connessione. Riprova più tardi.");
    }
    setIsLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Profilo Sostenibilità</h1>
            <p className="text-sm text-muted-foreground">
              {user?.user_metadata?.full_name || user?.email}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Il tuo Eco-Profilo AI
              </CardTitle>
              <Button
                onClick={generateProfile}
                disabled={isLoading}
                size="sm"
                className="gap-2"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Leaf className="w-4 h-4" />
                )}
                {hasGenerated ? "Rigenera" : "Genera Profilo"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {!hasGenerated && !isLoading && (
              <div className="text-center py-12 text-muted-foreground">
                <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm">Clicca "Genera Profilo" per ottenere un'analisi AI personalizzata</p>
                <p className="text-xs mt-1">Basata sulle tue azioni, feedback e interazioni nella piattaforma</p>
              </div>
            )}
            {(isLoading || profileText) && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown>{profileText}</ReactMarkdown>
                {isLoading && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="bg-accent/50 border-accent">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">
              💡 Il profilo si arricchisce con l'uso: completa azioni nella Dashboard, inserisci feedback, 
              usa il Carbon Mirror e fai segnalazioni su Quartiere Vivo per un'analisi sempre più accurata.
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

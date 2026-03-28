import { useState } from "react";
import { motion } from "framer-motion";
import { Users, Crown, Copy, LogOut, Plus, KeyRound, Flag, Star, Loader2, AlertTriangle, Check, Coins, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useGroup, useGroupActions, useGroupLeaderboard } from "@/hooks/useGroup";
import { useJackpot } from "@/hooks/useJackpot";
import { co2GramsToEuros, formatEuros } from "@/lib/savingsUtils";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

function NoGroupView({ onCreate, onJoin }: { onCreate: (name: string) => Promise<any>; onJoin: (code: string) => Promise<any> }) {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await onCreate(name.trim());
      toast({ title: "Gruppo creato! 🎉" });
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await onJoin(code.trim());
      toast({ title: "Unito al gruppo! 🎉" });
    } catch (e: any) {
      toast({ title: "Errore", description: e.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
        <Users className="w-10 h-10 text-primary" />
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">Nessun gruppo</h2>
        <p className="text-muted-foreground text-sm max-w-sm">Crea un gruppo o unisciti con un codice invito per competere con i tuoi amici!</p>
      </div>

      {mode === "idle" && (
        <div className="flex gap-3">
          <Button onClick={() => setMode("create")} className="gap-2"><Plus className="w-4 h-4" /> Crea gruppo</Button>
          <Button variant="outline" onClick={() => setMode("join")} className="gap-2"><KeyRound className="w-4 h-4" /> Unisciti</Button>
        </div>
      )}

      {mode === "create" && (
        <Card className="w-full max-w-sm">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Nome del gruppo" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading || !name.trim()} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crea"}
              </Button>
              <Button variant="ghost" onClick={() => setMode("idle")}>Annulla</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {mode === "join" && (
        <Card className="w-full max-w-sm">
          <CardContent className="p-4 space-y-3">
            <Input placeholder="Codice invito (es. ABC123)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} />
            <div className="flex gap-2">
              <Button onClick={handleJoin} disabled={loading || !code.trim()} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unisciti"}
              </Button>
              <Button variant="ghost" onClick={() => setMode("idle")}>Annulla</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Group() {
  const { user } = useAuth();
  const { group, members, loading, createGroup, joinGroup, leaveGroup } = useGroup();
  const { actions, loading: actionsLoading, flagAction } = useGroupActions();
  const { leaderboard } = useGroupLeaderboard(members, actions);
  const { toast } = useToast();
  const memberIds = members.map((m) => m.user_id);
  const { jackpot, userHasJoined, totalPot, proposeJackpot, joinJackpot, cancelJackpot, awardWinner, getMemberBalance } = useJackpot(group?.id || null, memberIds);
  const [copied, setCopied] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [jackpotAmount, setJackpotAmount] = useState("2");
  const [tab, setTab] = useState<"classifica" | "feed">("classifica");

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">👥 Il Mio Gruppo</h1>
          <p className="text-muted-foreground mt-1">Competi con i tuoi amici per salvare il pianeta</p>
        </motion.div>
        <NoGroupView onCreate={createGroup} onJoin={joinGroup} />
      </div>
    );
  }

  const copyCode = () => {
    navigator.clipboard.writeText(group.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Codice copiato!" });
  };

  const handleFlag = async (actionId: string) => {
    try {
      await flagAction(actionId, group.id);
      toast({ title: "Azione segnalata 🚩" });
    } catch {
      toast({ title: "Errore nella segnalazione", variant: "destructive" });
    }
  };

  const handleLeave = async () => {
    await leaveGroup();
    setLeaveDialogOpen(false);
    toast({ title: "Hai lasciato il gruppo" });
  };

  const avatars = ["🧑‍💼", "👩‍🔬", "👨‍🎓", "👩‍🎨", "👨‍💻"];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">👥 Il Mio Gruppo</h1>
        <p className="text-muted-foreground mt-1">Competi con i tuoi amici per salvare il pianeta</p>
      </motion.div>

      {/* Group info card */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <Card className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{group.name}</h2>
                <p className="text-sm text-muted-foreground">{members.length}/5 membri</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Codice:</span>
                  <span className="font-mono font-bold text-foreground tracking-wider">{group.invite_code}</span>
                  <button onClick={copyCode} className="p-1 hover:bg-accent rounded transition-colors">
                    {copied ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                  </button>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setLeaveDialogOpen(true)} title="Lascia il gruppo">
                  <LogOut className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Jackpot Card */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <Card className="border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-transparent">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-foreground">Jackpot Settimanale</h3>
              {jackpot && (
                <span className="ml-auto text-sm font-bold text-amber-500">💰 €{totalPot.toFixed(2)} in palio</span>
              )}
            </div>

            {!jackpot ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Proponi un importo (uguale per tutti, max €5) come premio per il vincitore della settimana.</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-card border border-border rounded-lg px-3 py-2">
                    <span className="text-sm text-muted-foreground">€</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="1"
                      value={jackpotAmount}
                      onChange={(e) => setJackpotAmount(e.target.value)}
                      className="w-12 bg-transparent text-foreground text-sm font-bold focus:outline-none"
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      proposeJackpot(Number(jackpotAmount));
                      toast({ title: "Jackpot proposto! 🎰", description: `€${jackpotAmount} a testa` });
                    }}
                    className="gap-1"
                  >
                    <Coins className="w-3.5 h-3.5" /> Proponi
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">€{jackpot.amountPerPerson} a testa · {jackpot.participants.length}/{members.length} partecipanti</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {!userHasJoined && (
                    <Button size="sm" onClick={() => {
                      joinJackpot();
                      toast({ title: "Hai partecipato al jackpot! 💰" });
                    }} className="gap-1">
                      <Wallet className="w-3.5 h-3.5" /> Paga €{jackpot.amountPerPerson} (mock)
                    </Button>
                  )}
                  {userHasJoined && (
                    <span className="text-xs text-primary font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Hai pagato
                    </span>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => {
                    cancelJackpot();
                    toast({ title: "Jackpot annullato" });
                  }} className="text-xs text-muted-foreground">
                    Annulla jackpot
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tabs */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <div className="flex gap-1 bg-muted p-1 rounded-xl">
          {[
            { id: "classifica" as const, label: "Classifica Settimanale", icon: Crown },
            { id: "feed" as const, label: "Feed Azioni", icon: Users },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {tab === "classifica" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                Classifica Settimanale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {leaderboard.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessuna azione questa settimana ancora!</p>
              ) : (
                leaderboard.map((entry, i) => {
                  const bal = getMemberBalance(entry.user_id);
                  return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      entry.user_id === user?.id ? "bg-primary/5 border-primary/20 shadow-sm" : "bg-card border-border"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      entry.rank === 1 ? "bg-amber-400 text-amber-950" :
                      entry.rank === 2 ? "bg-muted-foreground/30 text-foreground" :
                      entry.rank === 3 ? "bg-amber-600 text-amber-50" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                    </div>
                    <span className="text-xl">{avatars[i % avatars.length]}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${entry.user_id === user?.id ? "text-primary" : "text-foreground"}`}>
                        {entry.display_name} {entry.user_id === user?.id && "(Tu)"}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
                        {entry.crowns > 0 && (
                          <span className="flex items-center gap-0.5 text-amber-500 font-semibold">
                            <Crown className="w-3 h-3" /> {entry.crowns} coron{entry.crowns === 1 ? "a" : "e"}
                          </span>
                        )}
                        {(bal.totalWon > 0 || bal.totalPaid > 0) && (
                          <span className={`flex items-center gap-0.5 font-semibold ${bal.net >= 0 ? "text-emerald-500" : "text-destructive"}`}>
                            {bal.net >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {bal.net >= 0 ? "+" : ""}€{bal.net.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">{(entry.week_points / 1000).toFixed(1)} kg</p>
                      <p className="text-[10px] text-muted-foreground">CO₂ settimana</p>
                    </div>
                  </motion.div>
                  );
                })
              )}
            </CardContent>
          </Card>
        )}

        {tab === "feed" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Azioni del Gruppo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {actionsLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
              ) : actions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nessuna azione questa settimana.</p>
              ) : (
                actions.map((action, i) => (
                  <motion.div
                    key={action.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`p-4 rounded-xl border space-y-2 ${
                      action.flagged ? "bg-destructive/5 border-destructive/20" : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-primary">{action.display_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(action.completed_at).toLocaleDateString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {action.flagged && (
                            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Falsata
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-foreground mt-1">{action.action_title}</p>
                        {action.action_description && (
                          <p className="text-xs text-muted-foreground">{action.action_description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-xs font-bold ${action.flagged ? "text-destructive line-through" : "text-primary"}`}>
                          {(action.co2_grams / 1000).toFixed(1)} kg
                        </p>
                        <p className="text-[10px] text-muted-foreground">{formatEuros(co2GramsToEuros(action.co2_grams))}</p>
                      </div>
                    </div>

                    {/* Note & rating */}
                    {(action.user_note || action.rating) && (
                      <div className="flex items-center gap-3 text-xs">
                        {action.rating && (
                          <span className="flex items-center gap-0.5">
                            {Array.from({ length: action.rating }).map((_, j) => (
                              <Star key={j} className="w-3 h-3 fill-amber-400 text-amber-400" />
                            ))}
                          </span>
                        )}
                        {action.user_note && (
                          <span className="text-muted-foreground italic">"{action.user_note}"</span>
                        )}
                      </div>
                    )}

                    {/* Image */}
                    {action.image_url && (
                      <img src={action.image_url} alt="Azione" className="rounded-lg max-h-48 object-cover w-full" />
                    )}

                    {/* Flag button */}
                    {action.user_id !== user?.id && !action.flagged && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">
                          {action.flag_count > 0 && `${action.flag_count} segnalazion${action.flag_count === 1 ? "e" : "i"}`}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFlag(action.id)}
                          disabled={action.user_has_flagged}
                          className={`text-xs gap-1 h-7 ${action.user_has_flagged ? "text-destructive" : "text-muted-foreground hover:text-destructive"}`}
                        >
                          <Flag className="w-3 h-3" />
                          {action.user_has_flagged ? "Segnalata" : "Segnala"}
                        </Button>
                      </div>
                    )}

                    {action.flagged && (
                      <p className="text-[10px] text-destructive font-medium">⚠️ Azione invalidata — punti sottratti</p>
                    )}
                  </motion.div>
                ))
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Leave dialog */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lasciare il gruppo?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Perderai l'accesso alla classifica e al feed del gruppo. Le tue corone rimarranno.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setLeaveDialogOpen(false)}>Annulla</Button>
            <Button variant="destructive" onClick={handleLeave}>Lascia il gruppo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

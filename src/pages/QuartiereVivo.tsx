import { useState, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ThumbsUp, Clock, AlertTriangle, CheckCircle, Filter, X, Send, MapPin, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useUserLocation } from "@/hooks/useUserLocation";
import { reportTypeConfig, severityConfig } from "@/lib/mockData";
import { useCommunityReports, type Report } from "@/hooks/useUserData";
import { createDivIcon } from "@/components/LeafletMap";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const LeafletMap = lazy(() => import("@/components/LeafletMap"));

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

const statusConfig = {
  aperta: { label: "Aperta", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10" },
  in_corso: { label: "In corso", icon: Clock, color: "text-blue-500 bg-blue-500/10" },
  risolta: { label: "Risolta", icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
};

function createIcon(emoji: string) {
  return createDivIcon(`<div style="font-size:24px;text-align:center;line-height:1">${emoji}</div>`);
}

function ReportCard({ report, onVote }: { report: Report; onVote: (id: string) => void }) {
  const typeConf = reportTypeConfig[report.type as keyof typeof reportTypeConfig];
  const sevConf = severityConfig[report.severity as keyof typeof severityConfig];
  const statusConf = statusConfig[report.status as keyof typeof statusConfig];
  if (!typeConf || !sevConf || !statusConf) return null;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xl">{typeConf.icon}</span>
            <div>
              <p className="text-sm font-bold text-foreground">{report.title}</p>
              <p className="text-[10px] text-muted-foreground">{report.address}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${statusConf.color}`}>
            <statusConf.icon className="w-3 h-3" />
            {statusConf.label}
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{report.description}</p>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px]">{typeConf.label}</Badge>
          <Badge variant="outline" className="text-[10px]" style={{ borderColor: sevConf.color, color: sevConf.color }}>{sevConf.label}</Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">{new Date(report.created_at).toLocaleDateString("it-IT")}</span>
        </div>
        <div className="flex items-center justify-between pt-1">
          <button onClick={() => onVote(report.id)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span className="font-semibold">{report.votes}</span>
            <span>voti</span>
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewReportForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: any) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("discarica");
  const [severity, setSeverity] = useState<string>("media");

  const handleSubmit = () => {
    if (!title || !description) return;
    onSubmit({ title, description, type, severity });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={(e) => e.stopPropagation()} className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Nuova Segnalazione</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(reportTypeConfig).map(([key, conf]) => (
                  <button key={key} onClick={() => setType(key)} className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${type === key ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"}`}>
                    <span className="text-lg block mb-1">{conf.icon}</span>
                    {conf.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Titolo</label>
              <Input placeholder="Descrivi brevemente il problema..." value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Descrizione</label>
              <textarea placeholder="Dettaglia il problema..." value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Gravità</label>
              <div className="flex gap-2">
                {Object.entries(severityConfig).map(([key, conf]) => (
                  <button key={key} onClick={() => setSeverity(key)} className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${severity === key ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>
                    {conf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={!title || !description}>
            <Send className="w-4 h-4 mr-2" />Invia Segnalazione
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function QuartiereVivo() {
  const { location, loading: locLoading } = useUserLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { reports, loading: reportsLoading, createReport, voteReport } = useCommunityReports();
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filteredReports = filter ? reports.filter((r) => r.type === filter) : reports;

  const handleVote = async (id: string) => {
    if (!user) {
      toast({ title: "Accedi per votare", variant: "destructive" });
      return;
    }
    await voteReport(id);
  };

  const handleNewReport = async (data: { title: string; description: string; type: string; severity: string }) => {
    if (!user) {
      toast({ title: "Accedi per segnalare", variant: "destructive" });
      return;
    }
    await createReport({
      ...data,
      lat: location.latitude + (Math.random() - 0.5) * 0.01,
      lng: location.longitude + (Math.random() - 0.5) * 0.01,
      address: location.city || "Posizione attuale",
    });
    toast({ title: "Segnalazione inviata! 📍" });
  };

  const stats = {
    total: reports.length,
    open: reports.filter((r) => r.status === "aperta").length,
    inProgress: reports.filter((r) => r.status === "in_corso").length,
    resolved: reports.filter((r) => r.status === "risolta").length,
  };

  const center: [number, number] = [location.latitude, location.longitude];

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">📍 Quartiere Vivo</h1>
            <p className="text-muted-foreground mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {location.city || "La tua posizione"} — Segnala problemi ambientali
            </p>
          </div>
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />Nuova Segnalazione
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Totali", value: stats.total, color: "text-foreground" },
          { label: "Aperte", value: stats.open, color: "text-amber-500" },
          { label: "In corso", value: stats.inProgress, color: "text-blue-500" },
          { label: "Risolte", value: stats.resolved, color: "text-emerald-500" },
        ].map((s, i) => (
          <motion.div key={s.label} initial="hidden" animate="visible" variants={fadeUp} custom={i + 1}>
            <Card>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">{s.label}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Map */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <Card className="overflow-hidden">
          {locLoading ? (
            <div className="h-72 flex items-center justify-center bg-accent">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="h-72 relative z-0">
              <Suspense fallback={<div className="h-full flex items-center justify-center bg-accent"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>}>
                <LeafletMap
                  center={center}
                  zoom={14}
                  markers={filteredReports.map((r) => ({
                    id: r.id,
                    position: [r.lat, r.lng] as [number, number],
                    icon: createIcon(reportTypeConfig[r.type as keyof typeof reportTypeConfig]?.icon || "📍"),
                    popupContent: {
                      title: r.title,
                      address: r.address,
                      description: r.description,
                      votes: r.votes,
                    },
                  }))}
                />
              </Suspense>
            </div>
          )}
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button onClick={() => setFilter(null)} className={`text-xs px-3 py-1.5 rounded-full border transition-all ${!filter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
            Tutti
          </button>
          {Object.entries(reportTypeConfig).map(([key, conf]) => (
            <button key={key} onClick={() => setFilter(filter === key ? null : key)} className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${filter === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"}`}>
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Reports */}
      {reportsLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-primary animate-spin" /></div>
      ) : filteredReports.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredReports.map((report, i) => (
            <motion.div key={report.id} initial="hidden" animate="visible" variants={fadeUp} custom={i + 7}>
              <ReportCard report={report} onVote={handleVote} />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p>Nessuna segnalazione ancora. Sii il primo a segnalare! 📍</p>
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {showForm && <NewReportForm onClose={() => setShowForm(false)} onSubmit={handleNewReport} />}
      </AnimatePresence>
    </div>
  );
}

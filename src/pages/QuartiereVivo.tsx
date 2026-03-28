import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, ThumbsUp, Clock, AlertTriangle, CheckCircle, Filter, X, Send } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getCommunityReports, reportTypeConfig, severityConfig, type CommunityReport } from "@/lib/mockData";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08 } }),
};

const statusConfig = {
  aperta: { label: "Aperta", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10" },
  in_corso: { label: "In corso", icon: Clock, color: "text-blue-500 bg-blue-500/10" },
  risolta: { label: "Risolta", icon: CheckCircle, color: "text-emerald-500 bg-emerald-500/10" },
};

function ReportCard({ report, onVote }: { report: CommunityReport; onVote: (id: string) => void }) {
  const typeConf = reportTypeConfig[report.type];
  const sevConf = severityConfig[report.severity];
  const statusConf = statusConfig[report.status];

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
          <Badge
            variant="outline"
            className="text-[10px]"
            style={{ borderColor: sevConf.color, color: sevConf.color }}
          >
            {sevConf.label}
          </Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">{report.createdAt}</span>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => onVote(report.id)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="font-semibold">{report.votes}</span>
            <span>voti</span>
          </button>
          <button className="text-xs text-primary font-medium hover:underline">
            Dettagli →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

function NewReportForm({ onClose, onSubmit }: { onClose: () => void; onSubmit: (r: Partial<CommunityReport>) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CommunityReport["type"]>("discarica");
  const [severity, setSeverity] = useState<CommunityReport["severity"]>("media");

  const handleSubmit = () => {
    if (!title || !description) return;
    onSubmit({
      title,
      description,
      type,
      severity,
      status: "aperta",
      votes: 1,
      address: "Posizione attuale",
      createdAt: new Date().toISOString().split("T")[0],
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto"
      >
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-foreground">Nuova Segnalazione</h3>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Tipo</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(reportTypeConfig) as [CommunityReport["type"], typeof reportTypeConfig.discarica][]).map(([key, conf]) => (
                  <button
                    key={key}
                    onClick={() => setType(key)}
                    className={`p-3 rounded-xl border text-center text-xs font-medium transition-all ${
                      type === key ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    <span className="text-lg block mb-1">{conf.icon}</span>
                    {conf.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Titolo</label>
              <Input
                placeholder="Descrivi brevemente il problema..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Descrizione</label>
              <textarea
                placeholder="Dettaglia il problema, la posizione esatta e da quanto tempo persiste..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-background text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase mb-1.5 block">Gravità</label>
              <div className="flex gap-2">
                {(Object.entries(severityConfig) as [CommunityReport["severity"], typeof severityConfig.bassa][]).map(([key, conf]) => (
                  <button
                    key={key}
                    onClick={() => setSeverity(key)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${
                      severity === key ? "border-primary bg-primary/5 text-foreground" : "border-border text-muted-foreground"
                    }`}
                  >
                    {conf.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full" disabled={!title || !description}>
            <Send className="w-4 h-4 mr-2" />
            Invia Segnalazione
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function QuartiereVivo() {
  const [reports, setReports] = useState(getCommunityReports());
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string | null>(null);

  const filteredReports = filter ? reports.filter((r) => r.type === filter) : reports;

  const handleVote = (id: string) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, votes: r.votes + 1 } : r))
    );
  };

  const handleNewReport = (data: Partial<CommunityReport>) => {
    const newReport: CommunityReport = {
      id: `r${Date.now()}`,
      lat: 41.89 + Math.random() * 0.03,
      lng: 12.47 + Math.random() * 0.08,
      ...(data as CommunityReport),
    };
    setReports((prev) => [newReport, ...prev]);
  };

  const stats = {
    total: reports.length,
    open: reports.filter((r) => r.status === "aperta").length,
    inProgress: reports.filter((r) => r.status === "in_corso").length,
    resolved: reports.filter((r) => r.status === "risolta").length,
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">📍 Quartiere Vivo</h1>
            <p className="text-muted-foreground mt-1">Segnala problemi ambientali, migliora il tuo quartiere</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Nuova Segnalazione
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

      {/* Map placeholder */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={5}>
        <Card className="overflow-hidden">
          <div className="h-48 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent flex items-center justify-center relative">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23000\" fill-opacity=\"0.1\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')",
            }} />
            {/* Show report pins */}
            {filteredReports.map((r) => {
              const x = ((r.lng - 12.44) / 0.12) * 100;
              const y = ((41.92 - r.lat) / 0.07) * 100;
              const typeConf = reportTypeConfig[r.type];
              return (
                <div
                  key={r.id}
                  className="absolute text-lg cursor-pointer hover:scale-125 transition-transform"
                  style={{ left: `${Math.min(90, Math.max(5, x))}%`, top: `${Math.min(85, Math.max(5, y))}%` }}
                  title={r.title}
                >
                  {typeConf.icon}
                </div>
              );
            })}
            <div className="relative z-10 text-center">
              <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Mappa Roma</p>
              <p className="text-[10px] text-muted-foreground">{filteredReports.length} segnalazioni attive</p>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Filters */}
      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={6}>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <button
            onClick={() => setFilter(null)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
              !filter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            Tutti
          </button>
          {Object.entries(reportTypeConfig).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => setFilter(filter === key ? null : key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all flex items-center gap-1 ${
                filter === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {conf.icon} {conf.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Reports */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredReports.map((report, i) => (
          <motion.div key={report.id} initial="hidden" animate="visible" variants={fadeUp} custom={i + 7}>
            <ReportCard report={report} onVote={handleVote} />
          </motion.div>
        ))}
      </div>

      {/* New report form */}
      <AnimatePresence>
        {showForm && <NewReportForm onClose={() => setShowForm(false)} onSubmit={handleNewReport} />}
      </AnimatePresence>
    </div>
  );
}

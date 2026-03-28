import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Brain,
  Leaf,
  Moon,
  Settings,
  Sun,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-lg border shadow-sm ${className}`}>{children}</div>
);

const Button = ({
  children,
  variant = "default",
  size = "default",
  className = "",
  onClick = () => {},
  disabled = false,
}) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
  const variantClasses = {
    default: "bg-blue-600 text-white hover:bg-blue-700",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
    ghost: "text-gray-700 hover:bg-gray-100",
  };
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    default: "h-10 px-4",
    lg: "h-12 px-6 text-lg",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

const NotificationBanner = ({ title, message, type = "info" }) => {
  const types = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  return (
    <div className={`p-4 rounded-lg border ${types[type]}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        <div>
          <h4 className="font-semibold">{title}</h4>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

const KPIIcon = ({ icon }) => {
  if (icon === "wind") return <Wind className="h-5 w-5" />;
  if (icon === "thermometer") return <Thermometer className="h-5 w-5" />;
  if (icon === "leaf") return <Leaf className="h-5 w-5" />;
  return <Zap className="h-5 w-5" />;
};

const getKpiColorStyles = (color) => {
  if (color === "green") return "border-l-green-500 bg-green-50";
  if (color === "yellow") return "border-l-yellow-500 bg-yellow-50";
  if (color === "orange") return "border-l-orange-500 bg-orange-50";
  if (color === "red") return "border-l-red-500 bg-red-50";
  if (color === "blue") return "border-l-blue-500 bg-blue-50";
  if (color === "purple") return "border-l-purple-500 bg-purple-50";
  return "border-l-gray-400 bg-gray-50";
};

const SimpleKPICard = ({ title, value, subtitle, color, icon }) => {
  return (
    <Card className={`p-5 border-l-4 ${getKpiColorStyles(color)}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        </div>
        <div className="text-gray-500 mt-1">
          <KPIIcon icon={icon} />
        </div>
      </div>
    </Card>
  );
};

function ActionList({ actions, onApply, appliedIds }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Azioni di oggi</h3>
      {actions.map((action) => {
        const isDone = appliedIds.includes(action.id);
        return (
          <div
            key={action.id}
            className={`flex items-start gap-3 p-3 rounded-lg border ${
              isDone ? "opacity-50 bg-muted" : "bg-card"
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{action.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              <div className="flex gap-2 mt-1">
                <span className="text-xs text-green-600 font-medium">-{action.co2_grams}g CO2</span>
                <span className="text-xs text-muted-foreground">· {action.difficulty}</span>
              </div>
            </div>
            <button
              onClick={() => !isDone && onApply(action.id, action.co2_grams)}
              disabled={isDone}
              className={`text-xs px-3 py-1.5 rounded-md font-medium shrink-0 ${
                isDone
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-green-600 text-white hover:bg-green-700"
              }`}
            >
              {isDone ? "✓ Fatto" : "Ho fatto questo"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

const ActionImpactChart = ({ actions, appliedIds }) => {
  const chartData = actions
    .filter((a) => appliedIds.includes(a.id))
    .map((a) => ({ name: a.title, value: a.co2_grams }));

  if (chartData.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-2">CO2 risparmiata per azione</h3>
        <p className="text-sm text-gray-600">Completa la tua prima azione per vedere l'impatto!</p>
      </Card>
    );
  }

  const maxValue = Math.max(...chartData.map((item) => item.value));

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">CO2 risparmiata per azione</h3>
      <div className="space-y-3">
        {chartData.map((item) => (
          <div key={item.name}>
            <div className="flex items-center justify-between text-sm mb-1 gap-4">
              <span className="truncate">{item.name}</span>
              <span className="font-semibold text-green-700">{item.value}g CO2</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-2 rounded-full bg-green-500"
                style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [envData, setEnvData] = useState(null);
  const [userData, setUserData] = useState({
    co2_saved_kg: 0,
    streak_days: 0,
    actions_today: 0,
  });
  const [actions, setActions] = useState([]);
  const [appliedIds, setAppliedIds] = useState([]);
  const [reportOpen, setReportOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [theme]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      try {
        const res = await fetch("http://localhost:8000/data");
        const data = await res.json();
        setEnvData(data.env || null);
        setUserData({
          co2_saved_kg: data.user_co2_saved_kg || 0,
          streak_days: data.user_streak_days || 0,
          actions_today: data.user_actions_today || 0,
        });
      } catch (error) {
        console.error("Error loading data:", error);
        setEnvData(null);
      }

      try {
        const sugRes = await fetch("http://localhost:8000/suggestions/all");
        const sugData = await sugRes.json();
        setActions(sugData.actions || []);
      } catch (error) {
        console.error("Error loading actions:", error);
        setActions([]);
      }

      setLoading(false);
    };

    loadData();
  }, []);

  const handleApplyAction = async (actionId, co2Grams) => {
    if (appliedIds.includes(actionId)) return;

    try {
      const response = await fetch("http://localhost:8000/suggestions/problem/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ booking_id: actionId }),
      });

      const result = await response.json();

      if (result.status === "applied") {
        setAppliedIds((prev) => [...prev, actionId]);
        setUserData((prev) => ({
          ...prev,
          co2_saved_kg: result.total_co2_saved_kg ?? prev.co2_saved_kg + co2Grams / 1000,
          actions_today: prev.actions_today + 1,
        }));
      }
    } catch (error) {
      console.error("Error applying action:", error);
    }
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const kpiData = useMemo(
    () => [
      {
        title: "Qualita dell'aria",
        value: envData?.aqi_level ?? "-",
        subtitle: `PM2.5: ${envData?.aqi_pm25 ?? "-"} µg/m³`,
        color: envData?.aqi_color ?? "gray",
        icon: "wind",
      },
      {
        title: "Temperatura esterna",
        value: `${envData?.temperature ?? "-"}°C`,
        subtitle: `Umidita ${envData?.humidity ?? "-"}%`,
        color: "blue",
        icon: "thermometer",
      },
      {
        title: "CO2 risparmiata oggi",
        value: `${(userData?.co2_saved_kg ?? 0).toFixed(2)} kg`,
        subtitle: "con le tue azioni",
        color: "green",
        icon: "leaf",
      },
      {
        title: "Streak azioni verdi",
        value: `${userData?.streak_days ?? 0} giorni`,
        subtitle: `${userData?.actions_today ?? 0} azioni oggi`,
        color: "purple",
        icon: "zap",
      },
    ],
    [envData, userData]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Caricamento EcoSignal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Leaf className="h-6 w-6 text-green-700" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">EcoSignal</h1>
                <p className="text-sm text-gray-600">Il tuo quartiere, le tue azioni</p>
                <p className="text-xs text-gray-500">
                  {currentTime.toLocaleDateString("it-IT", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                  {" · "}
                  {currentTime.toLocaleTimeString("it-IT", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setReportOpen(true)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Report ESG
              </Button>
              <Button variant="outline" size="sm" onClick={toggleTheme}>
                {theme === "dark" ? (
                  <>
                    <Sun className="h-4 w-4 mr-2" />
                    Chiaro
                  </>
                ) : (
                  <>
                    <Moon className="h-4 w-4 mr-2" />
                    Scuro
                  </>
                )}
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Impostazioni
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 space-y-3">
          <NotificationBanner
            title="Suggerimenti AI aggiornati"
            message={`Fonte dati: ${envData?.source ?? "fallback"}. Agisci oggi per migliorare l'impatto del quartiere.`}
            type="success"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {kpiData.map((item) => (
            <SimpleKPICard key={item.title} {...item} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ActionImpactChart actions={actions} appliedIds={appliedIds} />
            <Card className="p-6">
              <ActionList actions={actions} onApply={handleApplyAction} appliedIds={appliedIds} />
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Il tuo impatto oggi</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Azioni completate</span>
                  <span className="font-semibold">{appliedIds.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">CO2 risparmiata</span>
                  <span className="font-semibold text-green-700">
                    {(userData.co2_saved_kg ?? 0).toFixed(2)} kg
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Streak corrente</span>
                  <span className="font-semibold text-blue-700">{userData.streak_days ?? 0} giorni</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 bg-green-50 border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">Obiettivo giornaliero</h3>
              <p className="text-sm text-green-700 mb-3">
                Completa almeno 2 azioni per superare 0.50 kg di CO2 risparmiata oggi.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full border-green-300 text-green-700 hover:bg-green-100"
                onClick={() => setReportOpen(true)}
              >
                Vedi report completo
              </Button>
            </Card>
          </div>
        </div>
      </main>

      {reportOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Report ESG</h3>
            <p className="text-gray-600 mb-4">
              Report dettagliato sull'impatto ambientale e i risparmi energetici generati dai settaggi AI.
            </p>
            <Button onClick={() => setReportOpen(false)} disabled={false}>
              Chiudi
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

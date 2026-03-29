import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Leaf, Wind, Trophy, Footprints, User, Users,
  Menu, X, ChevronRight, LogOut, Sun, Moon, BookOpen, ShoppingBag, Bot
} from "lucide-react";
import useTheme from "@/hooks/use-theme";
import { NotificationCenter } from "@/components/NotificationCenter";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard, desc: "Panoramica" },
  { path: "/carbon-mirror", label: "Carbon Mirror", icon: Footprints, desc: "La tua impronta" },
  { path: "/air-alert", label: "AirAlert", icon: Wind, desc: "Qualità aria" },
  { path: "/impact-streak", label: "Classifica", icon: Trophy, desc: "Premi settimanali" },
  { path: "/action-history", label: "Diario Azioni", icon: BookOpen, desc: "Storico giornaliero" },
  { path: "/group", label: "Il Mio Gruppo", icon: Users, desc: "Sfida i tuoi amici" },
  { path: "/eco-shop", label: "EcoShop", icon: ShoppingBag, desc: "Brand eco in sconto" },
  { path: "/eco-coach", label: "EcoCoach", icon: Bot, desc: "Assistente AI" },
  { path: "/profile", label: "Profilo Eco", icon: User, desc: "Il tuo profilo" },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, toggleTheme] = useTheme();
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-72 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-glow">
              <Leaf className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground tracking-tight">GreenClick</h1>
              <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">Dai dati al gesto</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{item.label}</div>
                  <div className={`text-[10px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
                    {item.desc}
                  </div>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
            title={theme === "dark" ? "Passa a modalità chiara" : "Passa a modalità scura"}
          >
            {theme === "dark" ? <Sun className="w-5 h-5 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
            <span>{theme === "dark" ? "Modalità chiara" : "Modalità scura"}</span>
          </button>
          {user && (
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.user_metadata?.full_name || user.email}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <button onClick={signOut} className="p-2 rounded-lg hover:bg-accent transition-colors shrink-0" title="Esci">
                <LogOut className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Leaf className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">GreenClick</span>
          </div>
          <NotificationCenter />
        </header>

        {/* Desktop notification bell */}
        <div className="hidden lg:flex sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-6 py-2.5 justify-end">
          <NotificationCenter />
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

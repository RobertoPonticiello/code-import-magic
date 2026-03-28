import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Check, CheckCheck, X, Flag, UserPlus, Leaf, AlertTriangle, Crown } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";

const typeIcons: Record<string, typeof Bell> = {
  action_completed: Leaf,
  action_flagged: Flag,
  action_invalidated: AlertTriangle,
  member_joined: UserPlus,
  weekly_winner: Crown,
};

const typeColors: Record<string, string> = {
  action_completed: "text-primary",
  action_flagged: "text-amber-500",
  action_invalidated: "text-destructive",
  member_joined: "text-blue-500",
  weekly_winner: "text-amber-500",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ora";
  if (mins < 60) return `${mins}m fa`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h fa`;
  const days = Math.floor(hours / 24);
  return `${days}g fa`;
}

export function NotificationCenter() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-accent transition-colors"
        title="Notifiche"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[70vh] bg-card border border-border rounded-xl shadow-xl z-50 flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  Notifiche
                  {unreadCount > 0 && (
                    <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {unreadCount} nuov{unreadCount === 1 ? "a" : "e"}
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
                      title="Segna tutte come lette"
                    >
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notification list */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nessuna notifica</p>
                    <p className="text-xs text-muted-foreground/70">Le notifiche del tuo gruppo appariranno qui</p>
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const IconComp = typeIcons[notif.type] || Bell;
                    const colorClass = typeColors[notif.type] || "text-muted-foreground";

                    return (
                      <div
                        key={notif.id}
                        onClick={() => { if (!notif.read) markAsRead(notif.id); }}
                        className={`flex items-start gap-3 px-4 py-3 border-b border-border/50 transition-colors cursor-pointer hover:bg-accent/50 ${
                          !notif.read ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          !notif.read ? "bg-primary/10" : "bg-muted"
                        }`}>
                          <span className="text-lg">{notif.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-xs font-semibold ${!notif.read ? "text-foreground" : "text-muted-foreground"}`}>
                              {notif.title}
                            </p>
                            {!notif.read && (
                              <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{notif.body}</p>
                          <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.created_at)}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

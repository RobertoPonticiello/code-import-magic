import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  /** Map of "YYYY-MM-DD" → action count */
  data: Record<string, number>;
}

const MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
const DAYS = ["Lun", "", "Mer", "", "Ven", "", "Dom"];

function getColor(count: number): string {
  if (count === 0) return "bg-muted";
  if (count <= 1) return "bg-emerald-200 dark:bg-emerald-900";
  if (count <= 3) return "bg-emerald-400 dark:bg-emerald-700";
  if (count <= 5) return "bg-emerald-500 dark:bg-emerald-500";
  return "bg-emerald-700 dark:bg-emerald-400";
}

export function ContributionHeatmap({ data }: Props) {
  const { weeks, monthLabels, totalActions } = useMemo(() => {
    const today = new Date();
    const end = new Date(today);
    end.setHours(0, 0, 0, 0);

    // Go back ~52 weeks (364 days)
    const start = new Date(end);
    start.setDate(start.getDate() - 363);
    // Align start to Monday
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);

    const weeks: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];
    const d = new Date(start);
    let total = 0;

    while (d <= end) {
      const key = d.toISOString().split("T")[0];
      const count = data[key] || 0;
      total += count;
      currentWeek.push({ date: new Date(d), count });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      d.setDate(d.getDate() + 1);
    }
    if (currentWeek.length) weeks.push(currentWeek);

    // Month labels
    const labels: { label: string; col: number }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, i) => {
      const m = week[0].date.getMonth();
      if (m !== lastMonth) {
        labels.push({ label: MONTHS[m], col: i });
        lastMonth = m;
      }
    });

    return { weeks, monthLabels: labels, totalActions: total };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">
          {totalActions} azioni nell'ultimo anno
        </h3>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[10px] text-muted-foreground"
                style={{ position: "relative", left: `${m.col * 14}px`, width: 0, whiteSpace: "nowrap" }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1 justify-start">
              {DAYS.map((d, i) => (
                <div key={i} className="h-[12px] flex items-center">
                  <span className="text-[9px] text-muted-foreground w-6 text-right">{d}</span>
                </div>
              ))}
            </div>

            {/* Grid */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-0.5">
                {week.map((day, di) => (
                  <Tooltip key={di}>
                    <TooltipTrigger asChild>
                      <div
                        className={`w-[12px] h-[12px] rounded-[2px] ${getColor(day.count)} transition-colors cursor-pointer hover:ring-1 hover:ring-foreground/30`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <p className="font-medium">
                        {day.count} {day.count === 1 ? "azione" : "azioni"}
                      </p>
                      <p className="text-muted-foreground">
                        {day.date.toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-1 mt-2">
            <span className="text-[10px] text-muted-foreground mr-1">Meno</span>
            {[0, 1, 3, 5, 6].map((c) => (
              <div key={c} className={`w-[12px] h-[12px] rounded-[2px] ${getColor(c)}`} />
            ))}
            <span className="text-[10px] text-muted-foreground ml-1">Più</span>
          </div>
        </div>
      </div>
    </div>
  );
}

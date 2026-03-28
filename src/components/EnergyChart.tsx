import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';

interface EnergyData {
  time: string;
  consumption: number;
  optimized: number;
  savings: number;
}

interface EnergyChartProps {
  data: EnergyData[];
  title: string;
  className?: string;
}

export const EnergyChart = ({ data, title, className = "" }: EnergyChartProps) => {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.value}kW
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={`p-6 bg-gradient-card ${className}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground">Confronto consumo attuale vs ottimizzato</p>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="consumptionGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="optimizedGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip content={<CustomTooltip />} />
              
              <Area
                type="monotone"
                dataKey="consumption"
                stroke="hsl(var(--destructive))"
                fillOpacity={1}
                fill="url(#consumptionGradient)"
                name="Consumo Attuale"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="optimized"
                stroke="hsl(var(--primary))"
                fillOpacity={1}
                fill="url(#optimizedGradient)"
                name="Consumo Ottimizzato"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-destructive rounded"></div>
            <span>Consumo Attuale</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded"></div>
            <span>Consumo Ottimizzato</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
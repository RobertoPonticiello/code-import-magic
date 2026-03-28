import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  unit?: string;
  trend?: "up" | "down";
  trendValue?: string;
  icon: React.ReactNode;
  variant?: "energy" | "comfort" | "co2" | "default";
  className?: string;
}

export const KPICard = ({ 
  title, 
  value, 
  unit, 
  trend, 
  trendValue, 
  icon, 
  variant = "default",
  className = ""
}: KPICardProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "energy":
        return "bg-gradient-card border-primary/20 hover:shadow-glow";
      case "comfort":
        return "bg-gradient-card border-secondary/20 hover:border-secondary/30";
      case "co2":
        return "bg-gradient-card border-co2-reduction/20 hover:border-co2-reduction/30";
      default:
        return "bg-card border-border hover:shadow-md";
    }
  };

  const getTrendColor = () => {
    if (variant === "energy" || variant === "co2") {
      return trend === "down" ? "text-primary" : "text-destructive";
    }
    return trend === "up" ? "text-primary" : "text-destructive";
  };

  return (
    <Card className={`p-6 transition-all duration-300 ${getVariantStyles()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline space-x-1">
            <span className="text-3xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-lg font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center space-x-1 ${getTrendColor()}`}>
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-medium text-sm">{trendValue}</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg ${
          variant === "energy" ? "bg-primary/10 text-primary" :
          variant === "comfort" ? "bg-secondary/10 text-secondary" :
          variant === "co2" ? "bg-co2-reduction/10 text-co2-reduction" :
          "bg-muted text-muted-foreground"
        }`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};
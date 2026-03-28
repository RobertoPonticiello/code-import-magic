import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Bell, TrendingDown, Zap } from "lucide-react";
import { useState } from "react";

interface NotificationBannerProps {
  title: string;
  message: string;
  type?: "suggestion" | "alert" | "success";
  actionText?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const NotificationBanner = ({
  title,
  message,
  type = "suggestion",
  actionText,
  onAction,
  onDismiss,
  className = ""
}: NotificationBannerProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  const getTypeStyles = () => {
    switch (type) {
      case "suggestion":
        return "bg-primary/5 border-primary/20 text-primary";
      case "alert":
        return "bg-energy-warning/5 border-energy-warning/20 text-energy-warning";
      case "success":
        return "bg-co2-reduction/5 border-co2-reduction/20 text-co2-reduction";
      default:
        return "bg-muted/50 border-border text-foreground";
    }
  };

  const getIcon = () => {
    switch (type) {
      case "suggestion":
        return <Bell className="h-5 w-5" />;
      case "alert":
        return <Zap className="h-5 w-5" />;
      case "success":
        return <TrendingDown className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={`p-4 animate-fade-in ${getTypeStyles()} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <div className="mt-0.5">
            {getIcon()}
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="font-medium text-sm">{title}</h4>
            <p className="text-sm opacity-90">{message}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {actionText && onAction && (
            <Button
              size="sm"
              variant="outline"
              onClick={onAction}
              className="text-xs px-3 py-1 h-auto border-current hover:bg-current/10"
            >
              {actionText}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDismiss}
            className="p-1 h-auto hover:bg-current/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
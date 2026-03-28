import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Users, Clock, Thermometer, Lightbulb, Euro, Leaf } from "lucide-react";

interface SmartSuggestionProps {
  roomName: string;
  capacity: number;
  attendees: number;
  meetingType: "team" | "manager" | "investor";
  timeSlot: string;
  energySaving: string;
  comfortScore: number;
  temperature: string;
  lighting: string;
  co2Reduction: string;
  onAccept?: () => void;
  onDecline?: () => void;
  className?: string;
}

export const SmartSuggestion = ({
  roomName,
  capacity,
  attendees,
  meetingType,
  timeSlot,
  energySaving,
  comfortScore,
  temperature,
  lighting,
  co2Reduction,
  onAccept,
  onDecline,
  className = ""
}: SmartSuggestionProps) => {
  const getMeetingTypeColor = () => {
    switch (meetingType) {
      case "investor":
        return "bg-secondary text-secondary-foreground";
      case "manager":
        return "bg-primary text-primary-foreground";
      case "team":
        return "bg-muted text-muted-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getComfortColor = () => {
    if (comfortScore >= 85) return "text-primary";
    if (comfortScore >= 70) return "text-secondary";
    return "text-energy-warning";
  };

  return (
    <Card className={`p-6 bg-gradient-card border-primary/20 animate-slide-in ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              {roomName}
            </h3>
            <p className="text-sm text-muted-foreground">Consiglio IA per la prossima riunione</p>
          </div>
          <Badge className={getMeetingTypeColor()}>
            {meetingType === "investor" ? "Investitori" : 
             meetingType === "manager" ? "Manager" : "Team"}
          </Badge>
        </div>

        {/* Meeting Details */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{attendees}/{capacity} persone</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{timeSlot}</span>
          </div>
        </div>

        {/* Environmental Settings */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-3">
          <h4 className="font-medium text-sm text-foreground">Settaggi Ottimali</h4>
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-secondary" />
                <span className="text-sm">Temperatura</span>
              </div>
              <span className="font-medium text-sm">{temperature}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-energy-warning" />
                <span className="text-sm">Illuminazione</span>
              </div>
              <span className="font-medium text-sm">{lighting}</span>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary">
              <Euro className="h-4 w-4" />
              <span className="font-bold text-sm">{energySaving}</span>
            </div>
            <p className="text-xs text-muted-foreground">Risparmio</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <span className={`font-bold text-sm ${getComfortColor()}`}>
                {comfortScore}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Comfort</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-co2-reduction">
              <Leaf className="h-4 w-4" />
              <span className="font-bold text-sm">{co2Reduction}</span>
            </div>
            <p className="text-xs text-muted-foreground">CO₂ evitata</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button 
            onClick={onAccept}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Applica Impostazioni
          </Button>
          <Button 
            variant="outline" 
            onClick={onDecline}
            className="px-6"
          >
            Rifiuta
          </Button>
        </div>
      </div>
    </Card>
  );
};
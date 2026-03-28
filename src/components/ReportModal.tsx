import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "./ui/dialog";
import { Button } from "./ui/button";


interface ReportModalProps {
  open: boolean;
  onClose: () => void;
}

export const ReportModal: React.FC<ReportModalProps> = ({ open, onClose }) => {
// Rimosso doppione funzione

  const [period, setPeriod] = useState<'giornaliero' | 'settimanale' | 'mensile'>('mensile');
  if (!open) return null;
  const handleDownload = () => {
    // Simula download report
    alert(`Download report ${period}`);
  };
  return createPortal(
    <Dialog open={open} onOpenChange={onClose}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="p-8 max-w-lg mx-auto bg-background rounded-lg shadow-lg relative">
          <h2 className="text-xl font-bold mb-4">Report ESG</h2>
          <p className="mb-4 text-muted-foreground">Scarica il report dettagliato delle performance ESG per il periodo selezionato.</p>
          <div className="mb-4 flex gap-2">
            <Button variant={period === 'giornaliero' ? 'default' : 'outline'} onClick={() => setPeriod('giornaliero')}>Giornaliero</Button>
            <Button variant={period === 'settimanale' ? 'default' : 'outline'} onClick={() => setPeriod('settimanale')}>Settimanale</Button>
            <Button variant={period === 'mensile' ? 'default' : 'outline'} onClick={() => setPeriod('mensile')}>Mensile</Button>
          </div>
          <Button variant="default" className="w-full mb-2" onClick={handleDownload}>Scarica PDF</Button>
          <Button variant="outline" className="w-full" onClick={onClose}>Chiudi</Button>
        </div>
      </div>
    </Dialog>,
    document.body
  );
};

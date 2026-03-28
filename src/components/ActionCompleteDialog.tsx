import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Upload, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { EcoAction } from "@/lib/mockData";

interface Props {
  action: EcoAction | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (action: EcoAction, extra: { note: string; rating: number; imageUrl: string | null }) => void;
}

export function ActionCompleteDialog({ action, open, onClose, onConfirm }: Props) {
  const { user } = useAuth();
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setNote("");
    setRating(0);
    setHoverRating(0);
    setImageFile(null);
    setImagePreview(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleConfirm = async () => {
    if (!action || !user) return;
    setUploading(true);
    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop() || "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("action-images").upload(path, imageFile);
      if (!error) {
        const { data: urlData } = supabase.storage.from("action-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    onConfirm(action, { note, rating: rating || 0, imageUrl });
    setUploading(false);
    reset();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  if (!action) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">{action.icon}</span>
            {action.title}
          </DialogTitle>
          <DialogDescription>Racconta com'è andata! (opzionale)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Rating */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Come è andata?</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setRating(v)}
                  onMouseEnter={() => setHoverRating(v)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      v <= (hoverRating || rating)
                        ? "text-amber-400 fill-amber-400"
                        : "text-muted-foreground/30"
                    }`}
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {rating <= 2 ? "Faticosa, ma ce l'hai fatta! 💪" : rating <= 4 ? "Bene così! 🌿" : "Fantastico! 🌟"}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Note</label>
            <Textarea
              placeholder="Es. 'La doccia di 5 minuti è stata dura ma ce l'ho fatta!'"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Image */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Foto (opzionale)</label>
            {imagePreview ? (
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center gap-2 hover:border-primary/50 transition-colors"
              >
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Carica una foto</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Annulla
            </Button>
            <Button onClick={handleConfirm} disabled={uploading} className="flex-1 gap-2">
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Completa azione
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

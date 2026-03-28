

# Piano: Azioni rigenerabili con feedback, toggle completamento, e Profilo Sostenibilita

## Cosa faremo

### 1. Feedback + rigenerazione azioni (Dashboard)
- Aggiungere un box di testo sotto la lista azioni dove l'utente scrive feedback (es. "non faccio la doccia oggi")
- Pulsante "Rigenera azioni" che chiama una **nuova edge function** `regenerate-actions` con:
  - Le azioni attuali
  - Il feedback dell'utente
  - Il profilo utente (citta, abitudini note)
- L'AI genera nuove azioni personalizzate con **CO2 verificati** (fonti ISPRA/EEA nel prompt)
- Le nuove azioni sostituiscono quelle correnti nella Dashboard

### 2. Toggle completamento (undo)
- Il click su un'azione gia completata la **rimuove** da `completedIds` e sottrae i grammi CO2
- L'icona CheckCircle2 diventa cliccabile anche quando `isDone = true`

### 3. CO2 verificati
- Nel prompt dell'edge function, istruire l'AI a restituire azioni con stime CO2 basate su fonti scientifiche (ISPRA, EEA, ENEA)
- L'AI restituisce un JSON strutturato con le azioni (tool calling per output strutturato)
- Le azioni statiche in `mockData.ts` restano come fallback ma con fonti citate nei commenti

### 4. Pagina Profilo Sostenibilita
- Nuova route `/profile` con pagina `src/pages/Profile.tsx`
- Mostra un **profilo eco** generato dall'AI che si aggiorna automaticamente
- Nuova edge function `eco-profile` che riceve:
  - Azioni completate oggi e storiche
  - Risultati Carbon Mirror (se presenti)
  - Segnalazioni fatte
  - Feedback inseriti
- L'AI restituisce in streaming: analisi del profilo, punti di forza, aree di miglioramento, "eco-persona" (es. "Il Pendolare Consapevole")
- Aggiungere link nel sidebar di navigazione

## Dettagli tecnici

### Edge function `regenerate-actions`
- Input: `{ currentActions, feedback, userCity }`
- Usa tool calling per output strutturato (array di azioni con id, title, description, co2_grams, difficulty, category, icon)
- Modello: `google/gemini-3-flash-preview`
- Il prompt impone fonti ISPRA/EEA per le stime CO2

### Edge function `eco-profile`
- Input: `{ completedActions, carbonProfile, feedback, reports }`
- Streaming markdown con analisi personalizzata
- Modello: `google/gemini-3-flash-preview`

### File da modificare/creare
- `src/pages/Dashboard.tsx` — feedback box, rigenera, toggle undo
- `supabase/functions/regenerate-actions/index.ts` — nuova edge function
- `supabase/functions/eco-profile/index.ts` — nuova edge function
- `src/pages/Profile.tsx` — nuova pagina profilo
- `src/components/layout/AppLayout.tsx` — aggiungere link profilo nel sidebar
- `src/App.tsx` — aggiungere route `/profile`


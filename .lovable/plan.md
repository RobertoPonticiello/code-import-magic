

# Piano: Sistema Sociale con Gruppi e Competizione

## Panoramica
Aggiungere un sistema di gruppi (max 5 amici) con classifica settimanale, visibilità delle azioni completate dagli altri, sistema di segnalazione ("flag") per barare, e corone accumulate per il vincitore settimanale.

---

## 1. Nuove tabelle database

### `groups`
- `id` uuid PK
- `name` text (nome del gruppo)
- `created_by` uuid (chi lo ha creato)
- `created_at` timestamp
- `invite_code` text unique (codice 6 caratteri per invitare amici)

### `group_members`
- `id` uuid PK
- `group_id` uuid FK → groups
- `user_id` uuid
- `joined_at` timestamp
- `crowns` integer default 0 (corone accumulate)
- unique(group_id, user_id)

### `action_flags`
- `id` uuid PK
- `action_id` uuid FK → completed_actions
- `flagged_by` uuid (chi segnala)
- `group_id` uuid FK → groups
- `created_at` timestamp
- unique(action_id, flagged_by)

### `weekly_winners`
- `id` uuid PK
- `group_id` uuid FK → groups
- `user_id` uuid (vincitore)
- `week_start` date
- `total_points` integer
- unique(group_id, week_start)

**RLS**: ogni membro può leggere i dati del proprio gruppo. Insert/delete limitati al proprio user_id. Limite di 5 membri per gruppo gestito via trigger.

---

## 2. Logica backend (trigger + funzioni)

- **Trigger su `group_members` INSERT**: controlla che il gruppo non superi 5 membri, altrimenti blocca.
- **Funzione `check_flags_and_penalize()`**: quando un'azione riceve 2+ flag dallo stesso gruppo, viene marcata come "falsata" → sottrae XP e CO₂ dalle stats dell'utente.
- **Edge function `resolve-weekly-winner`** (o funzione DB schedulata): ogni lunedì calcola chi ha più punti nella settimana, assegna la corona incrementando `crowns` in `group_members`, e salva in `weekly_winners`.

---

## 3. Nuova pagina: "Il Mio Gruppo" (`/group`)

### Se l'utente non ha un gruppo:
- Pulsante "Crea gruppo" (inserisce nome, genera invite_code)
- Pulsante "Unisciti" (inserisci codice invito)

### Se l'utente ha un gruppo:
- **Header gruppo**: nome, codice invito (copiabile), numero membri
- **Classifica settimanale**: ranking dei membri per punti della settimana corrente (basato su CO₂ delle azioni completate nella settimana)
- **Corone accumulate**: ogni membro mostra 👑 × N
- **Feed azioni del gruppo**: lista delle azioni completate da tutti i membri con:
  - nome utente, icona, titolo azione, nota, rating, immagine
  - pulsante "🚩 Segnala" per flaggare l'azione
  - indicatore se l'azione è già stata segnalata / invalidata
- **Azioni invalidate**: badge "Falsata" + punti sottratti visibili

---

## 4. Modifiche ai file esistenti

- **`AppLayout.tsx`**: aggiungere voce nav "Il Mio Gruppo" con icona `Users`
- **`App.tsx`**: aggiungere route `/group`
- **`useUserData.ts`**: aggiungere hooks:
  - `useGroup()` — fetch gruppo dell'utente, membri, corone
  - `useGroupActions()` — fetch azioni settimanali dei membri del gruppo
  - `useGroupLeaderboard()` — classifica settimanale del gruppo
- **`ImpactStreak.tsx`**: nella classifica globale, mostrare anche le corone accumulate

---

## 5. Flusso segnalazione

1. Utente A vede l'azione di Utente B nel feed gruppo
2. Clicca "🚩 Segnala" → insert in `action_flags`
3. Se `count(flags) >= 2` per quell'azione nello stesso gruppo → trigger:
   - L'azione viene marcata (nuovo campo `flagged boolean default false` su `completed_actions`)
   - XP e CO₂ sottratti da `user_stats` dell'autore
4. L'azione appare con badge "Falsata" nel feed

---

## 6. Flusso corona settimanale

- Ogni lunedì (via pg_cron o edge function schedulata), per ogni gruppo:
  - Somma i `co2_grams` delle azioni non-flaggate completate nella settimana (lun-dom)
  - Il membro con il punteggio più alto riceve +1 corona
  - Record salvato in `weekly_winners`
- Le corone sono visibili nel profilo gruppo e nella classifica

---

## File coinvolti

| File | Azione |
|------|--------|
| Migration SQL | Crea tabelle, trigger, RLS, campo `flagged` |
| `src/pages/Group.tsx` | Nuova pagina (creazione, join, classifica, feed, segnalazioni) |
| `src/hooks/useUserData.ts` | Nuovi hooks per gruppo |
| `src/App.tsx` | Nuova route |
| `src/components/layout/AppLayout.tsx` | Nuova voce nav |
| `src/pages/ImpactStreak.tsx` | Mostrare corone |


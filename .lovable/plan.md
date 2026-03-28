

# Piano di miglioramento EcoSignal

## Analisi dei problemi attuali

### 1. Mappa di Quartiere Vivo
La mappa e' un placeholder con pin posizionati su un background SVG. Nessuna mappa reale.

**Soluzione**: Integrare **Leaflet** (libreria open-source, gratuita, no API key) con tiles OpenStreetMap. Aggiungere geolocalizzazione browser (`navigator.geolocation`) per centrare sulla posizione dell'utente, con fallback a selezione manuale tramite ricerca indirizzo.

### 2. Autenticazione utente
Attualmente non esiste nessun sistema di auth.

**Soluzione**: Attivare **Lovable Cloud** (Supabase integrato) con autenticazione Google + Email/Password. Creare una tabella `profiles` per dati utente e collegare tutte le feature (azioni completate, streak, segnalazioni, profilo carbonio) all'utente.

### 3. Dati AirAlert - Stato attuale
- **Temperatura, umidita, vento, precipitazioni**: DATI REALI da Open-Meteo (funzionano)
- **PM2.5, PM10**: L'API Open-Meteo restituisce **tutti null** (il modello forecast non include dati di qualita dell'aria per Roma)
- **O3, NO2**: Generati con `Math.random()` - completamente finti
- **Previsione 24h**: Generata con `Math.sin() + Math.random()` - finta

**Cosa possiamo fare con API gratuite**:
- **Open-Meteo Air Quality API** (`/v1/air-quality`): endpoint separato dal forecast che fornisce PM2.5, PM10, O3, NO2, European AQI per qualsiasi posizione. Gratuito, no API key. Questo risolve tutto.
- L'errore attuale e' che stiamo usando l'endpoint `/v1/forecast` chiedendo `pm10,pm2_5` nell'hourly, ma queste variabili non sono disponibili li. Bisogna usare `https://air-quality-api.open-meteo.com/v1/air-quality`.

### 4. Carbon Mirror - Calcolo e AI
Il calcolo attuale usa valori hardcoded per ogni opzione (es. "Auto benzina" = 4.2 kg CO2/sett). I consigli sono statici basati su soglie (`if transport > 3`).

**Soluzione**:
- I fattori di emissione sono gia ragionevolmente basati su fonti scientifiche (ISPRA, EEA). Aggiungere citazioni delle fonti e rendere i calcoli trasparenti.
- Integrare **Lovable AI** per generare consigli personalizzati basati sulle risposte specifiche dell'utente. L'AI ricevera il profilo completo e dara suggerimenti contestuali, confronti e un piano d'azione.
- Salvare il profilo carbonio nel database per tracciare i progressi nel tempo.

---

## Piano di implementazione

### Step 1: Attivare Lovable Cloud e Auth
- Abilitare Lovable Cloud (Supabase)
- Configurare auth Google + Email
- Creare tabella `profiles` con trigger auto-creazione
- Aggiungere pagina Login/Signup
- Proteggere le route con AuthProvider

### Step 2: Dati reali AirAlert
- Sostituire la chiamata API con `https://air-quality-api.open-meteo.com/v1/air-quality` per PM2.5, PM10, O3, NO2, European AQI
- Mantenere `/v1/forecast` solo per temperatura, umidita, vento
- Usare dati reali anche per la previsione 24h (l'API air-quality fornisce dati hourly)
- Adattare alla posizione dell'utente (non piu hardcoded Roma)

### Step 3: Mappa reale Quartiere Vivo
- Aggiungere dipendenza `leaflet` + `react-leaflet`
- Sostituire il placeholder con mappa interattiva OpenStreetMap
- Geolocalizzazione utente con `navigator.geolocation`
- Possibilita di cercare/selezionare un indirizzo
- Pin interattivi per le segnalazioni

### Step 4: Carbon Mirror con AI
- Aggiungere citazioni fonti ai fattori di emissione
- Creare edge function che chiama Lovable AI per generare consigli personalizzati
- L'AI riceve: risposte del questionario, profilo carbonio calcolato, confronto con medie
- L'AI restituisce: consigli specifici, piano settimanale, alternative concrete
- Salvare profilo e storico nel database

### Step 5: Persistenza dati utente
- Salvare azioni completate, streak, segnalazioni nel database
- Collegare tutto al profilo utente autenticato

---

## Dettagli tecnici

**API Air Quality** (gratuita, no key):
```
GET https://air-quality-api.open-meteo.com/v1/air-quality
  ?latitude=41.9028&longitude=12.4964
  &current=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi
  &hourly=pm10,pm2_5,nitrogen_dioxide,ozone,european_aqi
  &timezone=Europe/Rome
```

**Mappa**: Leaflet + OpenStreetMap tiles (completamente gratuito)

**AI**: Lovable AI Gateway con `google/gemini-3-flash-preview` (economico e veloce) tramite edge function

**Auth**: Lovable Cloud nativo (Google + Email)


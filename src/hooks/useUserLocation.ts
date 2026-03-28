import { useState, useEffect } from "react";

interface Location {
  latitude: number;
  longitude: number;
  city?: string;
}

const DEFAULT_LOCATION: Location = { latitude: 41.9028, longitude: 12.4964, city: "Roma" };

export function useUserLocation() {
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError("Geolocalizzazione non supportata");
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc: Location = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        // Reverse geocode for city name
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${loc.latitude}&lon=${loc.longitude}&format=json&accept-language=it`
          );
          if (res.ok) {
            const data = await res.json();
            loc.city = data.address?.city || data.address?.town || data.address?.village || "Posizione attuale";
          }
        } catch {}
        setLocation(loc);
        setLoading(false);
      },
      () => {
        setError("Permesso posizione negato");
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }, []);

  return { location, setLocation, loading, error };
}

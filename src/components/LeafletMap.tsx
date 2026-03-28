import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

export function createDivIcon(html: string, size: [number, number] = [30, 30]) {
  return L.divIcon({
    html,
    className: "",
    iconSize: size,
    iconAnchor: [size[0] / 2, size[1] / 2],
  });
}

export const userLocationIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;background:hsl(199,89%,48%);border:3px solid white;border-radius:50%;box-shadow:0 0 8px rgba(0,0,0,0.3)"></div>`,
  className: "",
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

interface PopupContent {
  title: string;
  address?: string;
  description?: string;
  votes?: number;
}

interface MapMarker {
  id: string;
  position: [number, number];
  icon?: L.DivIcon;
  popupContent?: PopupContent;
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  showUserMarker?: boolean;
  className?: string;
}

function createPopupNode(content: PopupContent) {
  const wrapper = document.createElement("div");
  wrapper.className = "text-sm";

  const title = document.createElement("p");
  title.className = "font-bold";
  title.textContent = content.title;
  wrapper.appendChild(title);

  if (content.address) {
    const address = document.createElement("p");
    address.className = "text-xs text-muted-foreground mt-1";
    address.textContent = content.address;
    wrapper.appendChild(address);
  }

  if (content.description) {
    const description = document.createElement("p");
    description.className = "text-xs mt-1";
    description.textContent = content.description;
    wrapper.appendChild(description);
  }

  if (typeof content.votes === "number") {
    const votes = document.createElement("p");
    votes.className = "text-xs font-medium mt-1";
    votes.textContent = `👍 ${content.votes} voti`;
    wrapper.appendChild(votes);
  }

  return wrapper;
}

export default function LeafletMap({
  center,
  zoom = 14,
  markers = [],
  showUserMarker = true,
  className = "h-full w-full",
}: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(center, zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      markerLayerRef.current?.clearLayers();
      markerLayerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(center, zoom);
  }, [center, zoom]);

  useEffect(() => {
    const markerLayer = markerLayerRef.current;
    if (!markerLayer) return;

    markerLayer.clearLayers();

    if (showUserMarker) {
      L.marker(center, { icon: userLocationIcon }).bindPopup("La tua posizione").addTo(markerLayer);
    }

    markers.forEach((markerData) => {
      const marker = L.marker(markerData.position, { icon: markerData.icon });

      if (markerData.popupContent) {
        marker.bindPopup(createPopupNode(markerData.popupContent));
      }

      marker.addTo(markerLayer);
    });
  }, [center, markers, showUserMarker]);

  return <div ref={containerRef} className={className} aria-label="Mappa del quartiere" />;
}

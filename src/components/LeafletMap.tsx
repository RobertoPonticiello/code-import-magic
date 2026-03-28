import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 14);
  }, [center, map]);
  return null;
}

interface MapMarker {
  id: string;
  position: [number, number];
  icon?: L.DivIcon;
  popupContent?: React.ReactNode;
}

interface LeafletMapProps {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  showUserMarker?: boolean;
  className?: string;
}

export default function LeafletMap({ center, zoom = 14, markers = [], showUserMarker = true, className = "h-full w-full" }: LeafletMapProps) {
  return (
    <MapContainer center={center} zoom={zoom} className={className} scrollWheelZoom={true}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapUpdater center={center} />
      {showUserMarker && (
        <Marker position={center} icon={userLocationIcon}>
          <Popup>La tua posizione</Popup>
        </Marker>
      )}
      {markers.map((m) => (
        <Marker key={m.id} position={m.position} icon={m.icon}>
          {m.popupContent && <Popup>{m.popupContent}</Popup>}
        </Marker>
      ))}
    </MapContainer>
  );
}

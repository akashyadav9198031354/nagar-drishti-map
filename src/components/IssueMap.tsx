import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { categoryOf, statusOf, type Cluster, type Report } from "@/lib/civic";

function pin(emoji: string, color: string, faded = false, size = 34) {
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};opacity:${faded ? 0.45 : 1};display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.35)"><span style="transform:rotate(45deg);font-size:${size * 0.45}px">${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
  });
}

const pickIcon = L.divIcon({
  className: "",
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#c0612b;border:4px solid white;box-shadow:0 0 0 3px #c0612b"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function Picker({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}

function Recenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center[0], center[1]]);
  return null;
}

export default function IssueMap({
  reports = [],
  clusters = [],
  center,
  zoom = 13,
  picked,
  onPick,
  onSelectCluster,
  className = "h-80",
}: {
  reports?: Report[];
  clusters?: Cluster[];
  center: [number, number];
  zoom?: number;
  picked?: [number, number] | null;
  onPick?: (lat: number, lng: number) => void;
  onSelectCluster?: (c: Cluster) => void;
  className?: string;
}) {
  return (
    <MapContainer center={center} zoom={zoom} className={`${className} w-full rounded-xl z-0`} scrollWheelZoom>
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {onPick && <Picker onPick={onPick} />}
      {picked && (
        <>
          <Recenter center={picked} />
          <Marker position={picked} icon={pickIcon} />
        </>
      )}
      {clusters
        .filter((c) => c.reports.length > 1)
        .map((c) => (
          <Circle
            key={"c" + c.id}
            center={c.center}
            radius={80 + c.reports.length * 15}
            pathOptions={{
              color: c.priority === "High" ? "#b3261e" : c.priority === "Medium" ? "#d4a017" : "#6b8e23",
              fillOpacity: 0.18,
              weight: 2,
            }}
            eventHandlers={{ click: () => onSelectCluster?.(c) }}
          >
            <Popup>
              <b>{categoryOf(c.category).hi} क्लस्टर</b>
              <br />
              {c.reports.length} संबंधित शिकायतें · प्राथमिकता: {c.priority}
            </Popup>
          </Circle>
        ))}
      {reports.map((r) => {
        const cat = categoryOf(r.category);
        return (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={pin(cat.icon, cat.color, r.status === "resolved")}
          >
            <Popup>
              <b>{r.reference_id}</b> · {cat.hi}
              <br />
              {r.description}
              <br />
              <i>{statusOf(r.status).hi}</i>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

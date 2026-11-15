"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string | number;
  lat: number;
  lng: number;
  title: string;
  subtitle?: string;
  href?: string;
  emoji?: string;
};

type LeafletModule = typeof import("leaflet");
type LeafletMap = import("leaflet").Map;

export default function MapView({
  points,
  center,
  zoom = 13,
  height = 340,
  pickable = false,
  initialPin,
  className = "",
}: {
  points: MapPoint[];
  center: { lat: number; lng: number };
  zoom?: number;
  height?: number;
  pickable?: boolean;
  initialPin?: { lat: number; lng: number } | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const markersRef = useRef<import("leaflet").LayerGroup | null>(null);
  const pickRef = useRef<import("leaflet").Marker | null>(null);
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(initialPin ?? null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mod = await import("leaflet");
      const L = (mod.default ?? mod) as LeafletModule;
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        center: [center.lat, center.lng],
        zoom,
        scrollWheelZoom: false,
        zoomControl: true,
      });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      markersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
      window.setTimeout(() => map.invalidateSize(), 120);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = null;
      pickRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = markersRef.current;
    if (!ready || !L || !map || !group) return;
    group.clearLayers();
    if (points.length === 0) return;
    for (const point of points) {
      const marker = L.marker([point.lat, point.lng], {
        icon: L.divIcon({
          className: "",
          html: `<div class="marker-pin">${point.emoji ?? "📍"}</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -14],
        }),
      });
      const link = point.href
        ? `<a href="${point.href}" style="font-weight:600;color:#275141">Open details →</a>`
        : "";
      marker.bindPopup(
        `<div style="min-width:150px"><strong>${escapeHtml(point.title)}</strong>${
          point.subtitle ? `<div style="color:#50705f;font-size:12px;margin-top:2px">${escapeHtml(point.subtitle)}</div>` : ""
        }<div style="margin-top:6px">${link}</div></div>`,
      );
      marker.addTo(group);
    }
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number])), { padding: [36, 36], maxZoom: 15 });
    } else {
      map.setView([points[0].lat, points[0].lng], 15);
    }
  }, [points, ready]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!pickable || !ready || !L || !map) return;
    const onClick = (event: import("leaflet").LeafletMouseEvent) => {
      const coords = { lat: Number(event.latlng.lat.toFixed(6)), lng: Number(event.latlng.lng.toFixed(6)) };
      setPicked(coords);
      if (pickRef.current) {
        pickRef.current.setLatLng([coords.lat, coords.lng]);
      } else {
        pickRef.current = L.marker([coords.lat, coords.lng], {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: '<div class="marker-pin" style="border-color:#c8901c">📌</div>',
            iconSize: [34, 34],
            iconAnchor: [17, 17],
          }),
        }).addTo(map);
        pickRef.current.on("dragend", () => {
          const pos = pickRef.current?.getLatLng();
          if (pos) setPicked({ lat: Number(pos.lat.toFixed(6)), lng: Number(pos.lng.toFixed(6)) });
        });
      }
    };
    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [pickable, ready]);

  return (
    <div className={className}>
      <div ref={containerRef} style={{ height }} className="w-full overflow-hidden rounded-3xl border border-moss-200" />
      {pickable ? (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-moss-600">
          <input type="hidden" name="lat" value={picked?.lat ?? ""} />
          <input type="hidden" name="lng" value={picked?.lng ?? ""} />
          <span className="chip bg-gold-100 text-gold-800">Tap the map to pin your location</span>
          {picked ? (
            <span className="font-mono text-[11px]">
              {picked.lat.toFixed(5)}, {picked.lng.toFixed(5)}
            </span>
          ) : (
            <span>Optional — helps riders find you.</span>
          )}
        </div>
      ) : null}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

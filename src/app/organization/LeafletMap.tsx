"use client";
import dynamic from "next/dynamic";
import { useRef, useEffect, useState } from "react";
import type { Map as LeafletMapInstance } from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import type { Report } from "./report";

// Dynamic imports (disable SSR for Leaflet)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false },
);
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

interface LeafletMapProps {
  filteredReports: Report[];
  extractCoords: (location: string) => [number, number] | null;
  getDisasterStyle: (report: Report) => {
    radius: number;
    color: string;
    fill: string;
    fillOpacity: number;
  };
  onSelectReport: (report: Report) => void;
  selectedReport?: Report | null;
}

// ✅ Smooth fly animation when selecting report
interface FlyToReportProps {
  selectedReport?: Report | null;
  extractCoords: (location: string) => [number, number] | null;
}

function FlyToReport({
  selectedReport,
  extractCoords,
}: FlyToReportProps): null {
  const map = useMap();

  useEffect(() => {
    if (selectedReport?.location) {
      // ✅ GUARANTEE string
      const coords = extractCoords(selectedReport.location);
      if (coords) {
        map.flyTo(coords, 12, { duration: 1.5 });
      }
    }
  }, [selectedReport, extractCoords, map]);

  return null;
}

export default function LeafletMap({
  filteredReports,
  extractCoords,
  getDisasterStyle,
  onSelectReport,
  selectedReport,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);

  // 🧭 3 View Modes
  const [view, setView] = useState<"satellite" | "street" | "dark">(
    "satellite",
  );

  // ✅ Load last preference
  useEffect(() => {
    const saved = localStorage.getItem("mapView");
    if (saved === "street" || saved === "satellite" || saved === "dark")
      setView(saved);
  }, []);

  // ✅ Save user preference
  useEffect(() => {
    localStorage.setItem("mapView", view);
  }, [view]);

  // ✅ Cycle between modes
  const handleToggle = () => {
    setView((prev) =>
      prev === "satellite"
        ? "street"
        : prev === "street"
          ? "dark"
          : "satellite",
    );
  };

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <MapContainer
        key="main-map"
        center={[20.5937, 78.9629]}
        zoom={5}
        style={{ width: "100%", height: "100%" }}
        ref={mapRef}
      >
        {/* 🗺️ Map Tile Layers */}
        {view === "satellite" && (
          <TileLayer
            attribution='Tiles © <a href="https://www.esri.com/">Esri</a> — Source: Esri, Earthstar Geographics'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        )}

        {view === "street" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        {view === "dark" && (
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />
        )}

        {/* ✅ Fly to selected report */}
        <FlyToReport
          selectedReport={selectedReport}
          extractCoords={extractCoords}
        />

        {/* ✅ Render Disaster Circles */}
        {filteredReports.map((report) => {
          if (!report.location) return null; // ✅ GUARANTEE string
          const coords = extractCoords(report.location);
          if (!coords) return null;

          const style = getDisasterStyle(report);

          return (
            <Circle
              key={`${report._id}-${report.classify}-${report.severity}`}
              center={coords}
              radius={style.radius}
              pathOptions={{
                color: style.color,
                fillColor: style.fill,
                fillOpacity: style.fillOpacity,
                weight: 2,
              }}
              eventHandlers={{
                click: () => onSelectReport(report),
              }}
            >
              <Popup>
                <div className="text-center rounded-md">
                  <Image
                    src={report.imageUrl || "/placeholder.jpg"}
                    alt="report"
                    width={160}
                    height={96}
                    className="w-40 h-24 object-cover rounded-md mx-auto"
                  />
                  <p className="text-sm font-semibold text-red-700">
                    {report.classify}
                  </p>
                  <p className="text-sm font-semibold text-orange-600">
                    {report.severity}
                  </p>
                  <p className="text-xs text-gray-700">{report.note}</p>
                  <p className="text-xs text-gray-500 italic mt-1">
                    {report.location}
                  </p>
                </div>
              </Popup>
            </Circle>
          );
        })}
      </MapContainer>

      {/* 🌍 View Toggle Button */}
      <button
        onClick={handleToggle}
        className="absolute top-4 right-4 z-[1000] bg-gray-800/80 text-white text-sm px-4 py-2 rounded-lg shadow-md hover:bg-gray-700 transition"
      >
        {view === "satellite"
          ? "🗺 Street View"
          : view === "street"
            ? "🌃 Dark Mode"
            : "🛰 Satellite View"}
      </button>
    </div>
  );
}

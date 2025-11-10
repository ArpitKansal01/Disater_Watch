"use client";
import dynamic from "next/dynamic";
import { useRef, useEffect } from "react";
import type { Map as LeafletMapInstance } from "leaflet";
import { useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Dynamic imports (SSR disabled)
const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Circle = dynamic(() => import("react-leaflet").then((m) => m.Circle), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

interface LeafletMapProps {
  filteredReports: any[];
  extractCoords: (location: string) => [number, number] | null;
  getDisasterStyle: (prediction: string, confidence?: number) => any;
  onSelectReport: (report: any) => void;
  selectedReport?: any;
}

// ✅ Helper component to fly to selected report
function FlyToReport({
  selectedReport,
  extractCoords,
}: {
  selectedReport: any;
  extractCoords: (location: string) => [number, number] | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedReport) {
      const coords = extractCoords(selectedReport.location);
      if (coords) {
        map.flyTo(coords, 9, { duration: 1.5 });
      }
    }
  }, [selectedReport, extractCoords, map]);

  return null; // this component only controls the map
}

export default function LeafletMap({
  filteredReports,
  extractCoords,
  getDisasterStyle,
  onSelectReport,
  selectedReport,
}: LeafletMapProps) {
  const mapRef = useRef<LeafletMapInstance | null>(null);

  return (
    <MapContainer
      key="main-map" // ✅ ensures reinit on hot reload
      center={[20.5937, 78.9629]}
      zoom={5}
      style={{ width: "100%", height: "100%" }}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* ✅ Add fly-to behavior */}
      <FlyToReport
        selectedReport={selectedReport}
        extractCoords={extractCoords}
      />

      {filteredReports.map((report) => {
        const coords = extractCoords(report.location);
        if (!coords) return null;
        const style = getDisasterStyle(report.prediction, report.confidence);
        return (
          <Circle
            key={report._id}
            center={coords}
            radius={style.radius}
            pathOptions={{
              color: style.color,
              fillColor: style.fill,
              fillOpacity: 0.5,
              weight: 2,
            }}
            eventHandlers={{
              click: () => onSelectReport(report),
            }}
          >
            <Popup>
              <div className="text-center space-y-2 p-2 rounded-md">
                <img
                  src={report.imageUrl || "/placeholder.jpg"}
                  alt="report"
                  className="w-40 h-24 object-cover rounded-md mx-auto"
                />
                <p className="text-sm font-semibold text-red-700">
                  {report.prediction}
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
  );
}

"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import type { Map as LeafletMapInstance } from "leaflet";
import * as L from "leaflet"; // ✅ For typing only
import "leaflet/dist/leaflet.css";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import LeafletMap from "./LeafletMap";
import type { Report } from "./report";

// ✅ Interfaces
interface Organization {
  _id: string;
  name: string;
  email: string;
  role: string;
  isApproved: boolean;
}

// ✅ Colors for charts
const COLORS = [
  "#ff4d4d",
  "#1e90ff",
  "#ffcc00",
  "#996633",
  "#228b22",
  "#b266ff",
];

const OrganizationDashboard = () => {
  const router = useRouter();
  const [org, setOrg] = useState<Organization | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [LInstance, setLInstance] = useState<typeof L | null>(null); // ✅ Fixed type
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const mapRef = useRef<LeafletMapInstance | null>(null);

  // ✅ Top affected regions
  const topRegions = useMemo(() => {
    const regionCounts = reports.reduce((acc: Record<string, number>, r) => {
      const region = r.location.split(",")[0]?.trim() || "Unknown Region";
      acc[region] = (acc[region] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(regionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reports]);

  // ✅ Load Leaflet dynamically
  useEffect(() => {
    import("leaflet").then((leafletModule) => setLInstance(leafletModule));
  }, []);

  // ✅ Logout handler
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("👋 Logged out successfully!");
    setTimeout(() => router.push("/"), 800);
  };

  // ✅ Fetch data
  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      if (!token || role !== "organization") {
        toast.error("⛔ Unauthorized access. Organizations only.");
        router.push("/");
        return;
      }

      try {
        const [orgRes, reportsRes] = await Promise.all([
          axios.get("https://disaster-watch-backend.onrender.com/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get("https://disaster-watch-backend.onrender.com/api/reports"),
        ]);

        setOrg(orgRes.data.user);
        setReports(reportsRes.data);
        setFilteredReports(reportsRes.data);
        setIsAuthorized(true);
        toast.success("✅ Reports loaded successfully");
      } catch (err: unknown) {
        console.error("Error fetching dashboard data:", err);
        toast.error("⚠️ Failed to load dashboard data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ✅ Filtering logic
  useEffect(() => {
    let filtered = [...reports];
    if (searchTerm)
      filtered = filtered.filter(
        (r) =>
          r.prediction.toLowerCase().includes(searchTerm.toLowerCase()) ||
          r.note.toLowerCase().includes(searchTerm.toLowerCase())
      );
    if (startDate)
      filtered = filtered.filter(
        (r) => new Date(r.createdAt) >= new Date(startDate)
      );
    if (endDate)
      filtered = filtered.filter(
        (r) => new Date(r.createdAt) <= new Date(endDate)
      );
    setFilteredReports(filtered);
  }, [searchTerm, startDate, endDate, reports]);

  // ✅ Extract coordinates safely
  const extractCoords = (location: string): [number, number] | null => {
    const latMatch = location.match(/Latitude:\s*([\d.-]+)/);
    const lonMatch = location.match(/Longitude:\s*([\d.-]+)/);
    return latMatch && lonMatch
      ? [parseFloat(latMatch[1]), parseFloat(lonMatch[1])]
      : null;
  };

  // ✅ Disaster styles
  const disasterStyles = useMemo(
    () => ({
      fire: { color: "#ff4d4d", fill: "rgba(255,0,0,0.4)", radius: 5000 },
      flood: { color: "#1e90ff", fill: "rgba(30,144,255,0.4)", radius: 12000 },
      "damaged buildings": {
        color: "#ffcc00",
        fill: "rgba(255,204,0,0.4)",
        radius: 3000,
      },
      landslide: {
        color: "#996633",
        fill: "rgba(153,102,51,0.4)",
        radius: 8000,
      },
      "fallen trees": {
        color: "#228b22",
        fill: "rgba(34,139,34,0.4)",
        radius: 2000,
      },
    }),
    []
  );

  const getDisasterStyle = (prediction: string, confidence?: number) => {
    const key = prediction.toLowerCase();
    let style = disasterStyles.fire;
    if (key.includes("fire")) style = disasterStyles.fire;
    else if (key.includes("flood")) style = disasterStyles.flood;
    else if (key.includes("damaged"))
      style = disasterStyles["damaged buildings"];
    else if (key.includes("landslide")) style = disasterStyles.landslide;
    else if (key.includes("tree")) style = disasterStyles["fallen trees"];
    else
      style = { color: "#b266ff", fill: "rgba(178,102,255,0.4)", radius: 3000 };
    return {
      ...style,
      radius: confidence ? style.radius * confidence : style.radius,
    };
  };

  // ✅ Analytics computations
  const analyticsData = useMemo(() => {
    const counts: Record<string, number> = {};
    reports.forEach((r) => {
      const key = r.prediction.toLowerCase();
      counts[key] = (counts[key] || 0) + 1;
    });
    const pieData = Object.keys(counts).map((key) => ({
      name: key.charAt(0).toUpperCase() + key.slice(1),
      value: counts[key],
    }));

    const lineDataMap: Record<string, number> = {};
    reports.forEach((r) => {
      const date = new Date(r.createdAt).toLocaleDateString();
      lineDataMap[date] = (lineDataMap[date] || 0) + 1;
    });
    const lineData = Object.keys(lineDataMap).map((d) => ({
      date: d,
      count: lineDataMap[d],
    }));

    const mostCommon =
      pieData.sort((a, b) => b.value - a.value)[0]?.name || "N/A";
    const latest = reports.length
      ? new Date(
          Math.max(...reports.map((r) => new Date(r.createdAt).getTime()))
        ).toLocaleString()
      : "No Data";
    return { pieData, lineData, mostCommon, latest };
  }, [reports]);

  // ✅ Fly to selected report
  useEffect(() => {
    if (selectedReport && mapRef.current && LInstance) {
      const coords = extractCoords(selectedReport.location);
      if (coords) mapRef.current.flyTo(coords, 9, { duration: 2 });
    }
  }, [selectedReport, LInstance]);

  if (loading || !isAuthorized || !LInstance) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin border-4 border-purple-500 border-t-transparent rounded-full w-10 h-10 mx-auto mb-4"></div>
          <p>Loading Organization Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-200">
      {/* ✅ Top Filter + Summary Bar */}
      <div className="flex justify-between items-center gap-3 p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-white">
            {org
              ? `Welcome, ${org.name.toUpperCase()}`
              : "Organization Dashboard"}
          </h1>
          <p className="text-xs text-gray-400">{org?.email}</p>
        </div>

        <div className="flex gap-5">
          <input
            type="text"
            placeholder="Search disaster or note..."
            className="px-3 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className="px-4 py-1 bg-gray-700 rounded text-white"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <input
            type="date"
            className="px-4 py-1 bg-gray-700 rounded text-white"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <button
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
              setFilteredReports(reports);
            }}
            className=" bg-gray-700 hover:bg-gray-600 px-4 py-1 rounded-md"
          >
            Clear
          </button>
        </div>

        <button
          onClick={handleLogout}
          className=" bg-red-600 hover:bg-red-700 px-4 py-2 rounded-md"
        >
          Logout
        </button>
      </div>

      {/* ✅ Main Content - Map Left, Sidebar Right */}
      <div className="flex flex-1 overflow-hidden">
        {/* Map on Left */}
        <main className="flex-1 relative h-[calc(100vh-64px)]">
          <LeafletMap
            filteredReports={filteredReports}
            extractCoords={extractCoords}
            getDisasterStyle={getDisasterStyle}
            onSelectReport={(r) => setSelectedReport(r)}
            selectedReport={selectedReport}
          />

          {/* ✅ Legend */}
          <div className="absolute bottom-4 left-4 bg-gray-800/90 text-white text-sm rounded-lg p-3 shadow-lg space-y-1 border border-gray-700">
            <p className="font-bold mb-1">🧭 Legend</p>
            {[
              ["#1e90ff", "Flood"],
              ["#ff4d4d", "Fire"],
              ["#ffcc00", "Damaged Buildings"],
              ["#996633", "Landslide"],
              ["#228b22", "Fallen Trees"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                ></span>
                {label}
              </div>
            ))}
          </div>
        </main>

        {/* ✅ Sidebar on Right */}
        <aside className="w-[30%] bg-gray-800 border-l border-gray-700 p-4 h-[calc(100vh-64px)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500">
          {/* Summary */}
          <div className="bg-gray-700 rounded-lg p-3 space-y-1">
            <p>Total Reports: {reports.length}</p>
            <p>Most Common: {analyticsData.mostCommon}</p>
            <p>Latest Report: {analyticsData.latest}</p>
          </div>

          {/* Report List (show 4 initially, rest scrollable) */}
          <div>
            <p className="text-sm font-bold text-gray-300 mt-3 mb-2">
              Reports ({filteredReports.length})
            </p>

            <div className="max-h-[250px] overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 rounded-md p-1">
              <ul className="space-y-2">
                {filteredReports.slice(0, 4).map((report) => (
                  <li
                    key={report._id}
                    onClick={() => setSelectedReport(report)}
                    className={`p-2 rounded-lg cursor-pointer transition transform hover:scale-[1.02] ${
                      selectedReport?._id === report._id
                        ? "bg-red-600 text-white"
                        : "bg-gray-700 hover:bg-gray-600"
                    }`}
                  >
                    <p className="font-semibold capitalize">
                      {report.prediction.replace("_", " ")}
                    </p>
                    <p className="text-xs text-gray-300 line-clamp-2">
                      {report.note}
                    </p>
                  </li>
                ))}
              </ul>

              {filteredReports.length > 4 && (
                <ul className="space-y-2 mt-2">
                  {filteredReports.slice(4).map((report) => (
                    <li
                      key={report._id}
                      onClick={() => setSelectedReport(report)}
                      className={`p-2 rounded-lg cursor-pointer transition transform hover:scale-[1.02] ${
                        selectedReport?._id === report._id
                          ? "bg-red-600 text-white"
                          : "bg-gray-700 hover:bg-gray-600"
                      }`}
                    >
                      <p className="font-semibold capitalize">
                        {report.prediction.replace("_", " ")}
                      </p>
                      <p className="text-xs text-gray-300 line-clamp-2">
                        {report.note}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="bg-gray-700 rounded-lg p-3 mt-4">
            <h3 className="text-sm font-semibold mb-2 text-center">
              Disaster Type Distribution
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={analyticsData.pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={75}
                  label
                >
                  {analyticsData.pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-700 rounded-lg p-3 mt-4 mb-6">
            <h3 className="text-sm font-semibold mb-2 text-center">
              Reports Over Time
            </h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={analyticsData.lineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fill: "white", fontSize: 10 }} />
                <YAxis tick={{ fill: "white", fontSize: 10 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#ff4d4d"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 🌍 Top Affected Regions */}
          <div className="bg-gray-700 rounded-lg p-3 mt-4 mb-4">
            <h3 className="text-sm font-semibold mb-2 text-center">
              🌍 Top Affected Regions
            </h3>
            <ul className="space-y-1 text-sm">
              {topRegions.length > 0 ? (
                topRegions.map(([region, count]) => (
                  <li
                    key={region}
                    className="flex justify-between border-b border-gray-600 pb-1 last:border-none"
                  >
                    <span className="truncate w-[70%]" title={region}>
                      {region}
                    </span>
                    <span className="text-red-400 font-medium">{count}</span>
                  </li>
                ))
              ) : (
                <p className="text-gray-400 text-center text-xs italic">
                  No regional data available
                </p>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default OrganizationDashboard;

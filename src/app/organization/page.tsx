"use client";
import { useEffect, useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import API from "../lib/api";
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
import { socket } from "../components/socket";

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
  const [selectedDisaster, setSelectedDisaster] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dataLoading, setDataLoading] = useState(true);

  const disasterTypes = useMemo(() => {
    const set = new Set<string>();
    reports
      .filter((r) => r.status !== "false")
      .forEach((r) => {
        if (r.classify) set.add(r.classify.toLowerCase());
      });
    return Array.from(set);
  }, [reports]);

  // ✅ Top affected regions
  const topRegions = useMemo(() => {
    type RegionData = {
      count: number;
      lat: number;
      lng: number;
    };

    const regionMap: Record<string, RegionData> = {};

    reports.forEach((r) => {
      if (!r.location) return;

      // 1️⃣ Extract region name (remove coordinates)
      const regionName = r.location.replace(/\(.*?\)/, "").trim();

      // 2️⃣ Extract coordinates "(lat, lng)"
      const coordMatch = r.location.match(/\(([-\d.]+)\s*,\s*([-\d.]+)\)/);

      if (!regionMap[regionName]) {
        regionMap[regionName] = {
          count: 0,
          lat: coordMatch ? parseFloat(coordMatch[1]) : 0,
          lng: coordMatch ? parseFloat(coordMatch[2]) : 0,
        };
      }

      regionMap[regionName].count += 1;
    });

    // 3️⃣ Build final display format
    return Object.entries(regionMap)
      .map(
        ([region, data]) =>
          [
            `${region} (${data.lat.toFixed(4)}, ${data.lng.toFixed(4)})`,
            data.count,
          ] as [string, number],
      )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [reports]);

  const classificationStyles = {
    fire: "#dc2626",
    flood: "#2563eb",
    landslide: "#92400e",
    "damaged buildings": "#facc15",
    "fallen trees": "#16a34a",
    other: "#7c3aed",
  };

  const normalizeDisasterKey = (value: string) =>
    value.toLowerCase().replace(/_/g, " ").trim();

  const DISASTER_COLORS: Record<string, string> = {
    fire: "#dc2626",
    flood: "#2563eb",
    landslide: "#92400e",
    "damaged buildings": "#facc15",
    "fallen trees": "#16a34a",
    other: "#7c3aed",
  };

  const severityScale = {
    severe: { radius: 15000, opacity: 0.75 },
    medium: { radius: 9000, opacity: 0.75 },
    low: { radius: 5000, opacity: 0.75 },
    "no damage": { radius: 2500, opacity: 0.25 },
  };
  const normalizeSeverity = (value?: string) =>
    value?.toLowerCase().replace(/_/g, " ").trim();

  const SEVERITY_COLORS: Record<string, string> = {
    severe: "#dc2626", // red
    medium: "#f97316", // orange
    low: "#facc15", // yellow
    "no damage": "#9ca3af", // gray
  };

  const getMarkerStyle = (report: Report) => {
    const sevKey = normalizeSeverity(report.severity) || "low";
    const typeKey = normalizeDisasterKey(report.classify || "other");

    const sev =
      severityScale[sevKey as keyof typeof severityScale] || severityScale.low;

    // 🟢 CASE 1: All disasters → color by disaster type
    if (selectedDisaster === "all") {
      const disasterColor = DISASTER_COLORS[typeKey] ?? DISASTER_COLORS.other;

      return {
        color: disasterColor,
        fill: disasterColor,
        radius: sev.radius,
        fillOpacity: sev.opacity,
      };
    }

    // 🔴 CASE 2: Specific disaster selected → color by severity
    const severityColor = SEVERITY_COLORS[sevKey] ?? SEVERITY_COLORS.low;

    return {
      color: severityColor,
      fill: severityColor,
      radius: sev.radius,
      fillOpacity: sev.opacity,
    };
  };

  useEffect(() => {
    socket.on("connect", () => {});

    // ✅ NEW REPORT CREATED
    socket.on("reportCreated", (newReport: Report) => {
      setReports((prev) => {
        // prevent duplicate
        const exists = prev.some((r) => r._id === newReport._id);
        if (exists) return prev;

        return [newReport, ...prev];
      });

      toast.success(`🚨 New ${newReport.classify} reported`);
    });

    // ✅ REPORT UPDATED
    socket.on("reportUpdated", (updatedReport: Report) => {
      setReports((prev) => {
        // remove old version
        const filtered = prev.filter((r) => r._id !== updatedReport._id);

        // add updated version at top
        const updated = [updatedReport, ...filtered];

        // sort newest first
        updated.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );

        return updated;
      });
    });

    return () => {
      socket.off("reportCreated");
      socket.off("reportUpdated");
    };
  }, []);

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

  // useEffect(() => {
  //   if (!isAuthorized) return;

  //   const interval = setInterval(async () => {
  //     try {
  //       setDataLoading(true);

  //       const token = localStorage.getItem("token");
  //       const res = await axios.get("http://10.103.87.3:8080/api/reports/all", {
  //         headers: { Authorization: `Bearer ${token}` },
  //       });
  //       setReports(res.data);
  //     } catch {
  //     } finally {
  //       setDataLoading(false);
  //     }
  //   }, 15000); // 🔄 every 15s

  //   return () => clearInterval(interval);
  // }, [isAuthorized]);

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
        setDataLoading(true); // ✅ start loading

        const [orgRes, reportsRes] = await Promise.all([
          API.get("/auth/me"),
          API.get("/reports/all"),
        ]);

        setOrg(orgRes.data.user);
        setReports(reportsRes.data);
        setFilteredReports(reportsRes.data);
        setIsAuthorized(true);
        toast.success("✅ Reports loaded successfully");
      } catch (err: unknown) {
        console.error("Error fetching dashboard data:", err);
        toast.error("⚠️ Failed to load dashboard data.");
        handleLogout();
      } finally {
        setDataLoading(false); // ✅ stop loading
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ✅ Filtering logic
  useEffect(() => {
    let filtered = [...reports];

    // ✅ Hide resolved & false unless explicitly selected
    if (selectedStatus === "all") {
      filtered = filtered.filter(
        (r) => r.status !== "resolved" && r.status !== "false",
      );
    }

    // ✅ If specific status selected, show only that
    else {
      filtered = filtered.filter(
        (r) => r.status?.toLowerCase() === selectedStatus,
      );
    }

    // Disaster filter
    if (selectedDisaster !== "all") {
      filtered = filtered.filter(
        (r) => normalizeDisasterKey(r.classify || "") === selectedDisaster,
      );
    }

    // Severity filter
    if (selectedSeverity !== "all") {
      filtered = filtered.filter(
        (r) =>
          normalizeSeverity(r.severity) === normalizeSeverity(selectedSeverity),
      );
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          (r.classify || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.severity || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (r.note || "").toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Date filters
    if (startDate) {
      filtered = filtered.filter(
        (r) => new Date(r.createdAt) >= new Date(startDate),
      );
    }

    if (endDate) {
      filtered = filtered.filter(
        (r) => new Date(r.createdAt) <= new Date(endDate),
      );
    }

    setFilteredReports(filtered);
  }, [
    reports,
    selectedDisaster,
    selectedSeverity,
    selectedStatus,
    searchTerm,
    startDate,
    endDate,
  ]);

  const STATUS_COLORS: Record<string, string> = {
    pending: "text-yellow-400",
    verified: "text-green-400",
    responding: "text-orange-400",
    resolved: "text-blue-400",
    false: "text-red-400",
  };

  // ✅ Extract coordinates safely
  const extractCoords = useMemo(
    () =>
      (location: string): [number, number] | null => {
        if (!location) return null;

        // Match "(lat, lng)"
        const match = location.match(/\(([-\d.]+)\s*,\s*([-\d.]+)\)/);

        if (!match) return null;

        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);

        if (isNaN(lat) || isNaN(lng)) return null;

        return [lat, lng];
      },
    [],
  );

  const handleVerify = async (reportId: string) => {
    try {
      const token = localStorage.getItem("token");
      await API.post(`/reports/${reportId}/verify`, {
        note: "Verified by authority",
      });

      toast.success("✅ Report verified");
    } catch {
      toast.error("Failed to verify report");
    }
  };

  const handleReject = async (reportId: string) => {
    try {
      const token = localStorage.getItem("token");
      await API.post(`/reports/${reportId}/false`, {
        note: "Invalid or false report",
      });

      toast.success("❌ Report rejected");
    } catch {
      toast.error("Failed to reject report");
    }
  };

  const handleRespond = async (reportId: string) => {
    try {
      const token = localStorage.getItem("token");
      await API.post(`/reports/${reportId}/respond`);

      toast.success("🚑 Help dispatched");
    } catch {
      toast.error("Failed to dispatch help");
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleResolve = async (reportId: string) => {
    try {
      await API.post(`/reports/${reportId}/resolve`);

      toast.success("🟢 Report resolved");
    } catch {
      toast.error("Failed to resolve report");
    }
  };
  const mapReports = useMemo(() => {
    // Hide resolved and false unless specifically selected
    if (selectedStatus === "resolved") {
      return filteredReports.filter((r) => r.status === "resolved");
    }

    if (selectedStatus === "false") {
      return filteredReports.filter((r) => r.status === "false");
    }

    // Default → hide resolved & false
    return filteredReports.filter(
      (r) => r.status !== "resolved" && r.status !== "false",
    );
  }, [filteredReports, selectedStatus]);

  // ✅ Analytics computations
  const analyticsData = useMemo(() => {
    let pieData: { key: string; name: string; value: number }[] = [];

    // ✅ CASE 1: ALL disasters → show disaster distribution
    if (selectedDisaster === "all") {
      const counts: Record<string, number> = {};

      filteredReports.forEach((r) => {
        const key = normalizeDisasterKey(r.classify || "other");
        counts[key] = (counts[key] || 0) + 1;
      });

      pieData = Object.keys(counts).map((key) => ({
        key,
        name: key
          .split(" ")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" "),
        value: counts[key],
      }));
    }

    // ✅ CASE 2: Specific disaster selected → show severity distribution
    else {
      const counts: Record<string, number> = {};

      filteredReports.forEach((r) => {
        const key = normalizeSeverity(r.severity) ?? "low";
        counts[key] = (counts[key] || 0) + 1;
      });

      pieData = Object.keys(counts).map((key) => ({
        key,
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: counts[key],
      }));
    }

    // ✅ Line chart (keep same)
    const lineDataMap: Record<string, number> = {};
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    reports.forEach((r) => {
      const date = new Date(r.createdAt).toISOString().split("T")[0]; // YYYY-MM-DD format

      lineDataMap[date] = (lineDataMap[date] || 0) + 1;
    });

    // convert to array and SORT by date
    const lineData = Object.entries(lineDataMap)
      .map(([date, count]) => ({
        date,
        count,
      }))
      .filter((d) => new Date(d.date) >= last30Days)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const mostCommon =
      pieData.sort((a, b) => b.value - a.value)[0]?.name || "N/A";

    const latest = reports.length
      ? new Date(
          Math.max(...reports.map((r) => new Date(r.createdAt).getTime())),
        ).toLocaleString()
      : "No Data";

    return { pieData, lineData, mostCommon, latest };
  }, [reports, filteredReports, selectedDisaster]);

  // ✅ Fly to selected report
  useEffect(() => {
    if (
      selectedReport &&
      selectedReport.location && // ✅ GUARANTEE string
      mapRef.current &&
      LInstance
    ) {
      const coords = extractCoords(selectedReport.location);
      if (coords) {
        mapRef.current.flyTo(coords, 9, { duration: 2 });
      }
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
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 p-4 bg-gray-800 border-b border-gray-700">
        <div className="flex flex-col">
          <h1 className="text-lg font-bold text-white">
            {org
              ? `Welcome, ${org.name.toUpperCase()}`
              : "Organization Dashboard"}
          </h1>
          <p className="text-xs text-gray-400">{org?.email}</p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full lg:w-auto">
          <input
            type="text"
            placeholder="Search disaster or note..."
            className="px-3 py-2 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[220px]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <input
            type="date"
            className="px-3 cursor-pointer py-2 bg-gray-700 rounded text-white w-full sm:w-auto"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />

          <input
            type="date"
            className="px-3 py-2 cursor-pointer bg-gray-700 rounded text-white w-full sm:w-auto"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <select
            value={selectedDisaster}
            onChange={(e) => setSelectedDisaster(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[180px]"
          >
            <option value="all">All Disasters</option>
            <option value="damaged buildings">Damaged Buildings</option>
            <option value="fallen trees">Fallen Trees</option>
            <option value="flood">Flood</option>
            <option value="fire">Fire</option>
            <option value="landslide">Landslide</option>
          </select>
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[180px]"
          >
            <option value="all">All Severities</option>
            <option value="severe">Severe</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-700 text-white rounded-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 w-full sm:w-[180px]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="responding">Responding</option>
            <option value="resolved">Resolved</option>
            <option value="false">False</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm("");
              setStartDate("");
              setEndDate("");
              setSelectedDisaster("all");
              setSelectedSeverity("all");
              setFilteredReports(reports);
              setSelectedStatus("all");
            }}
            className="bg-gray-700 cursor-pointer hover:bg-gray-600 px-4 py-2 rounded-md w-full sm:w-auto"
          >
            Clear
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-600 cursor-pointer hover:bg-red-700 px-4 py-2 rounded-md w-full sm:w-auto"
        >
          Logout
        </button>
      </div>

      {/* ✅ Main Content - Map Left, Sidebar Right */}
      <div className="flex flex-col lg:flex-row flex-1 lg:overflow-hidden">
        {/* Map on Left */}
        <main className="w-full lg:flex-1 h-[50vh] sm:h-[60vh] lg:h-[calc(100vh-64px)] relative">
          <LeafletMap
            filteredReports={mapReports}
            extractCoords={extractCoords}
            getDisasterStyle={getMarkerStyle}
            onSelectReport={(r) => setSelectedReport(r)}
            selectedReport={selectedReport}
          />

          {/* ✅ Legend */}
          <div
            className="
  absolute 
  bottom-4 left-4 
  max-w-[90%] 
  bg-gray-800/90 
  text-white 
  text-xs 
  rounded-lg 
  p-3 
  space-y-2 
  border border-gray-700
"
          >
            <p className="font-bold">🗺 Map Legend</p>

            <p className="text-xs text-gray-400">Color → Disaster Type</p>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-red-500">● Fire</span>
              <span className="text-blue-500">● Flood</span>
              <span className="text-yellow-400">● Damaged</span>
              <span className="text-green-500">● Fallen Trees</span>
              <span className="text-brown-500">● Landslide</span>
              <span className="text-purple-400">● Other</span>
            </div>

            <p className="text-xs text-gray-400 mt-2">Size → Severity</p>
            <div className="text-xs space-y-1">
              <p>Large → Severe</p>
              <p>Medium → Medium</p>
              <p>Small → Low</p>
              <p>Very Small → No Damage</p>
            </div>
          </div>
        </main>

        {/* ✅ Sidebar on Right */}
        <aside
          className="
  w-full 
  lg:w-[30%] 
  bg-gray-800 
  border-l lg:border-l border-gray-700 
  p-4 
  max-h-[50vh] lg:max-h-none
  overflow-y-auto
"
        >
          {/* Summary */}
          <div className="bg-gray-700 rounded-lg p-3 space-y-1">
            <p>Total Reports: {filteredReports.length}</p>
            <p>Most Common: {analyticsData.mostCommon}</p>
            <p>Latest Report: {analyticsData.latest}</p>
          </div>

          {/* Report List (show 4 initially, rest scrollable) */}
          <div className="max-h-[200px] sm:max-h-[250px] max-lg:overflow-y-auto lg:overflow-hidden rounded-md p-1">
            <p className="text-sm font-bold text-gray-300 mt-3 mb-2">
              Reports ({filteredReports.length})
            </p>

            <div className="max-h-[210px] overflow-x-hidden overflow-y-scroll scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800 hover:scrollbar-thumb-gray-500 rounded-md p-1">
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
                      {report.classify.replace("_", " ")}
                    </p>
                    <p
                      className={`capitalize font-medium ${
                        report.severity === "severe"
                          ? "text-red-400"
                          : report.severity === "medium"
                            ? "text-orange-400"
                            : report.severity === "low"
                              ? "text-yellow-400"
                              : "text-gray-400"
                      }`}
                    >
                      {report.severity.replace("_", " ")}
                    </p>
                    <p
                      className={`text-xs font-semibold ${STATUS_COLORS[report.status]}`}
                    >
                      {report.status.toUpperCase()}
                    </p>

                    <p className="text-xs text-gray-300 line-clamp-2">
                      {report.note}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      📅 Uploaded: {formatDate(report.createdAt)}
                    </p>
                    {/* 🏛 Government Actions */}
                    {report.status === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleVerify(report._id);
                          }}
                          className="px-2 py-1 cursor-pointer bg-green-600 hover:bg-green-700 text-xs rounded"
                        >
                          Verify
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(report._id);
                          }}
                          className="px-2 py-1 cursor-pointer  bg-red-600 hover:bg-red-700 text-xs rounded"
                        >
                          Reject
                        </button>
                      </div>
                    )}

                    {report.status === "verified" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRespond(report._id);
                        }}
                        className="mt-2 px-2 py-1 cursor-pointer  bg-orange-600 hover:bg-orange-700 text-xs rounded"
                      >
                        Dispatch Help
                      </button>
                    )}

                    {report.status === "responding" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(report._id);
                        }}
                        className="mt-2 px-2 py-1 cursor-pointer  bg-blue-600 hover:bg-blue-700 text-xs rounded"
                      >
                        Mark Resolved
                      </button>
                    )}
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
                        {report.classify.replace("_", " ")}
                      </p>
                      <p
                        className={`capitalize font-medium ${
                          report.severity === "severe"
                            ? "text-red-400"
                            : report.severity === "medium"
                              ? "text-orange-400"
                              : report.severity === "low"
                                ? "text-yellow-400"
                                : "text-gray-400"
                        }`}
                      >
                        {report.severity.replace("_", " ")}
                      </p>
                      <p
                        className={`text-xs font-semibold ${STATUS_COLORS[report.status]}`}
                      >
                        {report.status.toUpperCase()}
                      </p>

                      <p className="text-xs text-gray-300 line-clamp-2">
                        {report.note}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        📅 Uploaded: {formatDate(report.createdAt)}
                      </p>
                      {/* 🏛 Government Actions */}
                      {report.status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(report._id);
                            }}
                            className="px-2 py-1 cursor-pointer  bg-green-600 hover:bg-green-700 text-xs rounded"
                          >
                            Verify
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReject(report._id);
                            }}
                            className="px-2 py-1 cursor-pointer  bg-red-600 hover:bg-red-700 text-xs rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {report.status === "verified" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRespond(report._id);
                          }}
                          className="mt-2 px-2 py-1 cursor-pointer  bg-orange-600 hover:bg-orange-700 text-xs rounded"
                        >
                          Dispatch Help
                        </button>
                      )}

                      {report.status === "responding" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResolve(report._id);
                          }}
                          className="mt-2 px-2 py-1 cursor-pointer  bg-blue-600 hover:bg-blue-700 text-xs rounded"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Charts */}
          <div className="bg-gray-700 rounded-lg p-3 mt-4">
            <h3 className="text-sm font-semibold mb-2 text-center">
              {selectedDisaster === "all"
                ? "Disaster Type Distribution"
                : "Severity Distribution"}
            </h3>

            <ResponsiveContainer width="100%" height={210}>
              <PieChart>
                <Pie
                  data={analyticsData.pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={75}
                  label={({ name }) => name}
                >
                  {analyticsData.pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        selectedDisaster === "all"
                          ? (DISASTER_COLORS[entry.key] ??
                            DISASTER_COLORS.other)
                          : (SEVERITY_COLORS[entry.key] ?? SEVERITY_COLORS.low)
                      }
                    />
                  ))}
                </Pie>

                <Tooltip
                  formatter={(value: number) => [`${value}`, "Reports"]}
                  labelFormatter={(label) => `Disaster: ${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-700 rounded-lg p-3 mt-4 mb-6">
            <h3 className="text-sm font-semibold mb-2 text-center">
              Reports Over Time ( Last 30 Days)
            </h3>
            <ResponsiveContainer width="100%" height={120}>
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
                    <span className="text-wrap w-[70%]" title={region}>
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

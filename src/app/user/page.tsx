"use client";
import React, { useState, useEffect } from "react";
import SpotlightCard from "../ui/SpotlightCard";
import API from "../lib/api";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Loader from "../ui/Loader";
import dynamic from "next/dynamic";
import ReportForm from "./ReportForm";
import { saveReportOffline } from "../lib/offlineDB";
import { fileToBase64 } from "../utils/fileToBase64";
import { getOfflineReports, clearOfflineReports } from "../lib/offlineDB";

const TargetCursor = dynamic(() => import("../ui/TargetCursor"), {
  ssr: false,
});

type Status =
  | "idle"
  | "checking"
  | "predicting"
  | "uploading"
  | "success"
  | "error";

const UserDashboard: React.FC = () => {
  const router = useRouter();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [isLaptop, setIsLaptop] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [userNote, setUserNote] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [enableCursor, setEnableCursor] = useState(false);
  const [cursorActive, setCursorActive] = useState(true);
  const [isOnline, setIsOnline] = useState(true);

  const checkServerAvailable = async () => {
    try {
      const res = await fetch("http://192.168.4.2:5000", {
        method: "GET",
      });

      return res.ok;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkAndSync = async () => {
      // 📴 Only run when offline
      if (navigator.onLine) return;

      const reports = await getOfflineReports();
      if (!reports.length) return;

      console.log("🔍 Checking local server availability...");

      const isServerUp = await checkServerAvailable();
      if (isServerUp) {
        console.log("🟢 Local server reachable! Syncing...");
      } else {
        console.log("🔴 Server still unreachable");
      }
    };

    // check every 10 seconds
    interval = setInterval(checkAndSync, 10000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const updateStatus = () => {
      setIsOnline(navigator.onLine);
    };

    updateStatus(); // initial check

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);

    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const resetTimer = () => {
      setCursorActive(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setCursorActive(false), 8000); // 8s idle
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("click", resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    const enable = () => setEnableCursor(true);
    window.addEventListener("mousemove", enable, { once: true });
    return () => window.removeEventListener("mousemove", enable);
  }, []);

  // ✅ Detect laptop/desktop
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        setIsLaptop(window.innerWidth >= 1024);
      }, 150);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Cleanup object URL
  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  // ✅ Access Control: Only allow logged-in "user" role
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (!token || role !== "user") {
      toast.error("⛔ Unauthorized access. Please log in as user.");
      router.push("/");
      return;
    }

    setIsAuthorized(true);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const updateLocation = () => {
      if (!navigator.geolocation || !navigator.onLine) return;

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;

          const locationData = {
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString(),
          };

          localStorage.setItem("lastLocation", JSON.stringify(locationData));

          console.log("📍 Location updated:", locationData);
        },
        (err) => {
          console.warn("Location error:", err.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      );
    };

    // Run immediately
    updateLocation();

    // Run every 2 minutes (adjust if needed)
    interval = setInterval(updateLocation, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const locationData = {
          lat: latitude,
          lng: longitude,
          timestamp: new Date().toISOString(),
        };

        localStorage.setItem("lastLocation", JSON.stringify(locationData));

        console.log("📍 Live location:", locationData);
      },
      (err) => console.warn("Location error:", err.message),
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 10000,
      },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);
  useEffect(() => {
    const syncReports = async () => {
      const reports = await getOfflineReports();
      if (!reports.length) return;

      const token = localStorage.getItem("token");

      if (!token) {
        toast.error("Session expired. Please login again.");
        return;
      }

      toast.info(`🔄 Syncing ${reports.length} reports...`);

      for (const report of reports) {
        try {
          const res = await fetch(report.image);
          const blob = await res.blob();

          const file = new File([blob], "report.jpg", {
            type: blob.type,
          });

          let processedNote = report.note;

          try {
            const aiRes = await API.post("/ai/summarize-translate", {
              text: report.note,
            });
            processedNote = aiRes.data.result;
          } catch (err) {
            console.warn("AI failed, using raw note");
          }

          const formData = new FormData();
          formData.append("file", file);
          formData.append("note", processedNote);
          let locationData = "Location not available";

          if (navigator.geolocation) {
            try {
              locationData = await new Promise<string>((resolve) => {
                navigator.geolocation.getCurrentPosition(
                  async (position) => {
                    const { latitude, longitude } = position.coords;

                    const locationName = await getLocationName(
                      latitude,
                      longitude,
                    );

                    // extract generic region (city/state)
                    const genericLocation = locationName
                      .split(",")
                      .slice(-3)
                      .join(",")
                      .trim();

                    resolve(
                      `${genericLocation} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                    );
                  },
                  () => resolve("Location permission denied"),
                );
              });
            } catch {
              locationData = "Location unavailable";
            }
          }
          formData.append("location", locationData);

          const response = await API.post("/severity/predict", formData, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          console.log("✅ Uploaded:", response.data);
        } catch (err: any) {
          console.error("❌ Sync error:", err?.response?.data || err.message);
          continue; // ✅ DO NOT STOP
        }
      }

      await clearOfflineReports();
      toast.success("✅ All offline reports synced!");
    };

    window.addEventListener("online", syncReports);

    return () => window.removeEventListener("online", syncReports);
  }, []);

  // ✅ Logout Function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("👋 Logged out successfully!");
    setTimeout(() => router.push("/"), 800);
  };

  const getLocationName = async (
    latitude: number,
    longitude: number,
  ): Promise<string> => {
    try {
      const res = await axios.get(
        "https://nominatim.openstreetmap.org/reverse",
        {
          params: {
            lat: latitude,
            lon: longitude,
            format: "json",
          },
          headers: {
            "Accept-Language": "en",
          },
        },
      );

      return res.data.display_name || "Location name unavailable";
    } catch (err) {
      return "Location name unavailable";
    }
  };

  const processFile = async (selectedFile: File) => {
    setMessages([]);

    // 📴 CHECK FIRST (VERY IMPORTANT)
    if (!navigator.onLine) {
      setStatus("uploading"); // optional (for UX)

      const base64Image = await fileToBase64(selectedFile);
      setImageUrl(base64Image);
      const storedLocation = localStorage.getItem("lastLocation");
      let locationData = "Location unavailable";
      if (storedLocation) {
        const parsed = JSON.parse(storedLocation);
        locationData = `${parsed.lat}, ${parsed.lng}`;
      }
      await saveReportOffline({
        image: base64Image,
        note: userNote,
        location: locationData,
        createdAt: new Date().toISOString(),
      });

      toast.info("📦 Saved offline. Will sync when online.");

      setStatus("success"); // ✅ stops loader
      return;
    }

    // 🌐 ONLY ONLINE BELOW
    setStatus("uploading");
    setImageUrl(URL.createObjectURL(selectedFile));
    try {
      let locationData = "Location not available";

      if (navigator.geolocation) {
        try {
          locationData = await new Promise<string>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              async (position) => {
                const { latitude, longitude } = position.coords;

                const locationName = await getLocationName(latitude, longitude);

                // extract generic region (city/state)
                const genericLocation = locationName
                  .split(",")
                  .slice(-3)
                  .join(",")
                  .trim();

                resolve(
                  `${genericLocation} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
                );
              },
              () => resolve("Location permission denied"),
            );
          });
        } catch {
          locationData = "Location unavailable";
        }
      }

      let processedNote = userNote;

      const token = localStorage.getItem("token");
      try {
        const res = await API.post("/ai/summarize-translate", {
          text: userNote,
        });
        processedNote = res.data.result;
      } catch {
        toast.error("⚠️ Failed to process note. Using original note.");
      }
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("note", processedNote);
      formData.append("location", locationData);

      const response = await API.post("/severity/predict", formData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const { message, severity, saved, status, info } = response.data;
      if (saved && info) {
        setMessages((prev) => [...prev, `ℹ️ ${info}`]);
      }

      setMessages([
        `🧠 Predicted Disaster Type: ${message
          .toUpperCase()
          .replace("_", " ")}`,
        `🧠 Predicted Severity: ${severity.toUpperCase().replace("_", " ")}`,
        `User Note: ${processedNote.toUpperCase().replace("_", " ")}`,
      ]);

      if (message === "NO DISASTER DETECTED") {
        toast.info("✅ No disaster detected. Image not uploaded.");
        setStatus("success");
        return;
      }
      if (message === "Duplicate Report") {
        toast.info("Similar issue already reported at this location.");
        setStatus("success");
        return;
      }

      if (saved) {
        setMessages((prev) => [
          ...prev,
          `📍 Location: ${locationData}`,
          "📡 Report submitted to authorities.",
          "⏳ Status: Under verification by government officials.",
        ]);
        toast.success("🚨 Report submitted for verification!");
      }

      setStatus("success");
    } catch (err) {
      toast.error("❌ Failed to analyze image.");
      setStatus("error");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    processFile(e.target.files[0]);
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isDragging) setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  // ✅ Loading State
  if (loading || !isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <div className="text-center">
          <div className="animate-spin border-4 border-purple-500 border-t-transparent rounded-full w-10 h-10 mx-auto mb-4"></div>
          <p>Loading User Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:gap-10 text-white bg-black items-center justify-center min-h-screen p-4 font-sans relative">
      {/* 🌀 Global Loading Overlay */}
      {(status === "uploading" ||
        status === "checking" ||
        status === "predicting") && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          <Loader />
          <p className="text-white font-semibold text-lg mt-4 animate-pulse">
            {status === "uploading" && "📤 Uploading image..."}
            {status === "predicting" && "🧠 AI analyzing disaster..."}
            {status === "checking" && "🔍 Verifying report..."}
          </p>
        </div>
      )}

      {isLaptop && enableCursor && cursorActive && (
        <>
          <TargetCursor spinDuration={2} hideDefaultCursor />
        </>
      )}

      <button
        onClick={() => router.push("/user/my-reports")}
        className="absolute cursor-pointer cursor-target top-6 left-6 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md"
      >
        📋 My Reports
      </button>
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50">
        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow-lg ${
            isOnline
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white animate-pulse"
          }`}
        >
          {isOnline ? "🟢 You are Online" : "🔴 You are Offline"}
        </div>
      </div>
      {/* ✅ Logout Button */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6  bg-red-600 cursor-target cursor-pointer hover:bg-red-700 transition text-white font-semibold py-2 px-4 rounded-md"
      >
        Logout
      </button>

      {/* Guidelines Section */}
      <div className="w-full lg:max-w-sm xl:max-w-md mb-6 lg:mb-0 max-lg:mt-15">
        <div className="lg:hidden">
          <button
            onClick={() => toggleSection("guidelines")}
            className="w-full flex gap-5 items-center px-4 py-3 rounded-lg font-bold"
          >
            Photo Submission Guidelines
            <span>{openSection === "guidelines" ? "▲" : "▼"}</span>
          </button>
          {openSection === "guidelines" && (
            <div className="mt-2 rounded-xl shadow-md p-4 text-sm border-1 border-white/20">
              <ul className="list-disc list-inside space-y-2">
                <li>Take a photo of the entire disaster-affected area.</li>
                <li>Photograph the disaster, not the people.</li>
                <li>Keep the photo steady to show clear evidence.</li>
                <li>Please do not upload fake images.</li>
              </ul>
            </div>
          )}
        </div>
        <div className="lg:hidden">
          <button
            onClick={() => toggleSection("tips")}
            className="w-full flex gap-5 items-center px-4 py-3 rounded-lg font-bold"
          >
            Survival Tips
            <span>{openSection === "tips" ? "▲" : "▼"}</span>
          </button>
          {openSection === "tips" && (
            <div className="mt-2 rounded-xl shadow-md p-4 text-sm border-1 border-white/20">
              <ul className="list-disc list-inside space-y-2">
                <li>Stay calm and follow authorities’ instructions.</li>
                <li>Keep water and food supplies safe.</li>
                <li>Evacuate immediately if instructed.</li>
                <li>Stay in contact with family and neighbors.</li>
                <li>Avoid fire and electrical hazards.</li>
              </ul>
            </div>
          )}
        </div>

        <SpotlightCard
          className="custom-spotlight-card"
          spotlightColor="rgba(211, 38, 182, 0.48)"
        >
          <div className="hidden lg:block flex-1 md:p-8 mb-6 lg:mb-0 backdrop-blur-xs border-1 border-white/20 rounded-2xl p-8 shadow-xl">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Photo Submission Guidelines
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base">
              <li>Take a photo of the entire disaster-affected area.</li>
              <li>Photograph the disaster, not the people.</li>
              <li>Keep the photo steady to show clear evidence.</li>
              <li>Please do not upload fake images.</li>
            </ul>
          </div>
        </SpotlightCard>
      </div>

      {/* Main Section */}
      <div className="flex-1 w-full h-full md:p-8 lg:p-0 mb-6 lg:mb-0 backdrop-blur-xs border border-white/20 rounded-2xl p-8 shadow-xl">
        <ReportForm
          userNote={userNote}
          setUserNote={setUserNote}
          isDragging={isDragging}
          status={status}
          imageUrl={imageUrl}
          messages={messages}
          handleDragOver={handleDragOver}
          handleDragLeave={handleDragLeave}
          handleDrop={handleDrop}
          handleFileChange={handleFileChange}
        />
      </div>

      {/* Survival Tips Section */}
      <div className="w-full lg:max-w-sm xl:max-w-md">
        <SpotlightCard
          className="custom-spotlight-card"
          spotlightColor="rgba(211, 38, 182, 0.48)"
        >
          <div className="hidden lg:block border-1 border-white/20 rounded-xl shadow-2xl p-6 md:p-8">
            <h2 className="text-xl md:text-2xl font-bold mb-4">
              Survival Tips During a Disaster
            </h2>
            <ul className="list-disc list-inside space-y-2 text-sm md:text-base">
              <li>Stay calm and follow authorities’ instructions.</li>
              <li>Keep water and food supplies safe.</li>
              <li>Evacuate immediately if instructed.</li>
              <li>Stay in contact with family and neighbors.</li>
              <li>Avoid fire and electrical hazards.</li>
            </ul>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
};

export default UserDashboard;

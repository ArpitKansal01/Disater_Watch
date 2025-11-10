"use client";
import React, { useState, useEffect } from "react";
import TargetCursor from "../ui/TargetCursor";
import TiltedCard from "../ui/TiltedCard";
import SpotlightCard from "../ui/SpotlightCard";
import SplashCursor from "../ui/SplashCursor";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

  // ✅ Detect laptop/desktop
  useEffect(() => {
    const handleResize = () => setIsLaptop(window.innerWidth >= 1024);
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

  // ✅ Logout Function
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    toast.success("👋 Logged out successfully!");
    setTimeout(() => router.push("/"), 800);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const selectedFile = e.target.files[0];
    setMessages([]);
    setStatus("uploading");
    setImageUrl(URL.createObjectURL(selectedFile));

    try {
      // ✅ First, get user’s geolocation before sending
      const locationData = await new Promise<string>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject("Geolocation not supported");
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            const loc = `Latitude: ${latitude.toFixed(
              4
            )}, Longitude: ${longitude.toFixed(4)}`;

            resolve(loc);
          },
          (error) => {
            console.error("Geolocation Error:", error);
            reject("Failed to get location");
          }
        );
      });

      // ✅ Prepare FormData with file, note, and location
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("note", userNote || "No note added");
      formData.append("location", locationData);

      // ✅ Upload to backend
      const response = await axios.post(
        "https://disaster-watch-backend.onrender.com/api/classify/predict",
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      const { message, saved } = response.data;

      setMessages((prev) => [
        ...prev,
        `🧠 Predicted Disaster Type: ${message
          .toUpperCase()
          .replace("_", " ")}`,
      ]);

      if (message === "NO DISASTER DETECTED") {
        toast.info("✅ No disaster detected. Image not uploaded.");
        setStatus("success");
        return;
      }

      // ✅ If disaster detected and saved successfully
      if (saved) {
        setMessages((prev) => [
          ...prev,
          `📍 Location: ${locationData}`,
          "📡 Data shared with authorities.",
          "✅ Help will be coming soon.",
        ]);
        toast.success("🚨 Report successfully submitted!");
      }

      setStatus("success");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        console.error("Prediction error:", err.response?.data);
        toast.error(
          err.response?.data?.message || "❌ Failed to analyze or upload image."
        );
      } else {
        console.error("Unexpected error:", err);
        toast.error("❌ Unexpected error occurred.");
      }
      setStatus("error");
      setMessages((prev) => [
        ...prev,
        "⚠️ Error analyzing image. Please try again.",
      ]);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
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
    <div className="flex flex-col lg:flex-row lg:gap-10 items-center justify-center min-h-screen p-4 font-sans relative">
      {isLaptop && <TargetCursor spinDuration={2} hideDefaultCursor={true} />}
      <div className="absolute inset-0 -z-10">
        {isLaptop && <SplashCursor />}
      </div>

      {/* ✅ Logout Button */}
      <button
        onClick={handleLogout}
        className="absolute top-6 right-6  bg-red-600 cursor-target cursor-pointer hover:bg-red-700 transition text-white font-semibold py-2 px-4 rounded-md"
      >
        Logout
      </button>

      {/* Guidelines Section */}
      <div className="w-full lg:max-w-sm xl:max-w-md mb-6 lg:mb-0">
        <div className="lg:hidden">
          <button
            onClick={() => toggleSection("guidelines")}
            className="w-full flex justify-between items-center px-4 py-3 rounded-lg font-bold"
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
        <SpotlightCard
          className="custom-spotlight-card"
          spotlightColor="rgba(211, 38, 182, 0.48)"
        >
          <div className="lg:p-4">
            <div className="flex flex-col items-center mb-6 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-12 w-12 md:h-16 md:w-16 text-red-600 mb-2 animate-pulse"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h1 className="text-2xl md:text-3xl font-extrabold text-white">
                Disaster Management
              </h1>
              <p className="text-sm md:text-base text-gray-500 mt-2">
                Report your situation to authorities.
              </p>
            </div>

            <div className="bg-red-50 p-4 md:p-6 lg:p-4 rounded-lg mb-6">
              <p className="text-center text-xs md:text-sm lg:text-lg text-red-600 font-semibold">
                🚨 In case of emergency, ensure your safety first, then report.
              </p>
            </div>

            <div className="text-center space-y-6">
              {/* 📝 User Note Section */}
              <div className="mt-4 flex items-center justify-center">
                <textarea
                  value={userNote}
                  onChange={(e) => setUserNote(e.target.value)}
                  placeholder="Add any details, observations, or notes here..."
                  className="w-2xl p-3 cursor-target rounded-lg border border-white/20 bg-gray-800/40 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm md:text-base mx-5"
                  rows={3}
                />
              </div>
              <label
                htmlFor="file-upload"
                className={`cursor-pointer inline-block bg-red-600 text-white font-bold py-3 px-6 md:px-8 rounded-full shadow-lg hover:bg-red-700 transition duration-300 transform hover:scale-105 cursor-target text-sm md:text-base ${
                  status === "checking" ||
                  status === "predicting" ||
                  status === "uploading"
                    ? "opacity-50 pointer-events-none"
                    : ""
                }`}
              >
                📸 Upload or Click a Photo
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
            </div>

            {/* Uploaded Image + Messages */}
            <div className="mt-6 text-center min-h-[120px]">
              {imageUrl && (
                <div className="mb-4 flex items-center justify-center">
                  <TiltedCard
                    imageSrc={imageUrl}
                    containerHeight="300px"
                    containerWidth="300px"
                    imageHeight="250px"
                    imageWidth="250px"
                    rotateAmplitude={12}
                    scaleOnHover={1.2}
                    showMobileWarning={false}
                    showTooltip={false}
                    displayOverlayContent={false}
                  />
                </div>
              )}

              <div className="space-y-2">
                {messages.map((msg, index) => (
                  <p
                    key={index}
                    className={`text-sm md:text-lg font-bold transition-opacity duration-500 ${
                      msg.includes("Predicted Disaster Type")
                        ? "text-red-600"
                        : msg.includes("Help will be coming soon.")
                        ? "text-green-600"
                        : "text-gray-400"
                    }`}
                  >
                    {msg}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </SpotlightCard>
      </div>

      {/* Survival Tips Section */}
      <div className="w-full lg:max-w-sm xl:max-w-md">
        <div className="lg:hidden">
          <button
            onClick={() => toggleSection("tips")}
            className="w-full flex justify-between items-center px-4 py-3 rounded-lg font-bold"
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

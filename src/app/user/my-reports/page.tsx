"use client";

import React, { useEffect, useRef, useState } from "react";
import API from "../../lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { socket } from "../../components/socket";

type Report = {
  _id: string;
  imageUrl: string;
  classify: string;
  severity: string;
  status: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "⏳ Under Verification",
  verified: "✅ Verified by Authorities",
  responding: "🚑 Help Dispatched",
  resolved: "🟢 Resolved",
  false: "❌ Marked as False",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-yellow-400",
  verified: "text-blue-400",
  responding: "text-red-400",
  resolved: "text-green-400",
  false: "text-gray-400",
};

const MyReportsPage = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // 🔁 Track previous statuses for real-time notification
  const previousStatuses = useRef<Record<string, string>>({});

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const role = localStorage.getItem("role");

      // 🔐 Auth guard
      if (!token || role !== "user") {
        toast.error("⛔ Unauthorized. Please log in as a user.");
        router.push("/");
        return;
      }

      const res = await API.get("/reports/my-reports");

      const data: Report[] = res.data;

      setReports(data);

      data.forEach((report) => {
        previousStatuses.current[report._id] = report.status;
      });
    } catch (error) {
      toast.error("❌ Failed to fetch your reports");
    } finally {
      setLoading(false);
    }
  };

  const socketInitialized = useRef(false);

  useEffect(() => {
  fetchReports();

  const handleReportUpdate = (updatedReport: Report) => {
    console.log("📢 SOCKET UPDATE:", updatedReport);

    setReports((prev) => {
      const exists = prev.find((r) => r._id === updatedReport._id);
      if (!exists) return prev;

      const previousStatus =
        previousStatuses.current[updatedReport._id];

      if (
        previousStatus &&
        previousStatus !== updatedReport.status
      ) {
        toast.success(
          `📢 Report update: ${STATUS_LABEL[updatedReport.status]}`
        );
      }

      previousStatuses.current[updatedReport._id] =
        updatedReport.status;

      return prev.map((r) =>
        r._id === updatedReport._id
          ? { ...r, ...updatedReport }
          : r
      );
    });
  };

  socket.on("reportUpdated", handleReportUpdate);

  return () => {
    socket.off("reportUpdated", handleReportUpdate);
  };
}, []);

  // ⏳ Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Loading your reports...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="relative flex items-center  mb-6">
        {/* Go Back button (left) */}
        <button
          onClick={() => router.back()}
          className="bg-purple-600 hover:bg-purple-700 cursor-pointer transition text-white font-semibold py-2 px-4 rounded-md"
        >
          ⬅ Go Back
        </button>

        {/* Centered heading */}
        <h1 className="absolute max-md:right-2 max-md:max-w-45 max-md:text-center md:left-1/2 md:-translate-x-1/2 text-2xl font-bold">
          📋 My Disaster Reports
        </h1>
      </div>

      {reports.length === 0 ? (
        <p className="text-gray-400">You haven’t submitted any reports yet.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reports.map((report) => (
            <div
              key={report._id}
              className="bg-gray-800/60 border border-white/10 rounded-xl p-4 shadow-lg"
            >
              {/* 🖼️ Image */}
              <img
                src={report.imageUrl || "/placeholder.png"}
                alt="Disaster"
                className="rounded-lg h-40 w-full object-cover mb-3"
              />

              {/* 🏷️ Disaster Type */}
              <p className="font-semibold text-red-400 mb-1">
                {report.classify.replace(/_/g, " ").toUpperCase()}
              </p>

              {/* ⚠️ Severity */}
              <p className="text-sm text-gray-300">
                Severity:{" "}
                <span className="font-semibold">
                  {report.severity.toUpperCase()}
                </span>
              </p>

              {/* 📌 Status */}
              <p className="mt-2 text-sm">
                Status:{" "}
                <span
                  className={`font-semibold ${STATUS_COLOR[report.status]}`}
                >
                  {STATUS_LABEL[report.status]}
                </span>
              </p>

              {/* 🕒 Time */}
              <p className="text-xs text-gray-400 mt-1">
                Reported on {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReportsPage;

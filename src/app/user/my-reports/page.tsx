"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

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

      const res = await axios.get(
        "http://192.168.0.104:8080/api/reports/my-reports",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data: Report[] = res.data;

      // 🔔 Detect status changes
      data.forEach((report) => {
        const prevStatus = previousStatuses.current[report._id];
        if (prevStatus && prevStatus !== report.status) {
          toast.success(`📢 Report update: ${STATUS_LABEL[report.status]}`);
        }
        previousStatuses.current[report._id] = report.status;
      });

      setReports(data);
    } catch (error) {
      toast.error("❌ Failed to fetch your reports");
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Initial load + polling every 15 seconds
  useEffect(() => {
    fetchReports();

    const interval = setInterval(() => {
      fetchReports();
    }, 15000);

    return () => clearInterval(interval);
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
      <div className="relative flex items-center mb-6">
        {/* Go Back button (left) */}
        <button
          onClick={() => router.back()}
          className="bg-purple-600 hover:bg-purple-700 cursor-pointer transition text-white font-semibold py-2 px-4 rounded-md"
        >
          ⬅ Go Back
        </button>

        {/* Centered heading */}
        <h1 className="absolute left-1/2 -translate-x-1/2 text-2xl font-bold">
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

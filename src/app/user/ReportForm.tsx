import React, { useState } from "react";
import SpotlightCard from "../ui/SpotlightCard";
import TiltedCard from "../ui/TiltedCard";
type ReportFormProps = {
  userNote: string;
  setUserNote: (v: string) => void;
  isDragging: boolean;
  status: string;
  imageUrl: string | null;
  messages: string[];
  handleDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  handleDragLeave: () => void;
  handleDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};
const ReportForm: React.FC<ReportFormProps> = ({
  userNote,
  setUserNote,
  isDragging,
  status,
  imageUrl,
  messages,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleFileChange,
}) => {
  return (
    <div>
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
            <div className="mt-4 flex flex-col items-center justify-center gap-2 w-full px-4">
              <textarea
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Add any details, observations, or notes here..."
                className=" w-full max-w-2xl p-3 cursor-target rounded-lg border border-white/20 bg-gray-800/40 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm md:text-base mx-5"
                rows={3}
              />
              <p className="text-xs text-gray-400 mt-1">
                🧠 Note will be summarized & translated to English automatically
              </p>
            </div>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative cursor-target mx-auto w-full max-w-md p-6 rounded-xl border-2 border-dashed text-center transition-all cursor-pointer
                  ${
                    isDragging
                      ? "border-red-500 bg-red-500/10 scale-105"
                      : "border-white/30 bg-gray-800/40"
                  }
                  ${
                    status === "uploading" ||
                    status === "predicting" ||
                    status === "checking"
                      ? "opacity-50 pointer-events-none"
                      : ""
                  }
                `}
            >
              <p className="text-white font-semibold text-sm md:text-base">
                📸 Drag & drop an image here
              </p>
              <p className="text-gray-400 text-xs mt-1">or click to upload</p>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
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
  );
};

export default ReportForm;

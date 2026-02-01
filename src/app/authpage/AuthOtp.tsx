"use client";
import React, { useEffect, useState } from "react";
import { verifyOtp, resendOtp } from "../services/api";
import { toast } from "sonner";
import { AxiosError } from "axios";
import { useRouter } from "next/navigation";

type AuthOtpProps = {
  step: "form" | "otp";
  userId: string;
  setStep: React.Dispatch<React.SetStateAction<"form" | "otp">>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};

const AuthOtp: React.FC<AuthOtpProps> = ({
  step,
  userId,
  setStep,
  setLoading,
  loading,
}) => {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [cooldown, setCooldown] = useState(60);

  // ⏳ Restore cooldown after refresh
  // 🚀 Start cooldown when OTP step opens first time
  useEffect(() => {
    if (step !== "otp") return;

    // Always reset cooldown on refresh / first load
    const expireAt = Date.now() + 60 * 1000;
    localStorage.setItem("otpCooldown", expireAt.toString());
    setCooldown(60);
  }, [step]);

  // ⏳ Countdown timer
  useEffect(() => {
    if (cooldown <= 0) {
      localStorage.removeItem("otpCooldown");
      return;
    }

    const timer = setTimeout(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    if (otp.length === 6 && !loading) {
      setLoading(true);
      handleVerifyOtp();
    }
  }, [otp]);

  const handleVerifyOtp = async () => {
    if (!userId) {
      toast.error("Session expired. Please login again.");
      setStep("form");
      return;
    }

    if (otp.length !== 6) {
      toast.error("Enter a valid 6-digit OTP");
      return;
    }

    try {
      setLoading(true);
      const res = await verifyOtp({ userId, otp });

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role);

      toast.success("OTP verified 🎉");
      router.replace(`/${res.data.role}`);
    } catch (err) {
      const error = err as AxiosError<{ message: string }>;
      toast.error(error.response?.data?.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || loading) return;

    try {
      setLoading(true);
      const res = await resendOtp({ userId });

      const waitTime = res.data.cooldown || 60;

      const expireAt = Date.now() + waitTime * 1000;
      localStorage.setItem("otpCooldown", expireAt.toString());
      setCooldown(waitTime);

      toast.success("New OTP sent 📩");
      setOtp("");
    } catch (err) {
      const error = err as AxiosError<{ message: string; cooldown?: number }>;

      if (error.response?.status === 429) {
        const wait = error.response.data.cooldown || 60;
        const expireAt = Date.now() + wait * 1000;

        localStorage.setItem("otpCooldown", expireAt.toString());
        setCooldown(wait);
        toast.error(error.response.data.message);
      } else {
        toast.error("Failed to resend OTP");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {step === "otp" && (
        <div className="mt-4 flex flex-col gap-3">
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="Enter 6-digit OTP"
            className="w-full cursor-target rounded-md border border-gray-700 bg-gray-900 px-4 py-2 text-white"
          />

          <button
            onClick={handleVerifyOtp}
            disabled={loading}
            className="bg-purple-600 cursor-pointer cursor-target hover:bg-purple-700 text-white py-2 rounded-md disabled:opacity-50"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>

          <p className="mt-2 text-center text-gray-400">
            Didn’t receive the OTP?{" "}
            <button
              onClick={handleResendOtp}
              disabled={cooldown > 0 || loading}
              className="font-semibold cursor-pointer cursor-target text-white hover:text-purple-400 disabled:opacity-50"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend OTP"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
};

export default AuthOtp;

"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spiral } from "ldrs/react";
import "ldrs/react/Spiral.css";
import AuthHeader from "./AuthHeader";
import AuthForm from "./AuthForm";
import AuthOtp from "./AuthOtp";

// ✅ Lazy load heavy animated cursors for performance
const TargetCursor = dynamic(() => import("../ui/TargetCursor"), {
  ssr: false,
});
const SplashCursor = dynamic(() => import("../ui/SplashCursor"), {
  ssr: false,
});

const Loginpage = () => {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [isLaptop, setIsLaptop] = useState(false);
  const [enableCursor, setEnableCursor] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const enable = () => setEnableCursor(true);
    window.addEventListener("mousemove", enable, { once: true });
    return () => window.removeEventListener("mousemove", enable);
  }, []);

  // ✅ Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      if (role === "undefined") return;
      toast.info(`🔐 Already logged in as ${role}`);
      router.replace(`/${role}`);
    }
  }, [router]);

  // ✅ Check device width
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

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ✅ Fancy animated cursors only for larger screens */}
      {isLaptop && enableCursor && (
        <>
          <TargetCursor spinDuration={2} hideDefaultCursor />
          <div className="inset-0 -z-10">
            <SplashCursor />
          </div>
        </>
      )}
      {loading === true && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50">
          {/* <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-transparent border-purple-500 mb-6"></div> */}
          <Spiral size="50" speed="0.9" color="white" />{" "}
          <p className="text-white font-semibold text-lg mt-5">
            {isLogin ? "Signing in..." : "Creating account..."}
          </p>
        </div>
      )}

      {/* ✅ Main Form Container with Glass Effect */}
      <div className="relative w-full max-w-md  backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl transition-all duration-500 ease-in-out z-10">
        {/* Header Section */}
        <AuthHeader isLogin={isLogin} step={step} />

        {/* Form Section */}
        <AuthForm
          isLogin={isLogin}
          setIsLogin={setIsLogin}
          setStep={setStep}
          setUserId={setUserId}
          step={step}
          setLoading={setLoading}
          loading={loading}
        />
        {/* Otp Section */}
        <AuthOtp
          step={step}
          userId={userId}
          setStep={setStep}
          setLoading={setLoading}
          loading={loading}
        />
        {/* Extra Links */}
        <p className="mt-6 text-center text-gray-400">
          If you are an organization,{" "}
          <button
            onClick={() => router.push("/contact")}
            className="font-semibold cursor-pointer cursor-target text-white hover:text-purple-400 transition"
          >
            Contact Us
          </button>
        </p>

        <p className="text-center text-gray-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-semibold text-white cursor-pointer cursor-target hover:text-purple-400 transition"
          >
            {isLogin ? "Sign up" : "Log in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default Loginpage;

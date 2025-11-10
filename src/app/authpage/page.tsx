"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import BlurText from "../ui/BlurText";
import TextType from "../ui/TypeText";
import { login, signup } from "../services/api";

// ✅ Lazy load heavy animated cursors for performance
const TargetCursor = dynamic(() => import("../ui/TargetCursor"), {
  ssr: false,
});
const SplashCursor = dynamic(() => import("../ui/SplashCursor"), {
  ssr: false,
});

const Loginpage = () => {
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLaptop, setIsLaptop] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ Auto-redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    if (token && role) {
      toast.info(`🔐 Already logged in as ${role}`);
      router.push(`/${role}`);
    }
  }, [router]);

  // ✅ Check device width
  useEffect(() => {
    const handleResize = () => setIsLaptop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ✅ Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all required fields.");
      toast.error("⚠️ Please fill in all required fields.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      toast.error("📧 Invalid email format.");
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      setError("Passwords do not match.");
      toast.error("❌ Passwords do not match!");
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login({ email, password });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);

        toast.success(`✅ Welcome back! Logged in as ${res.data.role}.`);

        setTimeout(() => {
          if (res.data.role === "admin") router.push("/admin");
          else if (res.data.role === "organization")
            router.push("/organization");
          else router.push("/user");
        }, 1000);
      } else {
        const res = await signup({ name, email, password, role: "user" });
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("role", res.data.role);

        toast.success("🎉 Account created successfully!");
        setTimeout(() => router.push("/user"), 1000);
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        (err.request
          ? "Network error. Please check your connection."
          : "Unexpected error occurred.");
      setError(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* ✅ Beautiful blurred gradient background */}

      {/* ✅ Fancy animated cursors only for larger screens */}
      {isLaptop && (
        <>
          <TargetCursor spinDuration={2} hideDefaultCursor />
          <div className="inset-0 -z-10">{<SplashCursor />}</div>
        </>
      )}

      {/* ✅ Main Form Container with Glass Effect */}
      <div className="relative w-full max-w-md  backdrop-blur-xl border border-white/20 rounded-2xl p-8 shadow-2xl transition-all duration-500 ease-in-out z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center">
          <Image
            src="/DisasterWatch.png"
            alt="techtantra"
            width={100}
            height={100}
            className="mb-4 rounded-full"
          />
          <h1 className="text-2xl font-semibold text-white mb-2">
            {isLogin ? (
              <BlurText
                text="Log in to your account"
                delay={200}
                animateBy="words"
                direction="top"
                className="text-2xl"
              />
            ) : (
              <BlurText
                text="Create an account"
                delay={200}
                animateBy="words"
                direction="top"
                className="text-2xl"
              />
            )}
          </h1>
          {isLogin ? (
            <TextType
              text={["Welcome back! Please enter your details."]}
              typingSpeed={75}
              pauseDuration={1500}
              showCursor={true}
              cursorCharacter="|"
              className="text-gray-400 mb-6 text-center"
            />
          ) : (
            <p className="text-gray-400 mb-6 text-center">
              Sign up to get started with us.
            </p>
          )}
        </div>

        {/* Toggle Buttons */}
        <div className="flex border border-gray-700 rounded-md overflow-hidden mb-6">
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 px-6 py-2 text-sm font-semibold cursor-pointer cursor-target transition-all ${
              !isLogin ? "bg-gray-800 text-purple-400" : "text-gray-400"
            }`}
          >
            Sign up
          </button>
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 px-6 py-2 text-sm font-semibold cursor-pointer cursor-target transition-all ${
              isLogin ? "bg-gray-800 text-purple-400" : "text-gray-400"
            }`}
          >
            Log in
          </button>
        </div>

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

          {!isLogin && (
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full rounded-md border border-gray-700 cursor-pointer cursor-target bg-gray-900/70 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-md border border-gray-700 cursor-pointer cursor-target bg-gray-900/70 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-300 font-medium mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit(e as any)}
              placeholder="●●●●●●●●"
              className="w-full rounded-md border border-gray-700 cursor-pointer cursor-target bg-gray-900/70 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-gray-300 font-medium mb-1">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="w-full rounded-md border border-gray-700 cursor-pointer cursor-target bg-gray-900/70 px-4 py-2 text-gray-200 placeholder-gray-500 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-purple-600 hover:bg-purple-700 cursor-pointer cursor-target transition text-white font-semibold py-3 rounded-md ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >
            {loading
              ? isLogin
                ? "Signing in..."
                : "Creating account..."
              : isLogin
              ? "Sign in"
              : "Sign up"}
          </button>
        </form>

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

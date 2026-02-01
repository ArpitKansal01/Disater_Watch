import React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { login, signup } from "../services/api";
import axios from "axios";
import { useRouter } from "next/navigation";
type AuthFormProps = {
  isLogin: boolean;
  setIsLogin: React.Dispatch<React.SetStateAction<boolean>>;
  setStep: React.Dispatch<React.SetStateAction<"form" | "otp">>;
  setUserId: React.Dispatch<React.SetStateAction<string>>;
  step: "form" | "otp";
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  loading: boolean;
};
const AuthForm: React.FC<AuthFormProps> = ({
  isLogin,
  setIsLogin,
  setStep,
  setUserId,
  step,
  setLoading,
  loading,
}) => {
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const router = useRouter();

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
      // ✅ Explicit type helps TS
      let res: Awaited<ReturnType<typeof login>>;

      if (isLogin) {
        res = await login({ email, password });
        if (res.data.role === "user") {
          {
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("role", res.data.role);
            router.replace(`/${res.data.role}`);
            return;
          }
        }
      } else {
        res = await signup({ name, email, password });
      }

      // ✅ Now TS knows res is defined
      setUserId(res.data.userId);
      setStep("otp");

      toast.success("📩 OTP sent to your email");
    } catch (err: unknown) {
      let msg = "Unexpected error occurred.";

      if (axios.isAxiosError(err)) {
        msg =
          err.response?.data?.message ||
          (err.request
            ? "Network error. Please check your connection."
            : "Unexpected error occurred.");
      }

      setError(msg);
      toast.error(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div>
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
      {step === "form" && (
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
            className={`w-full bg-purple-600 hover:bg-purple-700 cursor-pointer cursor-target transition text-white font-semibold py-3 rounded-md  ${
              loading
                ? "bg-purple-500 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700"
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
      )}
    </div>
  );
};

export default AuthForm;

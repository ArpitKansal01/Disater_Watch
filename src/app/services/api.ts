import axios from "axios";
import type { SignupData, LoginData, otpData } from "./auth";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  // ✅ from .env.local
});

export const signup = (data: SignupData) => API.post("/signup", data);
export const login = (data: LoginData) => API.post("/login", data);
export const verifyOtp = (data: otpData) => API.post("/verify-otp", data);
export const resendOtp = (data: { userId: string }) =>
  API.post("/resend-otp", data);

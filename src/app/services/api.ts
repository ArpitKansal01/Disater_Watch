  import type { SignupData, LoginData, otpData } from "./auth";

import API from "../lib/api";

export const signup = (data: SignupData) => API.post("/auth/signup", data);
export const login = (data: LoginData) => API.post("/auth/login", data);
export const verifyOtp = (data: otpData) => API.post("/auth/verify-otp", data);
export const resendOtp = (data: { userId: string }) =>
  API.post("/auth/resend-otp", data);

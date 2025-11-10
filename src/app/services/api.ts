import axios from "axios";
import type { SignupData, LoginData } from "./auth";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // ✅ from .env.local
});

export const signup = (data: SignupData) => API.post("/signup", data);
export const login = (data: LoginData) => API.post("/login", data);

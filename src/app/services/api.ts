import axios from "axios";

const API = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL, // ✅ pulled from .env.local
});

export const signup = (data: any) => API.post("/signup", data);
export const login = (data: any) => API.post("/login", data);

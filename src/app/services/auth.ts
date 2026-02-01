// types/auth.ts
export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface otpData {
  userId: string;
  otp: string;
}

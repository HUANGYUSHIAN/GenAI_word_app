import dotenv from "dotenv";

dotenv.config();

export const PORT = Number(process.env.PORT || 4000);
export const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
export const ADMIN_ACCOUNT = process.env.ADMIN_ACCOUNT || "";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";


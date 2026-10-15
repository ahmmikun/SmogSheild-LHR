import dotenv from "dotenv";

// Ensure dotenv is loaded immediately when config is imported
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export const MODEL_ID = process.env.GROQ_MODEL || "allam-2-7b";
export const PROVIDER = "Groq";
export const OPEN_METEO_TIMEOUT_MS = 5000;
export const GROQ_TIMEOUT_MS = 10000;
export const WHO_PM25_24H = 15;
export const PM25_PER_CIGARETTE = 22;
export const PORT = process.env.PORT || 3000;

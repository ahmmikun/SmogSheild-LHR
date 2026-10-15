// Single source of truth for model identity and numeric constants.
// NOTE: gpt-oss-20b (20B) and Gemini (closed) go beyond the hackathon's
// "≤8B open-weight only" rule (R1). Chosen deliberately by the project owner.

/** Primary model on Groq; override with GROQ_MODEL. */
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";
/** Fallback model on Google Gemini (used only when GEMINI_API_KEY is set); override with GEMINI_MODEL. */
export const GEMINI_DEFAULT_MODEL = "gemini-3.8-flash";
export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_DEFAULT_MODEL;
}
export const GEMINI_MODEL = GEMINI_DEFAULT_MODEL;

export const MODEL_ID = GROQ_DEFAULT_MODEL;
export const PROVIDER = "Groq" as const;
export type AiProvider = "Groq" | "Google";

export function groqModel(): string {
  return process.env.GROQ_MODEL?.trim() || GROQ_DEFAULT_MODEL;
}

/** gpt-oss models reason before answering, so they need a bigger token budget. */
export const isReasoningModel = (model: string) => model.startsWith("openai/gpt-oss");

export const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
export const geminiEndpoint = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
export const OPEN_METEO_ENDPOINT = "https://air-quality-api.open-meteo.com/v1/air-quality";

export const OPEN_METEO_TIMEOUT_MS = 5000;
export const GROQ_TIMEOUT_MS = 10000;

/** WHO 2021 24-hour PM2.5 guideline, µg/m³. */
export const WHO_PM25_24H = 15;
/** Berkeley Earth: 22 µg/m³ PM2.5 over 24 h ≈ 1 cigarette. */
export const PM25_PER_CIGARETTE = 22;

/** Daytime commute range (inclusive), PKT. */
export const DAYTIME_START = 6;
export const DAYTIME_END = 21;

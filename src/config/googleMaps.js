/** Set `VITE_GOOGLE_MAPS_API_KEY` in `.env` (Vite exposes only `VITE_*` to the client). */
export const GOOGLE_MAPS_API_KEY =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_GOOGLE_MAPS_API_KEY
    ? String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY).trim()
    : "";

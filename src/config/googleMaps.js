import { useJsApiLoader } from "@react-google-maps/api";

/** Same env var as AddZone — must be direct `import.meta.env.VITE_*` for Vite injection. */
export const GOOGLE_MAPS_API_KEY = String(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "").trim();

/** Shared loader so zone + hub editors reuse one Maps script. */
export function useGoogleMapsLoader() {
  return useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });
}

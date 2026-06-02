import { useCallback, useEffect, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "@/config/googleMaps";

const DEFAULT = { lat: 17.4065, lng: 78.4772 };
const mapContainerStyle = { width: "100%", height: "100%" };

/** Click map or drag marker to set hub lat/lng (same contract as old_ui_backup). */
export default function HubLocationMapView({
  lat,
  lng,
  onPositionChange,
  visible = true,
  flyToToken = 0,
  isLoaded = false,
  loadError = null,
}) {
  const ignoreNextMapClickRef = useRef(false);
  const mapRef = useRef(null);

  const la = lat != null && Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT.lat;
  const ln = lng != null && Number.isFinite(Number(lng)) ? Number(lng) : DEFAULT.lng;
  const center = { lat: la, lng: ln };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!visible || flyToToken === 0 || !mapRef.current) return;
    const a = parseFloat(String(lat));
    const b = parseFloat(String(lng));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      mapRef.current.panTo({ lat: a, lng: b });
    }
  }, [flyToToken, lat, lng, visible]);

  useEffect(() => {
    if (!visible || !mapRef.current || !isLoaded) return;
    const t = requestAnimationFrame(() => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    });
    return () => cancelAnimationFrame(t);
  }, [visible, isLoaded]);

  const handleMapClick = useCallback(
    (e) => {
      if (ignoreNextMapClickRef.current) {
        ignoreNextMapClickRef.current = false;
        return;
      }
      if (e.latLng) {
        onPositionChange?.(e.latLng.lat(), e.latLng.lng());
      }
    },
    [onPositionChange],
  );

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="hub-map-placeholder">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code> (same as Zones editor).
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="hub-map-placeholder hub-map-placeholder--error">
        Could not load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="hub-map-placeholder">
        <span className="hub-map-spinner" aria-hidden />
        Loading map…
      </div>
    );
  }

  const markerIcon =
    typeof google !== "undefined" && google.maps?.SymbolPath
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#DC2626",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 11,
        }
      : undefined;

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={center}
      zoom={12}
      onLoad={onMapLoad}
      onClick={handleMapClick}
      options={{
        fullscreenControl: true,
        streetViewControl: false,
        mapTypeControl: true,
      }}
    >
      <Marker
        position={center}
        draggable
        icon={markerIcon}
        onDragEnd={(e) => {
          ignoreNextMapClickRef.current = true;
          const pos = e.latLng;
          if (pos) onPositionChange?.(pos.lat(), pos.lng());
        }}
      />
    </GoogleMap>
  );
}

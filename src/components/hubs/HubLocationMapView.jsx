import { useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../../config/googleMaps";

const DEFAULT = { lat: 17.4065, lng: 78.4772 };
const mapContainerStyle = { width: "100%", height: "100%" };

/**
 * Single hub location: click map or drag marker to set lat/lng.
 */
export default function HubLocationMapView({
  lat,
  lng,
  onPositionChange,
  visible = true,
  flyToToken = 0,
}) {
  const ignoreNextMapClickRef = useRef(false);
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "youdash-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || " ",
    version: "weekly",
  });

  const la =
    lat != null && Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT.lat;
  const ln =
    lng != null && Number.isFinite(Number(lng)) ? Number(lng) : DEFAULT.lng;
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

  const markerIcon =
    typeof google !== "undefined" && google.maps?.SymbolPath
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#E51818",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 3,
          scale: 11,
        }
      : undefined;

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
    [onPositionChange]
  );

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 bg-light small p-3 text-center text-secondary border rounded-3">
        Set <code>VITE_GOOGLE_MAPS_API_KEY</code> in <code>.env</code>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 bg-light text-danger small p-3">
        Could not load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100 bg-light">
        <div className="spinner-border text-danger" role="status" />
      </div>
    );
  }

  return (
    <div
      className="h-100 w-100 position-relative"
      style={{ height: "100%", minHeight: 0, flex: "1 1 auto" }}
    >
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
    </div>
  );
}

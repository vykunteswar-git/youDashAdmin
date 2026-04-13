import { useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Marker,
  Polyline,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../../config/googleMaps";

const DEFAULT = { lat: 17.4065, lng: 78.4772 };
const mapContainerStyle = { width: "100%", height: "100%" };

const lineOpts = {
  strokeColor: "#E51818",
  strokeOpacity: 0.95,
  strokeWeight: 4,
  clickable: false,
};

function hubPoint(h) {
  if (!h || h.lat == null || h.lng == null) return null;
  const lat = Number(h.lat);
  const lng = Number(h.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/**
 * Shows origin / destination hub positions and a line between them when both have coordinates.
 */
export default function HubRouteMapView({
  originHub,
  destinationHub,
  visible = true,
}) {
  const mapRef = useRef(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "youdash-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || " ",
    version: "weekly",
  });

  const o = hubPoint(originHub);
  const d = hubPoint(destinationHub);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!isLoaded || !mapRef.current || !window.google?.maps) return;
    const map = mapRef.current;
    if (o && d) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(o);
      bounds.extend(d);
      map.fitBounds(bounds, 48);
    } else if (o) {
      map.setCenter(o);
      map.setZoom(12);
    } else if (d) {
      map.setCenter(d);
      map.setZoom(12);
    } else {
      map.setCenter(DEFAULT);
      map.setZoom(10);
    }
  }, [isLoaded, o, d, originHub, destinationHub]);

  useEffect(() => {
    if (!visible || !mapRef.current || !isLoaded) return;
    const t = requestAnimationFrame(() => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    });
    return () => cancelAnimationFrame(t);
  }, [visible, isLoaded]);

  const originIcon =
    typeof google !== "undefined" && google.maps?.SymbolPath
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#059669",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 10,
        }
      : undefined;

  const destIcon =
    typeof google !== "undefined" && google.maps?.SymbolPath
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#E51818",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 10,
        }
      : undefined;

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

  const path = o && d ? [o, d] : [];

  return (
    <div
      className="h-100 w-100 position-relative"
      style={{ height: "100%", minHeight: 0, flex: "1 1 auto" }}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={o || d || DEFAULT}
        zoom={o && d ? 8 : 11}
        onLoad={onMapLoad}
        options={{
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
        }}
      >
        {o && d ? <Polyline path={path} options={lineOpts} /> : null}
        {o ? (
          <Marker
            position={o}
            title={originHub?.name ? `Origin: ${originHub.name}` : "Origin hub"}
            icon={originIcon}
          />
        ) : null}
        {d ? (
          <Marker
            position={d}
            title={
              destinationHub?.name
                ? `Destination: ${destinationHub.name}`
                : "Destination hub"
            }
            icon={destIcon}
          />
        ) : null}
      </GoogleMap>
    </div>
  );
}

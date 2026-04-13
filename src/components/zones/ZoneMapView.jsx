import { useCallback, useEffect, useRef } from "react";
import {
  GoogleMap,
  useJsApiLoader,
  Circle,
  Polygon,
  Polyline,
  Marker,
} from "@react-google-maps/api";
import { GOOGLE_MAPS_API_KEY } from "../../config/googleMaps";

const DEFAULT_CENTER = { lat: 17.4065, lng: 78.4772 };

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const circlePolyOpts = {
  strokeColor: "#E51818",
  strokeOpacity: 1,
  strokeWeight: 2,
  fillColor: "#E51818",
  fillOpacity: 0.12,
  clickable: false,
};

const polygonOpts = {
  strokeColor: "#E51818",
  strokeOpacity: 1,
  strokeWeight: 2,
  fillColor: "#E51818",
  fillOpacity: 0.15,
  clickable: false,
};

const polylineOpts = {
  strokeColor: "#E51818",
  strokeOpacity: 1,
  strokeWeight: 2,
  clickable: false,
};

/**
 * @param {'CIRCLE'|'POLYGON'} props.zoneType
 * @param {number} props.centerLat
 * @param {number} props.centerLng
 * @param {number} props.radiusKm
 * @param {Array<[number,number]>} props.polygonPoints
 * @param {(lat: number, lng: number) => void} props.onMapClick
 * @param {(lat: number, lng: number) => void} [props.onCenterDragEnd]
 * @param {(index: number, lat: number, lng: number) => void} [props.onPolygonVertexDragEnd]
 * @param {number} props.flyToToken
 */
export default function ZoneMapView({
  zoneType,
  centerLat,
  centerLng,
  radiusKm,
  polygonPoints = [],
  onMapClick,
  onCenterDragEnd,
  onPolygonVertexDragEnd,
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

  const lat =
    centerLat != null && Number.isFinite(Number(centerLat))
      ? Number(centerLat)
      : DEFAULT_CENTER.lat;
  const lng =
    centerLng != null && Number.isFinite(Number(centerLng))
      ? Number(centerLng)
      : DEFAULT_CENTER.lng;

  const radiusM =
    radiusKm != null && Number.isFinite(Number(radiusKm)) && Number(radiusKm) > 0
      ? Number(radiusKm) * 1000
      : 2000;

  const handleClick = useCallback(
    (la, ln) => {
      onMapClick?.(la, ln);
    },
    [onMapClick]
  );

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!visible || flyToToken === 0 || !mapRef.current) return;
    const la = parseFloat(String(centerLat));
    const ln = parseFloat(String(centerLng));
    if (Number.isFinite(la) && Number.isFinite(ln)) {
      mapRef.current.panTo({ lat: la, lng: ln });
    }
  }, [flyToToken, centerLat, centerLng, visible]);

  useEffect(() => {
    if (!visible || !mapRef.current || !isLoaded) return;
    const t = requestAnimationFrame(() => {
      if (mapRef.current && window.google?.maps?.event) {
        window.google.maps.event.trigger(mapRef.current, "resize");
      }
    });
    return () => cancelAnimationFrame(t);
  }, [visible, isLoaded]);

  const handleMapClickEvent = useCallback(
    (e) => {
      if (ignoreNextMapClickRef.current) {
        ignoreNextMapClickRef.current = false;
        return;
      }
      if (e.latLng) {
        handleClick(e.latLng.lat(), e.latLng.lng());
      }
    },
    [handleClick]
  );

  const markDragJustEnded = () => {
    ignoreNextMapClickRef.current = true;
  };

  const pathFromPoints = useCallback(() => {
    return polygonPoints.map(([pla, plg]) => ({ lat: pla, lng: plg }));
  }, [polygonPoints]);

  const markerIcon =
    typeof google !== "undefined" && google.maps?.SymbolPath
      ? {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#E51818",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: zoneType === "CIRCLE" ? 10 : 8,
        }
      : undefined;

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div
        className="d-flex align-items-center justify-content-center h-100 bg-light text-secondary small p-4 text-center border rounded-3"
        style={{ minHeight: 200 }}
      >
        <div>
          <p className="mb-2 fw-semibold text-dark">Google Maps API key missing</p>
          <p className="mb-0">
            Add <code className="small">VITE_GOOGLE_MAPS_API_KEY=…</code> to your{" "}
            <code className="small">.env</code> file and restart the dev server.
          </p>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div
        className="d-flex align-items-center justify-content-center h-100 bg-light text-danger small p-4"
        style={{ minHeight: 200 }}
      >
        Could not load Google Maps. Check the API key and billing.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div
        className="d-flex align-items-center justify-content-center h-100 bg-light"
        style={{ minHeight: 200 }}
      >
        <div className="spinner-border text-danger" role="status">
          <span className="visually-hidden">Loading map…</span>
        </div>
      </div>
    );
  }

  const center = { lat, lng };

  return (
    <div
      className="zone-map-root h-100 w-100 position-relative"
      style={{ height: "100%", minHeight: 0, flex: "1 1 auto" }}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={12}
        onLoad={onMapLoad}
        onClick={handleMapClickEvent}
        options={{
          fullscreenControl: true,
          streetViewControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_RIGHT,
          },
        }}
      >
        {zoneType === "CIRCLE" ? (
          <>
            <Circle center={center} radius={radiusM} options={circlePolyOpts} />
            <Marker
              position={center}
              draggable
              onDragEnd={(e) => {
                markDragJustEnded();
                const pos = e.latLng;
                if (pos) onCenterDragEnd?.(pos.lat(), pos.lng());
              }}
              icon={markerIcon}
            />
          </>
        ) : (
          <>
            {polygonPoints.map(([pla, plg], i) => (
              <Marker
                key={`v-${i}`}
                position={{ lat: pla, lng: plg }}
                draggable
                onDragEnd={(e) => {
                  markDragJustEnded();
                  const pos = e.latLng;
                  if (pos)
                    onPolygonVertexDragEnd?.(i, pos.lat(), pos.lng());
                }}
                icon={markerIcon}
              />
            ))}
            {polygonPoints.length >= 3 ? (
              <Polygon paths={pathFromPoints()} options={polygonOpts} />
            ) : polygonPoints.length === 2 ? (
              <Polyline path={pathFromPoints()} options={polylineOpts} />
            ) : null}
          </>
        )}
      </GoogleMap>
    </div>
  );
}

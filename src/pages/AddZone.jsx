import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, Marker, Circle, Polygon } from "@react-google-maps/api";
import api from "@/lib/api";
import { useGoogleMapsLoader } from "@/config/googleMaps";
import PageHeader from "@/components/PageHeader";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import "./AddZone.css";

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };
const MAP_PADDING = { top: 56, right: 48, bottom: 48, left: 48 };

function normalizeCoordPair(c) {
  if (Array.isArray(c) && c.length >= 2) {
    return [Number(c[0]), Number(c[1])];
  }
  if (c && typeof c === "object") {
    const lat = c.lat ?? c.latitude;
    const lng = c.lng ?? c.longitude ?? c.lon;
    if (lat != null && lng != null) return [Number(lat), Number(lng)];
  }
  return null;
}

function normalizeCoordinates(coords) {
  return (Array.isArray(coords) ? coords : [])
    .map(normalizeCoordPair)
    .filter((p) => p && Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

function zoneGeometryCenter(form) {
  if (form.zoneType === "POLYGON" && form.coordinates.length) {
    const lat =
      form.coordinates.reduce((sum, p) => sum + p[0], 0) / form.coordinates.length;
    const lng =
      form.coordinates.reduce((sum, p) => sum + p[1], 0) / form.coordinates.length;
    return { lat, lng };
  }
  return {
    lat: Number(form.centerLat) || DEFAULT_CENTER.lat,
    lng: Number(form.centerLng) || DEFAULT_CENTER.lng,
  };
}

function fitMapToZone(map, form) {
  if (!map || !window.google?.maps) return;

  const bounds = new window.google.maps.LatLngBounds();

  if (form.zoneType === "POLYGON" && form.coordinates.length) {
    form.coordinates.forEach(([lat, lng]) => bounds.extend({ lat, lng }));
    if (form.coordinates.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(14);
      return;
    }
    map.fitBounds(bounds, MAP_PADDING);
    return;
  }

  if (form.zoneType === "CIRCLE") {
    const lat = Number(form.centerLat);
    const lng = Number(form.centerLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    const radiusM = Math.max(Number(form.radiusKm) || 1, 0.5) * 1000;
    const latDelta = (radiusM / 6378137) * (180 / Math.PI);
    const lngDelta = latDelta / Math.cos((lat * Math.PI) / 180);
    bounds.extend({ lat: lat + latDelta, lng: lng + lngDelta });
    bounds.extend({ lat: lat - latDelta, lng: lng - lngDelta });
    map.fitBounds(bounds, MAP_PADDING);
  }
}

export default function ZoneForm({ mode = "create" }) {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const mapRef = useRef(null);
  const [form, setForm] = useState({
    name: "",
    city: "",
    status: "SERVING",
    zoneType: "CIRCLE",
    centerLat: DEFAULT_CENTER.lat,
    centerLng: DEFAULT_CENTER.lng,
    radiusKm: 5,
    coordinates: [],
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const { isLoaded: mapLoaded } = useGoogleMapsLoader();

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/zones/${id}`)
      .then((r) => {
        const z = r.data;
        const zoneType = z.zoneType || z.zone_type || "CIRCLE";
        const coordinates = normalizeCoordinates(z.coordinates);
        setForm({
          name: z.name || "",
          city: z.city || "",
          status: z.status || "SERVING",
          zoneType,
          centerLat:
            z.centerLat ??
            z.center_lat ??
            (coordinates[0]?.[0] ?? DEFAULT_CENTER.lat),
          centerLng:
            z.centerLng ??
            z.center_lng ??
            (coordinates[0]?.[1] ?? DEFAULT_CENTER.lng),
          radiusKm: z.radiusKm ?? z.radius_km ?? 5,
          coordinates,
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Zone not found");
        nav("/zones");
      });
  }, [id, isEdit, nav]);

  useEffect(() => {
    if (loading || !mapLoaded || !mapRef.current) return;
    fitMapToZone(mapRef.current, form);
  }, [
    loading,
    mapLoaded,
    form.zoneType,
    form.coordinates,
    form.centerLat,
    form.centerLng,
    form.radiusKm,
  ]);

  const onMapLoad = useCallback(
    (map) => {
      mapRef.current = map;
      if (!loading) fitMapToZone(map, form);
    },
    [form, loading],
  );

  function set(k, v) {
    setForm((current) => ({ ...current, [k]: v }));
  }

  function handleMapClick(event) {
    const point = [
      Number(event.latLng.lat().toFixed(6)),
      Number(event.latLng.lng().toFixed(6)),
    ];
    if (form.zoneType === "POLYGON") {
      setForm((current) => ({
        ...current,
        coordinates: [...current.coordinates, point],
      }));
      return;
    }
    setForm((current) => ({
      ...current,
      centerLat: point[0],
      centerLng: point[1],
    }));
  }

  function setZoneType(zoneType) {
    setForm((current) => ({
      ...current,
      zoneType,
      coordinates: zoneType === "POLYGON" ? current.coordinates : [],
      radiusKm: zoneType === "CIRCLE" ? current.radiusKm || 5 : current.radiusKm,
    }));
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.city.trim()) {
      toast.error("Name and city are required");
      return;
    }
    if (form.zoneType === "CIRCLE" && (!form.centerLat || !form.centerLng || !form.radiusKm)) {
      toast.error("Circle zone requires latitude, longitude, and radius");
      return;
    }
    if (form.zoneType === "POLYGON" && form.coordinates.length < 3) {
      toast.error("Polygon zone requires at least 3 map points");
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/zones/${id}`, form);
        toast.success(`Zone "${form.name}" updated`);
      } else {
        await api.post("/zones", form);
        toast.success(`Zone "${form.name}" created`);
      }
      nav("/zones");
    } catch (err) {
      toast.error(err?.response?.data?.detail || `Failed to ${isEdit ? "update" : "create"} zone`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <AppLoadingScreen message="Loading zone…" testId="zone-loading" />;

  const center = zoneGeometryCenter(form);
  const polygonPath = form.coordinates.map(([lat, lng]) => ({ lat, lng }));

  return (
    <div
      data-testid={isEdit ? "edit-zone-page" : "add-zone-page"}
      className="zone-form-page"
    >
      <button
        onClick={() => nav("/zones")}
        className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-3 flex items-center gap-1"
        data-testid="back-to-zones"
      >
        <ArrowLeft size={13} /> Back to Zones
      </button>
      <PageHeader
        title={isEdit ? "Edit Zone" : "Add Zone"}
        subtitle={
          isEdit
            ? "Update an existing geographical service zone"
            : "Create a new geographical service zone"
        }
      />

      <form onSubmit={submit} className="surface p-6 space-y-5" data-testid="zone-form">
        <div className="zone-form-layout">
          <div className="zone-form-fields">
            <div>
              <label className="label">Zone Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Bangalore South"
                className="input"
                data-testid="zone-name-input"
                autoFocus
              />
            </div>
            <div>
              <label className="label">City</label>
              <input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="e.g. Bangalore"
                className="input"
                data-testid="zone-city-input"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="input"
                data-testid="zone-status-input"
              >
                <option value="SERVING">SERVING</option>
                <option value="PAUSED">PAUSED</option>
              </select>
              <p className="text-[11px] text-[var(--slate-400)] mt-1">
                Paused zones won&apos;t accept new bookings.
              </p>
            </div>
            <div>
              <label className="label">Zone Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setZoneType("CIRCLE")}
                  className={`chip justify-center ${form.zoneType === "CIRCLE" ? "chip-active" : ""}`}
                >
                  Circle
                </button>
                <button
                  type="button"
                  onClick={() => setZoneType("POLYGON")}
                  className={`chip justify-center ${form.zoneType === "POLYGON" ? "chip-active" : ""}`}
                >
                  Polygon
                </button>
              </div>
            </div>
            {form.zoneType === "CIRCLE" ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label">Latitude</label>
                  <input
                    type="number"
                    value={form.centerLat}
                    onChange={(e) => set("centerLat", parseFloat(e.target.value || 0))}
                    className="input mono"
                    step="0.000001"
                  />
                </div>
                <div>
                  <label className="label">Longitude</label>
                  <input
                    type="number"
                    value={form.centerLng}
                    onChange={(e) => set("centerLng", parseFloat(e.target.value || 0))}
                    className="input mono"
                    step="0.000001"
                  />
                </div>
                <div>
                  <label className="label">Radius KM</label>
                  <input
                    type="number"
                    value={form.radiusKm}
                    onChange={(e) => set("radiusKm", parseFloat(e.target.value || 0))}
                    className="input mono"
                    min="1"
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-sm border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="label mb-0">Polygon Points</div>
                    <p className="text-[11px] text-[var(--slate-400)]">
                      Click the map to add points in boundary order.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => set("coordinates", [])}
                    className="btn-secondary text-[11px] h-8"
                  >
                    Clear
                  </button>
                </div>
                <div className="zone-polygon-list space-y-1">
                  {form.coordinates.length ? (
                    form.coordinates.map(([lat, lng], index) => (
                      <div
                        key={`${lat}-${lng}-${index}`}
                        className="mono text-[11px] text-[var(--slate-600)]"
                      >
                        {index + 1}. {lat}, {lng}
                      </div>
                    ))
                  ) : (
                    <div className="text-[12px] text-[var(--slate-400)]">No points added yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="label">Zone Map</label>
            <div className="zone-form-map-wrap">
              <span className="zone-form-map-badge">
                {form.zoneType === "CIRCLE"
                  ? "Click map to set zone center"
                  : "Click map to add polygon points"}
              </span>
              {mapLoaded ? (
                <GoogleMap
                  center={center}
                  zoom={12}
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  onLoad={onMapLoad}
                  onClick={handleMapClick}
                  options={{
                    streetViewControl: false,
                    mapTypeControl: true,
                    fullscreenControl: true,
                  }}
                >
                  {form.zoneType === "CIRCLE" ? (
                    <>
                      <Marker position={center} />
                      <Circle
                        center={center}
                        radius={(Number(form.radiusKm) || 1) * 1000}
                        options={{
                          fillColor: "#DC2626",
                          fillOpacity: 0.12,
                          strokeColor: "#DC2626",
                          strokeOpacity: 0.85,
                          strokeWeight: 2,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {polygonPath.map((point, index) => (
                        <Marker
                          key={`${point.lat}-${point.lng}-${index}`}
                          position={point}
                          label={`${index + 1}`}
                        />
                      ))}
                      {polygonPath.length >= 3 && (
                        <Polygon
                          paths={polygonPath}
                          options={{
                            fillColor: "#DC2626",
                            fillOpacity: 0.12,
                            strokeColor: "#DC2626",
                            strokeOpacity: 0.85,
                            strokeWeight: 2,
                          }}
                        />
                      )}
                    </>
                  )}
                </GoogleMap>
              ) : (
                <AppLoadingScreen message="Loading map…" variant="inline" testId="zone-map-loading" />
              )}
            </div>
          </div>
        </div>

        <div className="pt-2 flex gap-2 border-t border-[var(--border-default)]">
          <button type="submit" disabled={saving} className="btn-primary" data-testid="save-zone-btn">
            <Save size={14} /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Zone"}
          </button>
          <button type="button" onClick={() => nav("/zones")} className="btn-secondary" data-testid="cancel-zone-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

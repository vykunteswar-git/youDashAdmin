import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { GoogleMap, Marker, Circle, Polygon, useJsApiLoader } from "@react-google-maps/api";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

const DEFAULT_CENTER = { lat: 17.385, lng: 78.4867 };

export default function ZoneForm({ mode = "create" }) {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
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
  const { isLoaded: mapLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
  });

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/zones/${id}`).then(r => {
      setForm({
        name: r.data.name || "",
        city: r.data.city || "",
        status: r.data.status || "SERVING",
        zoneType: r.data.zoneType || "CIRCLE",
        centerLat: r.data.centerLat ?? DEFAULT_CENTER.lat,
        centerLng: r.data.centerLng ?? DEFAULT_CENTER.lng,
        radiusKm: r.data.radiusKm ?? 5,
        coordinates: r.data.coordinates || [],
      });
      setLoading(false);
    }).catch(() => { toast.error("Zone not found"); nav("/zones"); });
  }, [id, isEdit, nav]);

  function set(k, v) { setForm({ ...form, [k]: v }); }
  function handleMapClick(event) {
    const point = [
      Number(event.latLng.lat().toFixed(6)),
      Number(event.latLng.lng().toFixed(6)),
    ];
    if (form.zoneType === "POLYGON") {
      setForm({ ...form, coordinates: [...form.coordinates, point] });
      return;
    }
    setForm({
      ...form,
      centerLat: point[0],
      centerLng: point[1],
    });
  }

  function setZoneType(zoneType) {
    setForm({
      ...form,
      zoneType,
      coordinates: zoneType === "POLYGON" ? form.coordinates : [],
      radiusKm: zoneType === "CIRCLE" ? form.radiusKm || 5 : form.radiusKm,
    });
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

  if (loading) return <div className="empty">Loading zone…</div>;
  const center = {
    lat: Number(form.centerLat) || DEFAULT_CENTER.lat,
    lng: Number(form.centerLng) || DEFAULT_CENTER.lng,
  };
  const polygonPath = form.coordinates.map(([lat, lng]) => ({ lat, lng }));

  return (
    <div data-testid={isEdit ? "edit-zone-page" : "add-zone-page"} className="max-w-5xl">
      <button onClick={() => nav("/zones")} className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-3 flex items-center gap-1" data-testid="back-to-zones">
        <ArrowLeft size={13} /> Back to Zones
      </button>
      <PageHeader
        title={isEdit ? "Edit Zone" : "Add Zone"}
        subtitle={isEdit ? "Update an existing geographical service zone" : "Create a new geographical service zone"}
      />

      <form onSubmit={submit} className="surface p-6 space-y-5" data-testid="zone-form">
        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-4">
            <div>
              <label className="label">Zone Name</label>
              <input
                value={form.name}
                onChange={e => set("name", e.target.value)}
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
                onChange={e => set("city", e.target.value)}
                placeholder="e.g. Bangalore"
                className="input"
                data-testid="zone-city-input"
              />
            </div>
            <div>
              <label className="label">Status</label>
              <select
                value={form.status}
                onChange={e => set("status", e.target.value)}
                className="input"
                data-testid="zone-status-input"
              >
                <option value="SERVING">SERVING</option>
                <option value="PAUSED">PAUSED</option>
              </select>
              <p className="text-[11px] text-[var(--slate-400)] mt-1">Paused zones won't accept new bookings.</p>
            </div>
            <div>
              <label className="label">Zone Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setZoneType("CIRCLE")} className={`chip justify-center ${form.zoneType === "CIRCLE" ? "chip-active" : ""}`}>
                  Circle
                </button>
                <button type="button" onClick={() => setZoneType("POLYGON")} className={`chip justify-center ${form.zoneType === "POLYGON" ? "chip-active" : ""}`}>
                  Polygon
                </button>
              </div>
            </div>
            {form.zoneType === "CIRCLE" ? (
              <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="label">Latitude</label>
                <input type="number" value={form.centerLat} onChange={e => set("centerLat", parseFloat(e.target.value || 0))} className="input mono" step="0.000001" />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input type="number" value={form.centerLng} onChange={e => set("centerLng", parseFloat(e.target.value || 0))} className="input mono" step="0.000001" />
              </div>
              <div>
                <label className="label">Radius KM</label>
                <input type="number" value={form.radiusKm} onChange={e => set("radiusKm", parseFloat(e.target.value || 0))} className="input mono" min="1" />
              </div>
              </div>
            ) : (
              <div className="rounded-sm border border-[var(--border-default)] p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="label mb-0">Polygon Points</div>
                    <p className="text-[11px] text-[var(--slate-400)]">Click the map to add points in boundary order.</p>
                  </div>
                  <button type="button" onClick={() => set("coordinates", [])} className="btn-secondary text-[11px] h-8">Clear</button>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {form.coordinates.length ? form.coordinates.map(([lat, lng], index) => (
                    <div key={`${lat}-${lng}-${index}`} className="mono text-[11px] text-[var(--slate-600)]">
                      {index + 1}. {lat}, {lng}
                    </div>
                  )) : (
                    <div className="text-[12px] text-[var(--slate-400)]">No points added yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="label">Zone Map</label>
            <div className="h-[340px] rounded-sm overflow-hidden border border-[var(--border-default)] bg-[var(--slate-100)]">
              {mapLoaded ? (
                <GoogleMap
                  center={center}
                  zoom={11}
                  mapContainerStyle={{ width: "100%", height: "100%" }}
                  onClick={handleMapClick}
                  options={{ streetViewControl: false, mapTypeControl: false }}
                >
                  {form.zoneType === "CIRCLE" ? (
                    <>
                      <Marker position={center} />
                      <Circle
                        center={center}
                        radius={(Number(form.radiusKm) || 1) * 1000}
                        options={{
                          fillColor: "#E51818",
                          fillOpacity: 0.12,
                          strokeColor: "#E51818",
                          strokeOpacity: 0.8,
                          strokeWeight: 2,
                        }}
                      />
                    </>
                  ) : (
                    <>
                      {polygonPath.map((point, index) => <Marker key={`${point.lat}-${point.lng}-${index}`} position={point} label={`${index + 1}`} />)}
                      {polygonPath.length >= 3 && (
                        <Polygon
                          paths={polygonPath}
                          options={{
                            fillColor: "#E51818",
                            fillOpacity: 0.12,
                            strokeColor: "#E51818",
                            strokeOpacity: 0.8,
                            strokeWeight: 2,
                          }}
                        />
                      )}
                    </>
                  )}
                </GoogleMap>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-[var(--slate-500)]">Loading map...</div>
              )}
            </div>
            <p className="text-[11px] text-[var(--slate-400)] mt-2">
              {form.zoneType === "CIRCLE" ? "Click the map to set the service zone center." : "Click the map to add polygon boundary points."}
            </p>
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

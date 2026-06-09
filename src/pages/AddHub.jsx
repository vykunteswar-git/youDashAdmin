import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import HubLocationMapView from "@/components/hubs/HubLocationMapView";
import { useGoogleMapsLoader } from "@/config/googleMaps";
import { toast } from "sonner";
import { ArrowLeft, Crosshair, MapPin, Save, X } from "lucide-react";
import "./AddHub.css";

const DEFAULT_CENTER = { lat: 17.4065, lng: 78.4772 };

const EMPTY_FORM = {
  name: "",
  zone_id: "",
  city: "",
  address: "",
  lat: String(DEFAULT_CENTER.lat),
  lng: String(DEFAULT_CENTER.lng),
  status: "FULLY_OPERATIONAL",
};

export default function HubForm({ mode = "create" }) {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [flyToToken, setFlyToToken] = useState(0);
  const { isLoaded: mapLoaded, loadError: mapLoadError } = useGoogleMapsLoader();

  useEffect(() => {
    api.get("/zones").then((r) => setZones(r.data?.zones ?? []));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/hubs/${id}`)
      .then((r) => {
        const h = r.data;
        setForm({
          name: h.name || "",
          zone_id: h.zone_id || "",
          city: h.city || "",
          address: h.address || "",
          lat: h.lat != null ? String(h.lat) : String(DEFAULT_CENTER.lat),
          lng: h.lng != null ? String(h.lng) : String(DEFAULT_CENTER.lng),
          status: h.status || "FULLY_OPERATIONAL",
        });
        setLoading(false);
      })
      .catch(() => {
        toast.error("Hub not found");
        nav("/hubs");
      });
  }, [id, isEdit, nav]);

  const set = useCallback((k, v) => {
    setForm((current) => ({ ...current, [k]: v }));
  }, []);

  const handleHubPosition = useCallback((la, ln) => {
    setForm((current) => ({
      ...current,
      lat: String(Number(la.toFixed(6))),
      lng: String(Number(ln.toFixed(6))),
    }));
  }, []);

  const mapLat = parseFloat(form.lat);
  const mapLng = parseFloat(form.lng);
  const mapLatNum = Number.isFinite(mapLat) ? mapLat : DEFAULT_CENTER.lat;
  const mapLngNum = Number.isFinite(mapLng) ? mapLng : DEFAULT_CENTER.lng;

  const selectedZone = zones.find((z) => String(z.id) === String(form.zone_id));

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.zone_id || !form.city.trim()) {
      toast.error("Name, zone and city are required");
      return;
    }
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Set hub location on the map or enter valid coordinates");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, lat, lng };
      if (isEdit) {
        await api.patch(`/hubs/${id}`, payload);
        toast.success(`Hub "${form.name}" updated`);
      } else {
        await api.post("/hubs", payload);
        toast.success(`Hub "${form.name}" created`);
      }
      nav("/hubs");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || `Failed to ${isEdit ? "update" : "create"} hub`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">Loading hub…</div>;

  return (
    <div data-testid={isEdit ? "edit-hub-page" : "add-hub-page"} className="hub-form-page">
      <div className="hub-form-topbar">
        <div>
          <button
            type="button"
            onClick={() => nav("/hubs")}
            className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-2 flex items-center gap-1"
            data-testid="back-to-hubs"
          >
            <ArrowLeft size={13} /> Back to Hubs
          </button>
          <h2>{isEdit ? "Edit hub" : "Add hub"}</h2>
          <p>Map on the left — click or drag the pin to set location.</p>
        </div>
        <button type="button" onClick={() => nav("/hubs")} className="chip" data-testid="cancel-hub-btn">
          <X size={14} /> Close
        </button>
      </div>

      <form onSubmit={submit} className="hub-form-layout" data-testid="hub-form">
        <div className="hub-form-map-col">
          <span className="hub-form-map-badge">Click map or drag pin to set the hub location</span>
          <div className="hub-form-map-wrap">
            <HubLocationMapView
              lat={mapLatNum}
              lng={mapLngNum}
              onPositionChange={handleHubPosition}
              visible
              flyToToken={flyToToken}
              isLoaded={mapLoaded}
              loadError={mapLoadError}
            />
          </div>
        </div>

        <div className="hub-form-panel">
          <div className="space-y-4">
            <div>
              <label className="label">Name</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. BLR Whitefield Hub"
                className="input"
                data-testid="hub-name-input"
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
                data-testid="hub-city-input"
              />
            </div>

            <div>
              <label className="label">Full Address</label>
              <textarea
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="e.g. 15-7-4, 38 Bus Stop Back Side, Old Gajuwaka, Vizag - 530026"
                className="input hub-address-textarea"
                rows={4}
                data-testid="hub-address-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lat}
                  onChange={(e) => set("lat", e.target.value)}
                  className="input mono"
                  data-testid="hub-lat-input"
                />
              </div>
              <div>
                <label className="label">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={form.lng}
                  onChange={(e) => set("lng", e.target.value)}
                  className="input mono"
                  data-testid="hub-lng-input"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setFlyToToken((t) => t + 1)}
              className="chip w-full justify-center"
              data-testid="hub-center-map-btn"
            >
              <Crosshair size={14} /> Center map on coordinates
            </button>

            <div>
              <label className="label flex items-center gap-2">
                <MapPin size={14} /> Linked zone
              </label>
              <select
                value={form.zone_id}
                onChange={(e) => set("zone_id", e.target.value)}
                className="input"
                data-testid="hub-zone-input"
              >
                <option value="">Select zone…</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} — {z.city}
                    {z.status === "SERVING" ? " · Serving" : " · Paused"}
                  </option>
                ))}
              </select>
              {selectedZone ? (
                <p className="text-[11px] mt-1">
                  <span className={`pill ${selectedZone.status === "SERVING" ? "pill-green" : "pill-amber"}`}>
                    {selectedZone.status === "SERVING" ? "Zone active" : "Zone paused"}
                  </span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="label">Hub status</label>
              <select
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="input"
                data-testid="hub-status-input"
              >
                <option value="FULLY_OPERATIONAL">Fully Operational</option>
                <option value="CROSS_CITY_ONLY">Cross-city Only</option>
                <option value="HUB_OFF">Hub Off</option>
              </select>
            </div>

            <div className="rounded-sm border border-[var(--border-default)] bg-[var(--slate-50)] p-3 text-[12px] text-[var(--slate-600)]">
              Delivery corridor SLAs are configured from the Hubs list using the <strong>SLA</strong> action on each row.
            </div>

            <div className="flex gap-2 pt-2 border-t border-[var(--border-default)]">
              <button type="submit" disabled={saving} className="btn-primary" data-testid="save-hub-btn">
                <Save size={14} /> {saving ? "Saving…" : isEdit ? "Save changes" : "Create hub"}
              </button>
              <button type="button" onClick={() => nav("/hubs")} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

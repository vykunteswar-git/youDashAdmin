import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";

export default function HubForm({ mode = "create" }) {
  const nav = useNavigate();
  const { id } = useParams();
  const isEdit = mode === "edit";
  const [zones, setZones] = useState([]);
  const [form, setForm] = useState({
    name: "",
    zone_id: "",
    city: "",
    lat: "",
    lng: "",
    hours: "06:00 - 22:00",
    status: "FULLY_OPERATIONAL",
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);

  useEffect(() => {
    api.get("/zones").then(r => setZones(r.data.zones));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/hubs/${id}`).then(r => {
      const h = r.data;
      setForm({
        name: h.name || "",
        zone_id: h.zone_id || "",
        city: h.city || "",
        lat: String(h.lat ?? ""),
        lng: String(h.lng ?? ""),
        hours: h.hours || "06:00 - 22:00",
        status: h.status || "FULLY_OPERATIONAL",
      });
      setLoading(false);
    }).catch(() => { toast.error("Hub not found"); nav("/hubs"); });
  }, [id, isEdit, nav]);

  function set(k, v) { setForm({ ...form, [k]: v }); }

  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.zone_id || !form.city.trim()) {
      toast.error("Name, zone and city are required");
      return;
    }
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      toast.error("Latitude and longitude must be numbers");
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
      toast.error(err?.response?.data?.detail || `Failed to ${isEdit ? "update" : "create"} hub`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="empty">Loading hub…</div>;

  return (
    <div data-testid={isEdit ? "edit-hub-page" : "add-hub-page"} className="max-w-3xl">
      <button onClick={() => nav("/hubs")} className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-3 flex items-center gap-1" data-testid="back-to-hubs">
        <ArrowLeft size={13} /> Back to Hubs
      </button>
      <PageHeader
        title={isEdit ? "Edit Hub" : "Add Hub"}
        subtitle={isEdit ? "Update an existing depot in the network" : "Register a new physical depot in the network"}
      />

      <form onSubmit={submit} className="surface p-6 space-y-5" data-testid="hub-form">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Hub Name</label>
            <input value={form.name} onChange={e => set("name", e.target.value)} placeholder="e.g. BLR Whitefield Hub" className="input" data-testid="hub-name-input" autoFocus />
          </div>
          <div>
            <label className="label">Zone</label>
            <select value={form.zone_id} onChange={e => set("zone_id", e.target.value)} className="input" data-testid="hub-zone-input">
              <option value="">Select zone…</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name} · {z.city}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label">City</label>
          <input value={form.city} onChange={e => set("city", e.target.value)} placeholder="e.g. Bangalore" className="input" data-testid="hub-city-input" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Latitude</label>
            <input type="number" step="0.000001" value={form.lat} onChange={e => set("lat", e.target.value)} placeholder="12.971599" className="input mono" data-testid="hub-lat-input" />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input type="number" step="0.000001" value={form.lng} onChange={e => set("lng", e.target.value)} placeholder="77.594566" className="input mono" data-testid="hub-lng-input" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Operating Hours</label>
            <input value={form.hours} onChange={e => set("hours", e.target.value)} placeholder="06:00 - 22:00" className="input" data-testid="hub-hours-input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select value={form.status} onChange={e => set("status", e.target.value)} className="input" data-testid="hub-status-input">
              <option value="FULLY_OPERATIONAL">Fully Operational</option>
              <option value="CROSS_CITY_ONLY">Cross-city Only</option>
              <option value="HUB_OFF">Hub Off</option>
            </select>
          </div>
        </div>

        <div className="bg-[var(--blue-tint)] border border-[#BFDBFE] rounded p-3 text-[12px] text-[var(--blue)]">
          Dispatch SLA slots are configured separately from the Hubs list ("Slots" button on each row).
        </div>

        <div className="pt-2 flex gap-2 border-t border-[var(--border-default)]">
          <button type="submit" disabled={saving} className="btn-primary" data-testid="save-hub-btn">
            <Save size={14} /> {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Hub"}
          </button>
          <button type="button" onClick={() => nav("/hubs")} className="btn-secondary" data-testid="cancel-hub-btn">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Save, X, Clock } from "lucide-react";

export default function Hubs() {
  const nav = useNavigate();
  const [hs, setHs] = useState([]);
  const [zones, setZones] = useState([]);
  const [zone, setZone] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [editing, setEditing] = useState(null); // hub being edited for slots

  async function load() {
    const r = await api.get("/hubs");
    setHs(r.data?.hubs ?? []);
  }
  useEffect(() => { api.get("/zones").then(r => setZones(r.data?.zones ?? [])); }, []);
  useEffect(() => { load(); }, []);
  const filtered = hs.filter(h =>
    (zone === "ALL" || String(h.zone_id) === String(zone)) &&
    (status === "ALL" || h.status === status)
  );
  async function toggle(h) {
    const ns = h.status === "FULLY_OPERATIONAL" ? "HUB_OFF" : "FULLY_OPERATIONAL";
    await api.patch(`/hubs/${h.id}`, { status: ns });
    toast.success("Updated"); load();
  }
  return (
    <div data-testid="hubs-page">
      <PageHeader
        title="Hubs"
        subtitle="Physical depots & dispatch SLA slots"
        actions={
          <button onClick={() => nav("/hubs/new")} className="btn-primary" data-testid="add-hub-btn">
            <Plus size={14} /> Add Hub
          </button>
        }
      />
      <div className="surface p-3 mb-4 flex gap-2 items-center" data-testid="hubs-filter">
        <select value={zone} onChange={e => setZone(e.target.value)} className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" data-testid="hub-zone-filter">
          <option value="ALL">All zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" data-testid="hub-status-filter">
          {["ALL", "FULLY_OPERATIONAL", "CROSS_CITY_ONLY", "HUB_OFF"].map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Name</th><th>City</th><th>Coords</th><th>Hours</th><th>Slots</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {filtered.map(h => (
              <tr key={h.id} data-testid={`hub-row-${h.id}`}>
                <td className="font-medium">{h.name}</td>
                <td>{h.city}</td>
                <td className="mono text-[11px]">{h.lat}, {h.lng}</td>
                <td className="text-[12px]">{h.hours}</td>
                <td className="text-[12px]">{(h.slots || []).length} configured</td>
                <td><span className={`pill ${h.status === "FULLY_OPERATIONAL" ? "pill-green" : "pill-red"}`}>{h.status.replaceAll("_", " ")}</span></td>
                <td className="flex gap-1">
                  <button onClick={() => nav(`/hubs/${h.id}/edit`)} className="chip" data-testid={`edit-hub-${h.id}`}>Edit</button>
                  <button onClick={() => setEditing(h)} className="chip" data-testid={`edit-slots-${h.id}`}><Clock size={11} /> SLA</button>
                  <button onClick={() => toggle(h)} className="chip" data-testid={`toggle-hub-${h.id}`}>Toggle</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">No hubs found for selected filters</td></tr>}
          </tbody>
        </table>
      </div>

      <HubSlaEditor hub={editing} zones={zones} onClose={() => setEditing(null)} />
    </div>
  );
}

const EMPTY_SLA = (hubId, destinationZoneId = "") => ({
  hubId,
  destinationZoneId,
  deliveryType: "NEXT_DAY",
  cutoffTime: "",
  deliveredWithinHours: "",
  priority: "1",
  isActive: true,
});

function HubSlaEditor({ hub, zones, onClose }) {
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => EMPTY_SLA(hub?.id));
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!hub) return;
    const r = await api.get("/hub-corridor-sla", { params: { hubId: hub.id } });
    setRows(r.data?.slas ?? []);
  }
  useEffect(() => {
    if (!hub) return;
    setForm(EMPTY_SLA(hub.id));
    setEditingId(null);
    load();
    /* eslint-disable-next-line */
  }, [hub]);

  if (!hub) return null;

  const zoneName = (id) => zones.find(z => String(z.id) === String(id))?.name || `Zone #${id}`;
  function set(k, v) { setForm(current => ({ ...current, [k]: v })); }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      hubId: hub.id,
      destinationZoneId: String(row.destinationZoneId ?? ""),
      deliveryType: String(row.deliveryType || "NEXT_DAY").toUpperCase(),
      cutoffTime: row.cutoffTime ?? "",
      deliveredWithinHours: row.deliveredWithinHours != null ? String(row.deliveredWithinHours) : "",
      priority: row.priority != null ? String(row.priority) : "1",
      isActive: Boolean(row.isActive),
    });
  }

  async function save() {
    const destinationZoneId = parseInt(form.destinationZoneId, 10);
    if (Number.isNaN(destinationZoneId)) return toast.error("Select a destination zone");
    if (!form.cutoffTime.trim()) return toast.error("Cutoff time is required");
    if (form.deliveryType === "HOURS" && !form.deliveredWithinHours.trim()) return toast.error("Enter delivery hours");
    const priority = parseInt(form.priority, 10);
    const payload = {
      hubId: hub.id,
      destinationZoneId,
      deliveryType: form.deliveryType,
      cutoffTime: form.cutoffTime.trim(),
      deliveredWithinHours: form.deliveryType === "HOURS" && form.deliveredWithinHours.trim()
        ? parseInt(form.deliveredWithinHours, 10)
        : null,
      priority: Number.isNaN(priority) ? 1 : priority,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/hub-corridor-sla/${editingId}`, payload);
        toast.success("SLA updated");
      } else {
        await api.post("/hub-corridor-sla", payload);
        toast.success("SLA added");
      }
      setForm(EMPTY_SLA(hub.id));
      setEditingId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save SLA");
    } finally {
      setSaving(false);
    }
  }

  function slaSummary(row) {
    const t = String(row.deliveryType || "NEXT_DAY").toUpperCase();
    if (t === "HOURS") return `Within ${row.deliveredWithinHours ?? "?"}h`;
    return "Next day";
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="slot-editor-modal">
      <div className="surface w-[820px] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>Delivery SLAs</h3>
            <p className="text-[12px] text-zinc-500">{hub.name} · {hub.city} — per-destination-zone delivery promise</p>
          </div>
          <button onClick={onClose} data-testid="slot-close"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Pri</th>
                <th>Destination zone</th>
                <th style={{ width: 110 }}>Type</th>
                <th style={{ width: 90 }}>Cutoff</th>
                <th>Promise</th>
                <th style={{ width: 70 }}>Active</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} data-testid={`sla-row-${row.id}`}>
                  <td className="mono">{row.priority}</td>
                  <td className="font-medium">{zoneName(row.destinationZoneId)}</td>
                  <td className="text-[12px]">{row.deliveryType}</td>
                  <td className="mono text-[12px]">{row.cutoffTime || "—"}</td>
                  <td className="text-[12px]">{slaSummary(row)}</td>
                  <td>{row.isActive ? <span className="pill pill-green">ON</span> : <span className="pill pill-slate">OFF</span>}</td>
                  <td><button onClick={() => startEdit(row)} className="chip" data-testid={`sla-edit-${row.id}`}>Edit</button></td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="empty">No corridor SLA yet — add a next-day or hours promise below.</td></tr>}
            </tbody>
          </table>

          <div className="mt-4 rounded-sm border border-[var(--border-default)] p-4">
            <div className="text-[12px] font-semibold mb-3">{editingId ? "Edit SLA" : "Add SLA"}</div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Destination Zone</label>
                <select value={form.destinationZoneId} onChange={e => set("destinationZoneId", e.target.value)} className="input" data-testid="sla-zone">
                  <option value="">Select zone…</option>
                  {zones.map(z => <option key={z.id} value={z.id}>{z.name} · {z.city}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Delivery Type</label>
                <select value={form.deliveryType} onChange={e => set("deliveryType", e.target.value)} className="input" data-testid="sla-type">
                  <option value="NEXT_DAY">NEXT_DAY</option>
                  <option value="HOURS">HOURS</option>
                </select>
              </div>
              <div>
                <label className="label">Cutoff (HH:mm)</label>
                <input type="time" value={form.cutoffTime} onChange={e => set("cutoffTime", e.target.value)} className="input mono" data-testid="sla-cutoff" />
              </div>
              {form.deliveryType === "HOURS" && (
                <div>
                  <label className="label">Within Hours</label>
                  <input type="number" value={form.deliveredWithinHours} onChange={e => set("deliveredWithinHours", e.target.value)} className="input mono" data-testid="sla-hours" />
                </div>
              )}
              <div>
                <label className="label">Priority</label>
                <input type="number" value={form.priority} onChange={e => set("priority", e.target.value)} className="input mono" data-testid="sla-priority" />
              </div>
              <div>
                <label className="label">Status</label>
                <button type="button" onClick={() => set("isActive", !form.isActive)} className={`w-full h-9 rounded-sm border text-sm font-semibold ${form.isActive ? "bg-emerald-50 text-emerald-800 border-emerald-300" : "bg-zinc-100 text-zinc-700 border-zinc-300"}`}>
                  {form.isActive ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
          {editingId && <button onClick={() => { setEditingId(null); setForm(EMPTY_SLA(hub.id)); }} className="chip" data-testid="sla-new">New</button>}
          <button onClick={onClose} className="chip" data-testid="slot-cancel">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary" data-testid="slot-save"><Save size={13} /> {saving ? "Saving…" : editingId ? "Save SLA" : "Add SLA"}</button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Plus, Trash2, Save, X, Clock } from "lucide-react";

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
                  <button onClick={() => setEditing(h)} className="chip" data-testid={`edit-slots-${h.id}`}><Clock size={11} /> Slots</button>
                  <button onClick={() => toggle(h)} className="chip" data-testid={`toggle-hub-${h.id}`}>Toggle</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty">No hubs found for selected filters</td></tr>}
          </tbody>
        </table>
      </div>

      <SlotEditor hub={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
    </div>
  );
}

function SlotEditor({ hub, onClose, onSaved }) {
  const [slots, setSlots] = useState([]);
  useEffect(() => {
    if (!hub) return;
    setSlots((hub.slots || []).map((s, i) => ({
      name: s.name || "",
      cutoff: s.cutoff || "",
      delivery_by: s.delivery_by || "",
      offset_days: s.offset_days ?? 1,
      priority: s.priority ?? (i + 1),
      delivery_type: s.delivery_type || "NEXT_DAY",
      hours: s.hours || null,
    })));
  }, [hub]);

  if (!hub) return null;

  function update(i, field, val) {
    const next = [...slots];
    next[i] = { ...next[i], [field]: val };
    setSlots(next);
  }
  function addSlot() {
    setSlots([...slots, { name: "New slot", cutoff: "12:00", delivery_by: "18:00 next day", offset_days: 1, priority: slots.length + 1, delivery_type: "NEXT_DAY", hours: null }]);
  }
  function remove(i) {
    setSlots(slots.filter((_, idx) => idx !== i));
  }
  async function save() {
    // sort & normalize priority
    const normalized = [...slots]
      .sort((a, b) => a.priority - b.priority)
      .map((s, i) => ({ ...s, priority: i + 1, offset_days: parseInt(s.offset_days || 0), hours: s.hours ? parseInt(s.hours) : null }));
    await api.put(`/hubs/${hub.id}/slots`, normalized);
    toast.success(`Saved ${normalized.length} slots for ${hub.name}`);
    onSaved?.();
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="slot-editor-modal">
      <div className="surface w-[820px] max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start px-5 py-3 border-b border-[var(--border-default)]">
          <div>
            <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>Dispatch SLA slots</h3>
            <p className="text-[12px] text-zinc-500">{hub.name} · {hub.city}</p>
          </div>
          <button onClick={onClose} data-testid="slot-close"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="text-[11px] text-zinc-500 mb-3">
            Slots are evaluated in priority order. Lower number = preferred. A booking picks the first slot whose cutoff hasn't passed.
          </div>

          <table className="tbl">
            <thead>
              <tr>
                <th style={{ width: 50 }}>Pri</th>
                <th>Name</th>
                <th style={{ width: 90 }}>Cutoff</th>
                <th>Delivery by</th>
                <th style={{ width: 70 }}>Days</th>
                <th style={{ width: 110 }}>Type</th>
                <th style={{ width: 70 }}>Hours</th>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {slots.map((s, i) => (
                <tr key={i} data-testid={`slot-row-${i}`}>
                  <td><input type="number" value={s.priority} onChange={e => update(i, "priority", parseInt(e.target.value || 1))} className="h-7 w-12 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" /></td>
                  <td><input value={s.name} onChange={e => update(i, "name", e.target.value)} className="h-7 w-full text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" data-testid={`slot-name-${i}`} /></td>
                  <td><input type="time" value={s.cutoff} onChange={e => update(i, "cutoff", e.target.value)} className="h-7 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" data-testid={`slot-cutoff-${i}`} /></td>
                  <td><input value={s.delivery_by} onChange={e => update(i, "delivery_by", e.target.value)} className="h-7 w-full text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" /></td>
                  <td><input type="number" value={s.offset_days} onChange={e => update(i, "offset_days", e.target.value)} className="h-7 w-12 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5" /></td>
                  <td>
                    <select value={s.delivery_type} onChange={e => update(i, "delivery_type", e.target.value)} className="h-7 text-[11px] border border-[var(--border-default)] rounded-sm">
                      <option value="NEXT_DAY">NEXT_DAY</option>
                      <option value="HOURS">HOURS</option>
                    </select>
                  </td>
                  <td>
                    <input type="number" disabled={s.delivery_type !== "HOURS"} value={s.hours || ""} onChange={e => update(i, "hours", e.target.value)} placeholder="—" className="h-7 w-14 mono text-[12px] border border-[var(--border-default)] rounded-sm px-1.5 disabled:bg-zinc-50 disabled:text-zinc-400" />
                  </td>
                  <td><button onClick={() => remove(i)} className="text-zinc-500 hover:text-rose-700" data-testid={`slot-remove-${i}`}><Trash2 size={13} /></button></td>
                </tr>
              ))}
              {slots.length === 0 && <tr><td colSpan={8} className="empty">No slots configured. Add the first one below.</td></tr>}
            </tbody>
          </table>

          <button onClick={addSlot} className="mt-3 chip" data-testid="slot-add"><Plus size={12} /> Add slot</button>
        </div>

        <div className="px-5 py-3 border-t border-[var(--border-default)] flex justify-end gap-2">
          <button onClick={onClose} className="chip" data-testid="slot-cancel">Cancel</button>
          <button onClick={save} className="btn-primary" data-testid="slot-save"><Save size={13} /> Save slots</button>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import {
  Plus, Save, X, Trash2, SlidersHorizontal, Pencil, Power,
  MapPin, CalendarClock, Timer, AlarmClock, Zap, Building2,
  CheckCircle2, XCircle, ArrowRight, ChevronDown,
} from "lucide-react";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const TYPE_META = {
  NEXT_DAY: {
    label: "Next Day",
    Icon: CalendarClock,
    badge: "bg-blue-50 text-blue-700 border-blue-200",
    accent: "border-l-blue-400",
    btn: "bg-blue-50 border-blue-300 text-blue-700",
  },
  HOURS: {
    label: "Hours",
    Icon: Timer,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    accent: "border-l-amber-400",
    btn: "bg-amber-50 border-amber-300 text-amber-700",
  },
};

const EMPTY_SLA = (hubId) => ({
  hubId,
  destinationZoneId: "",
  deliveryType: "NEXT_DAY",
  cutoffTime: "",
  deliveryTime: "",
  deliveredWithinHours: "",
  priority: "1",
  isActive: true,
});

function slaSummary(row) {
  const t = String(row.deliveryType || "NEXT_DAY").toUpperCase();
  if (t === "HOURS") return `Within ${row.deliveredWithinHours ?? "?"}h`;
  if (row.deliveryTime) return `Next day · by ${row.deliveryTime}`;
  return "Next day";
}

/* ─── Main page ───────────────────────────────────────────────────────────── */

export default function Hubs() {
  const nav = useNavigate();
  const [hs, setHs] = useState([]);
  const [zones, setZones] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState(null);
  const [deleting, setDeleting] = useState(null);

  async function load() {
    try {
      const r = await api.get("/hubs");
      setHs(r.data?.hubs ?? []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load hubs");
    }
  }

  useEffect(() => { api.get("/zones").then(r => setZones(r.data?.zones ?? [])); }, []);
  useEffect(() => { load(); }, []);

  const filtered = hs.filter(h =>
    (zoneFilter === "ALL" || String(h.zone_id) === String(zoneFilter)) &&
    (statusFilter === "ALL" || h.status === statusFilter)
  );

  async function toggle(h) {
    const ns = h.status === "FULLY_OPERATIONAL" ? "HUB_OFF" : "FULLY_OPERATIONAL";
    await api.patch(`/hubs/${h.id}`, { status: ns });
    toast.success("Updated");
    load();
  }

  async function confirmDelete(h) {
    try {
      await api.delete(`/hubs/${h.id}`);
      toast.success(`Hub "${h.name}" deleted`);
      setDeleting(null);
      if (expandedId === h.id) setExpandedId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
      setDeleting(null);
    }
  }

  const statusMeta = {
    FULLY_OPERATIONAL: { label: "Operational",     cls: "pill-green" },
    CROSS_CITY_ONLY:   { label: "Cross-city only", cls: "pill-amber" },
    HUB_OFF:           { label: "Off",             cls: "pill-red"   },
  };

  return (
    <div data-testid="hubs-page">
      <PageHeader
        title="Hubs"
        subtitle="Physical depots & dispatch SLA slots"
        actions={
          <button onClick={() => nav("/hubs/new")} className="btn-primary" data-testid="add-hub-btn">
            <Plus size={15} /> Add Hub
          </button>
        }
      />

      {/* Filters */}
      <div className="surface p-3 mb-4 flex gap-2 items-center" data-testid="hubs-filter">
        <select
          value={zoneFilter}
          onChange={e => setZoneFilter(e.target.value)}
          className="h-9 text-sm border border-[var(--border-default)] rounded px-2 bg-white"
          data-testid="hub-zone-filter"
        >
          <option value="ALL">All zones</option>
          {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="h-9 text-sm border border-[var(--border-default)] rounded px-2 bg-white"
          data-testid="hub-status-filter"
        >
          {["ALL", "FULLY_OPERATIONAL", "CROSS_CITY_ONLY", "HUB_OFF"].map(s => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Hub table */}
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th style={{ width: 32 }}></th>
              <th>Hub</th>
              <th>City</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(h => {
              const meta = statusMeta[h.status] || { label: h.status, cls: "pill-slate" };
              const isExpanded = expandedId === h.id;
              return (
                <React.Fragment key={h.id}>
                  <tr data-testid={`hub-row-${h.id}`} className={isExpanded ? "bg-slate-50" : ""}>
                    {/* Expand chevron */}
                    <td className="px-3">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : h.id)}
                        className={`w-6 h-6 flex items-center justify-center rounded transition-all text-slate-400 hover:text-slate-600 hover:bg-slate-100 ${isExpanded ? "bg-slate-200 text-slate-600" : ""}`}
                        data-testid={`hub-expand-${h.id}`}
                      >
                        <ChevronDown size={14} className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                    </td>

                    {/* Hub name */}
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                          <Building2 size={15} />
                        </span>
                        <span className="font-semibold">{h.name}</span>
                      </div>
                    </td>

                    <td className="text-[var(--text-secondary)]">{h.city}</td>

                    <td>
                      <span className={`pill ${meta.cls}`}><span className="dot" />{meta.label}</span>
                    </td>

                    {/* Actions */}
                    <td>
                      <div className="flex gap-1">
                        <button onClick={() => nav(`/hubs/${h.id}/edit`)} className="chip" data-testid={`edit-hub-${h.id}`}>
                          <Pencil size={11} /> Edit
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : h.id)}
                          className={`chip ${isExpanded ? "chip-active" : ""}`}
                          data-testid={`edit-slots-${h.id}`}
                        >
                          <SlidersHorizontal size={11} /> SLA
                        </button>
                        <button onClick={() => toggle(h)} className="chip" data-testid={`toggle-hub-${h.id}`}>
                          <Power size={11} /> Toggle
                        </button>
                        <button onClick={() => setDeleting(h)} className="chip chip-danger" data-testid={`delete-hub-${h.id}`}>
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Inline SLA panel */}
                  {isExpanded && (
                    <tr data-testid={`sla-panel-${h.id}`}>
                      <td colSpan={5} className="p-0 border-b border-[var(--border-default)]">
                        <HubSlaPanel hub={h} zones={zones} onCollapse={() => setExpandedId(null)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="empty">No hubs found for selected filters</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete confirmation */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="surface w-[420px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </span>
              <h3 className="text-base font-semibold" style={{ fontFamily: "Outfit" }}>Delete hub?</h3>
            </div>
            <p className="text-sm text-zinc-600 mb-1">
              You are about to permanently delete <span className="font-semibold">{deleting.name}</span>.
            </p>
            <p className="text-xs text-zinc-400 mb-5">
              This will fail if any orders are currently in progress at this hub.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => confirmDelete(deleting)} className="btn-danger" data-testid="confirm-delete-hub">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Inline SLA list panel ───────────────────────────────────────────────── */

function HubSlaPanel({ hub, zones, onCollapse }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [zoneFilter, setZoneFilter] = useState("ALL");
  const [dialog, setDialog] = useState(null);    // null | "new" | <row object>
  const [deletingSla, setDeletingSla] = useState(null); // null | <row object>

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/hub-corridor-sla", { params: { hubId: hub.id } });
      setRows(r.data?.slas ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [hub.id]);

  async function confirmDeleteSla(row) {
    try {
      await api.delete(`/hub-corridor-sla/${row.id}`);
      toast.success("SLA deleted");
      setDeletingSla(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
      setDeletingSla(null);
    }
  }

  const zoneName = (id) => zones.find(z => String(z.id) === String(id))?.name || `Zone #${id}`;

  const usedZoneIds = [...new Set(rows.map(r => String(r.destinationZoneId)))];
  const filteredRows = zoneFilter === "ALL"
    ? rows
    : rows.filter(r => String(r.destinationZoneId) === zoneFilter);

  return (
    <>
      <div className="bg-slate-50 border-t border-[var(--border-default)]">
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={15} className="text-slate-500" />
            <span className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>
              Delivery SLAs
            </span>
            <span className="pill pill-slate">{rows.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Destination zone filter */}
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="h-8 text-sm border border-[var(--border-default)] rounded px-2 bg-white"
            >
              <option value="ALL">All destinations</option>
              {usedZoneIds.map(id => (
                <option key={id} value={id}>{zoneName(id)}</option>
              ))}
            </select>
            <button
              onClick={() => setDialog("new")}
              className="btn-primary py-1.5 px-3 text-xs"
              data-testid="add-sla-btn"
            >
              <Plus size={13} /> Add SLA
            </button>
            <button
              onClick={onCollapse}
              className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-slate-200 transition-colors text-slate-400"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* SLA list */}
        <div className="px-6 py-4">
          {loading ? (
            <div className="py-6 text-center text-sm text-slate-400">Loading…</div>
          ) : filteredRows.length > 0 ? (
            <div className="space-y-2">
              {filteredRows.map(row => {
                const t = String(row.deliveryType || "NEXT_DAY").toUpperCase();
                const meta = TYPE_META[t] || TYPE_META.NEXT_DAY;
                const { Icon } = meta;
                return (
                  <div
                    key={row.id}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg border border-l-4 ${meta.accent} border-[var(--border-default)] bg-white hover:bg-slate-50/80 transition-colors`}
                    data-testid={`sla-row-${row.id}`}
                  >
                    {/* Priority */}
                    <div className="flex items-center gap-1 shrink-0 w-10">
                      <Zap size={11} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-600">{row.priority}</span>
                    </div>

                    {/* Zone */}
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="text-sm font-semibold truncate">{zoneName(row.destinationZoneId)}</span>
                    </div>

                    {/* Type badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${meta.badge}`}>
                      <Icon size={11} />
                      {meta.label}
                    </span>

                    {/* Cutoff */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <AlarmClock size={13} className="text-slate-400" />
                      <span className="text-xs font-mono font-semibold text-slate-600">{row.cutoffTime || "—"}</span>
                    </div>

                    {/* Promise */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <ArrowRight size={13} className="text-slate-400" />
                      <span className="text-sm text-slate-600">{slaSummary(row)}</span>
                    </div>

                    {/* Active */}
                    <div className="shrink-0">
                      {row.isActive
                        ? <span className="pill pill-green"><CheckCircle2 size={10} /> Active</span>
                        : <span className="pill pill-slate"><XCircle size={10} /> Off</span>
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => setDialog(row)}
                        className="chip"
                        data-testid={`sla-edit-${row.id}`}
                      >
                        <Pencil size={10} /> Edit
                      </button>
                      <button
                        onClick={() => setDeletingSla(row)}
                        className="chip chip-danger"
                        data-testid={`sla-delete-${row.id}`}
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-dashed border-[var(--border-default)] bg-white text-center">
              <SlidersHorizontal size={28} className="text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-400">
                {zoneFilter === "ALL" ? "No SLAs configured yet" : "No SLAs for this destination"}
              </p>
              {zoneFilter !== "ALL" ? (
                <button onClick={() => setZoneFilter("ALL")} className="text-xs text-[var(--brand-red)] mt-1 hover:underline">
                  Show all zones
                </button>
              ) : (
                <button onClick={() => setDialog("new")} className="text-xs text-[var(--brand-red)] mt-1 hover:underline">
                  Add the first SLA
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete SLA confirmation */}
      {deletingSla && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="surface w-[400px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </span>
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: "Outfit" }}>Delete SLA?</h3>
                <p className="text-xs text-slate-400 mt-0.5">{hub.name} · {hub.city}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 mb-1">
              This will permanently remove the{" "}
              <span className="font-semibold">{deletingSla.deliveryType}</span> SLA for{" "}
              <span className="font-semibold">{zoneName(deletingSla.destinationZoneId)}</span>.
            </p>
            <p className="text-xs text-zinc-400 mb-5">This action cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeletingSla(null)} className="btn-secondary">Cancel</button>
              <button onClick={() => confirmDeleteSla(deletingSla)} className="btn-danger" data-testid="confirm-delete-sla">
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit dialog */}
      {dialog !== null && (
        <SlaFormDialog
          hub={hub}
          zones={zones}
          existingRows={rows}
          editingRow={dialog === "new" ? null : dialog}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load(); }}
        />
      )}
    </>
  );
}

/* ─── SLA add / edit dialog ───────────────────────────────────────────────── */

function SlaFormDialog({ hub, zones, existingRows, editingRow, onClose, onSaved }) {
  const isEdit = editingRow !== null;

  const [form, setForm] = useState(() =>
    isEdit
      ? {
          hubId: hub.id,
          destinationZoneId: String(editingRow.destinationZoneId ?? ""),
          deliveryType: String(editingRow.deliveryType || "NEXT_DAY").toUpperCase(),
          cutoffTime: editingRow.cutoffTime ?? "",
          deliveryTime: editingRow.deliveryTime ?? "",
          deliveredWithinHours: editingRow.deliveredWithinHours != null ? String(editingRow.deliveredWithinHours) : "",
          priority: editingRow.priority != null ? String(editingRow.priority) : "1",
          isActive: Boolean(editingRow.isActive),
        }
      : EMPTY_SLA(hub.id)
  );
  const [saving, setSaving] = useState(false);

  /* Auto-compute next priority when zone changes in add mode */
  useEffect(() => {
    if (isEdit) return;
    if (!form.destinationZoneId) return;
    const forZone = existingRows.filter(r => String(r.destinationZoneId) === String(form.destinationZoneId));
    const next = forZone.length === 0 ? 1 : Math.max(...forZone.map(r => r.priority ?? 0)) + 1;
    setForm(cur => ({ ...cur, priority: String(next) }));
  }, [form.destinationZoneId, existingRows, isEdit]);

  function set(k, v) { setForm(cur => ({ ...cur, [k]: v })); }

  async function save() {
    const destinationZoneId = parseInt(form.destinationZoneId, 10);
    if (Number.isNaN(destinationZoneId)) return toast.error("Select a destination zone");
    if (!form.cutoffTime.trim()) return toast.error("Cutoff time is required");
    if (form.deliveryType === "NEXT_DAY" && !form.deliveryTime.trim()) return toast.error("Delivery time is required for Next Day");
    if (form.deliveryType === "HOURS" && !form.deliveredWithinHours.trim()) return toast.error("Enter delivery hours");
    const priority = parseInt(form.priority, 10);
    const payload = {
      hubId: hub.id,
      destinationZoneId,
      deliveryType: form.deliveryType,
      cutoffTime: form.cutoffTime.trim(),
      deliveryTime: form.deliveryType === "NEXT_DAY" && form.deliveryTime.trim() ? form.deliveryTime.trim() : null,
      deliveredWithinHours: form.deliveryType === "HOURS" && form.deliveredWithinHours.trim()
        ? parseInt(form.deliveredWithinHours, 10) : null,
      priority: Number.isNaN(priority) ? 1 : priority,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (isEdit) {
        await api.patch(`/hub-corridor-sla/${editingRow.id}`, payload);
        toast.success("SLA updated");
      } else {
        await api.post("/hub-corridor-sla", payload);
        toast.success("SLA added");
      }
      onSaved();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save SLA");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-testid="sla-dialog">
      <div className="surface w-full max-w-[580px] flex flex-col">

        {/* Dialog header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <SlidersHorizontal size={17} className="text-slate-600" />
            </span>
            <div>
              <h3 className="text-base font-semibold" style={{ fontFamily: "Outfit" }}>
                {isEdit ? "Edit SLA" : "Add SLA"}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1 mt-0.5">
                <Building2 size={11} className="shrink-0" />
                {hub.name} · {hub.city}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
            data-testid="sla-dialog-close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Dialog body */}
        <div className="p-6 space-y-5">
          {/* Delivery type toggle */}
          <div>
            <label className="label flex items-center gap-1.5 mb-2">
              <CalendarClock size={12} /> Delivery Type
            </label>
            <div className="flex gap-2">
              {Object.entries(TYPE_META).map(([value, meta]) => {
                const { Icon } = meta;
                const active = form.deliveryType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set("deliveryType", value)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                      active ? meta.btn : "bg-white border-[var(--border-default)] text-slate-500 hover:border-slate-300"
                    }`}
                    data-testid="sla-type"
                  >
                    <Icon size={15} />
                    {meta.label}
                    {active && <CheckCircle2 size={13} className="ml-1 opacity-70" />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Destination Zone */}
            <div className="col-span-2">
              <label className="label flex items-center gap-1.5">
                <MapPin size={11} /> Destination Zone
              </label>
              <select
                value={form.destinationZoneId}
                onChange={e => set("destinationZoneId", e.target.value)}
                className="input"
                data-testid="sla-zone"
              >
                <option value="">Select zone…</option>
                {zones.map(z => <option key={z.id} value={z.id}>{z.name} · {z.city}</option>)}
              </select>
            </div>

            {/* Cutoff */}
            <div>
              <label className="label flex items-center gap-1.5">
                <AlarmClock size={11} /> Cutoff Time
              </label>
              <input
                type="time"
                value={form.cutoffTime}
                onChange={e => set("cutoffTime", e.target.value)}
                className="input mono"
                data-testid="sla-cutoff"
              />
            </div>

            {/* Delivery time (NEXT_DAY) */}
            {form.deliveryType === "NEXT_DAY" && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <CalendarClock size={11} /> Delivery Time
                </label>
                <input
                  type="time"
                  value={form.deliveryTime}
                  onChange={e => set("deliveryTime", e.target.value)}
                  className="input mono"
                  data-testid="sla-delivery-time"
                />
              </div>
            )}

            {/* Within hours (HOURS) */}
            {form.deliveryType === "HOURS" && (
              <div>
                <label className="label flex items-center gap-1.5">
                  <Timer size={11} /> Within Hours
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.deliveredWithinHours}
                  onChange={e => set("deliveredWithinHours", e.target.value)}
                  className="input mono"
                  placeholder="e.g. 4"
                  data-testid="sla-hours"
                />
              </div>
            )}

            {/* Priority */}
            <div>
              <label className="label flex items-center gap-1.5">
                <Zap size={11} /> Priority
                {!isEdit && form.destinationZoneId && (
                  <span className="ml-auto text-[10px] font-normal normal-case text-slate-400 tracking-normal">auto</span>
                )}
              </label>
              <input
                type="number"
                min="1"
                value={form.priority}
                onChange={e => set("priority", e.target.value)}
                className="input mono"
                data-testid="sla-priority"
              />
            </div>

            {/* Status */}
            <div>
              <label className="label flex items-center gap-1.5">
                <CheckCircle2 size={11} /> Status
              </label>
              <button
                type="button"
                onClick={() => set("isActive", !form.isActive)}
                className={`w-full h-[38px] rounded-md border text-sm font-semibold flex items-center justify-center gap-2 transition-all ${
                  form.isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                    : "bg-zinc-50 text-zinc-500 border-zinc-300"
                }`}
              >
                {form.isActive
                  ? <><CheckCircle2 size={14} /> Active</>
                  : <><XCircle size={14} /> Inactive</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Dialog footer */}
        <div className="px-6 py-4 border-t border-[var(--border-default)] flex justify-end gap-2 bg-slate-50">
          <button onClick={onClose} className="btn-secondary" data-testid="sla-dialog-cancel">
            Cancel
          </button>
          <button onClick={save} disabled={saving} className="btn-primary" data-testid="sla-dialog-save">
            <Save size={14} /> {saving ? "Saving…" : isEdit ? "Save Changes" : "Add SLA"}
          </button>
        </div>
      </div>
    </div>
  );
}

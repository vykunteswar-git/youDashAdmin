import { useCallback, useEffect, useMemo, useState } from "react";
import { Bus, Plus, Pencil } from "lucide-react";
import { hubCorridorSlaService, unwrapList } from "../../services/apiService";

const emptyForm = (hubId, destinationZoneId = "") => ({
  hubId,
  destinationZoneId,
  slotLabel: "",
  cutoffTime: "",
  deliveryTime: "",
  deliveryDayOffset: "1",
  deliveryType: "NEXT_DAY",
  deliveredWithinHours: "",
  priority: "",
  isActive: true,
});

function zoneLabel(zones, id) {
  const z = zones.find((x) => Number(x.id) === Number(id));
  if (!z) return `Zone #${id}`;
  return [z.city, z.name].filter(Boolean).join(" — ");
}

function format12h(t) {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h)) return t;
  const ap = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`;
}

function summarizeSlot(s) {
  const label = s.slotLabel?.trim() ? `${s.slotLabel} · ` : "";
  const depart = format12h(s.cutoffTime);
  const t = String(s.deliveryType || "NEXT_DAY").toUpperCase();
  if (t === "HOURS") {
    return `${label}Depart ${depart} → within ${s.deliveredWithinHours ?? "?"}h`;
  }
  const offset = s.deliveryDayOffset != null ? Number(s.deliveryDayOffset) : 1;
  const arrive = format12h(s.deliveryTime);
  const day =
    offset === 0 ? "same day" : offset === 1 ? "next day" : `+${offset} days`;
  return `${label}Depart ${depart} → ${day} by ${arrive}`;
}

export default function HubCorridorSlaPanel({ hubId, hubZoneId, zones }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(hubId));
  const [saving, setSaving] = useState(false);

  const destZones = zones.filter(
    (z) => z.id != null && Number(z.id) !== Number(hubZoneId)
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await hubCorridorSlaService.list(hubId);
      setRows(unwrapList(res));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hubId]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const r of rows) {
      const key = String(r.destinationZoneId);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    for (const list of map.values()) {
      list.sort(
        (a, b) =>
          (a.priority ?? 0) - (b.priority ?? 0) ||
          String(a.cutoffTime).localeCompare(String(b.cutoffTime))
      );
    }
    return map;
  }, [rows]);

  const nextPriority = (destinationZoneId) => {
    const list = rows.filter(
      (r) => Number(r.destinationZoneId) === Number(destinationZoneId)
    );
    if (list.length === 0) return 1;
    return Math.max(...list.map((r) => Number(r.priority) || 0)) + 1;
  };

  const openCreate = (destinationZoneId) => {
    const dest = destinationZoneId ?? (destZones[0] ? String(destZones[0].id) : "");
    setEditingId(null);
    const f = emptyForm(hubId, dest);
    f.priority = String(nextPriority(dest));
    setForm(f);
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      hubId,
      destinationZoneId: String(row.destinationZoneId),
      slotLabel: row.slotLabel ?? "",
      cutoffTime: row.cutoffTime ?? "",
      deliveryTime: row.deliveryTime ?? "",
      deliveryDayOffset:
        row.deliveryDayOffset != null ? String(row.deliveryDayOffset) : "1",
      deliveryType: row.deliveryType || "NEXT_DAY",
      deliveredWithinHours:
        row.deliveredWithinHours != null ? String(row.deliveredWithinHours) : "",
      priority: row.priority != null ? String(row.priority) : "1",
      isActive: Boolean(row.isActive),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const destinationZoneId = parseInt(form.destinationZoneId, 10);
    if (Number.isNaN(destinationZoneId)) {
      window.alert("Select destination zone.");
      return;
    }
    if (!form.cutoffTime.trim()) {
      window.alert("Departure time is required (e.g. 03:00 for 3 AM bus).");
      return;
    }
    const priority =
      form.priority.trim() !== ""
        ? parseInt(form.priority, 10)
        : nextPriority(destinationZoneId);
    const payload = {
      hubId,
      destinationZoneId,
      slotLabel: form.slotLabel.trim() || null,
      deliveryType: form.deliveryType,
      cutoffTime: form.cutoffTime.trim(),
      deliveryTime:
        form.deliveryType === "NEXT_DAY" ? form.deliveryTime.trim() || null : null,
      deliveryDayOffset:
        form.deliveryType === "NEXT_DAY"
          ? parseInt(form.deliveryDayOffset, 10) || 1
          : null,
      deliveredWithinHours:
        form.deliveryType === "HOURS" && form.deliveredWithinHours.trim()
          ? parseInt(form.deliveredWithinHours, 10)
          : null,
      priority: Number.isNaN(priority) ? 1 : priority,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId != null) {
        await hubCorridorSlaService.update(editingId, payload);
      } else {
        await hubCorridorSlaService.create(payload);
      }
      await load();
      setFormOpen(false);
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mb-3 p-3 rounded-4 border bg-white">
      <div className="mb-2">
        <h6 className="fw-bold small mb-1 d-flex align-items-center gap-2">
          <Bus size={16} />
          Dispatch slots (buses / departures)
        </h6>
        <p className="text-muted mb-0" style={{ fontSize: 11 }}>
          Add multiple departures per destination (e.g. 3 AM, 12 PM, 6 PM). Each slot
          has its own handover deadline and delivery time. Price still uses Zone routes.
        </p>
      </div>

      {loading ? (
        <p className="small text-muted">Loading slots…</p>
      ) : grouped.size === 0 ? (
        <p className="small text-muted mb-2">
          No slots — zone route SLA applies, or add departures below.
        </p>
      ) : (
        Array.from(grouped.entries()).map(([destId, slots]) => (
          <div key={destId} className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <span className="small fw-semibold">{zoneLabel(zones, destId)}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3 py-0"
                onClick={() => openCreate(destId)}
              >
                <Plus size={12} className="me-1" />
                Slot
              </button>
            </div>
            <ul className="list-group list-group-flush border rounded-3">
              {slots.map((s) => (
                <li
                  key={s.id}
                  className="list-group-item py-2 px-2 d-flex justify-content-between align-items-start gap-2"
                >
                  <span className="small">{summarizeSlot(s)}</span>
                  <button
                    type="button"
                    className="btn btn-sm btn-light border-0"
                    onClick={() => openEdit(s)}
                  >
                    <Pencil size={12} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {destZones.length > 0 && grouped.size === 0 && !formOpen ? (
        <button
          type="button"
          className="btn btn-sm text-white border-0 rounded-3"
          style={{ backgroundColor: "#E51818" }}
          onClick={() => openCreate()}
        >
          <Plus size={14} className="me-1" />
          Add first dispatch slot
        </button>
      ) : null}

      {formOpen ? (
        <div className="border rounded-3 p-3 bg-light mt-2">
          <p className="small fw-semibold mb-2">
            {editingId != null ? "Edit slot" : "New dispatch slot"}
          </p>
          <div className="row g-2">
            <div className="col-12">
              <label className="form-label small mb-1">Destination zone</label>
              <select
                className="form-select form-select-sm rounded-3"
                value={form.destinationZoneId}
                onChange={(e) =>
                  setForm({
                    ...form,
                    destinationZoneId: e.target.value,
                    priority: String(nextPriority(e.target.value)),
                  })
                }
                disabled={editingId != null}
              >
                <option value="">Select…</option>
                {destZones.map((z) => (
                  <option key={z.id} value={String(z.id)}>
                    {zoneLabel(zones, z.id)}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-12">
              <label className="form-label small mb-1">Label (optional)</label>
              <input
                className="form-control form-control-sm rounded-3"
                placeholder="e.g. Morning bus, 3 AM line"
                value={form.slotLabel}
                onChange={(e) => setForm({ ...form, slotLabel: e.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1">Departure / handover by</label>
              <input
                type="time"
                className="form-control form-control-sm rounded-3"
                value={form.cutoffTime}
                onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })}
              />
            </div>
            <div className="col-6">
              <label className="form-label small mb-1">Type</label>
              <select
                className="form-select form-select-sm rounded-3"
                value={form.deliveryType}
                onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
              >
                <option value="NEXT_DAY">Scheduled arrival</option>
                <option value="HOURS">Within hours</option>
              </select>
            </div>
            {form.deliveryType === "NEXT_DAY" ? (
              <>
                <div className="col-6">
                  <label className="form-label small mb-1">Arrive by (time)</label>
                  <input
                    type="time"
                    className="form-control form-control-sm rounded-3"
                    value={form.deliveryTime}
                    onChange={(e) =>
                      setForm({ ...form, deliveryTime: e.target.value })
                    }
                  />
                </div>
                <div className="col-6">
                  <label className="form-label small mb-1">Arrival day</label>
                  <select
                    className="form-select form-select-sm rounded-3"
                    value={form.deliveryDayOffset}
                    onChange={(e) =>
                      setForm({ ...form, deliveryDayOffset: e.target.value })
                    }
                  >
                    <option value="0">Same day as departure</option>
                    <option value="1">Next day</option>
                    <option value="2">2 days after</option>
                  </select>
                </div>
              </>
            ) : (
              <div className="col-12">
                <label className="form-label small mb-1">Hours after departure</label>
                <input
                  type="number"
                  min="1"
                  className="form-control form-control-sm rounded-3"
                  value={form.deliveredWithinHours}
                  onChange={(e) =>
                    setForm({ ...form, deliveredWithinHours: e.target.value })
                  }
                />
              </div>
            )}
          </div>
          <div className="d-flex gap-2 mt-3">
            <button
              type="button"
              className="btn btn-sm btn-light flex-grow-1 rounded-3"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm text-white flex-grow-1 rounded-3 border-0"
              style={{ backgroundColor: "#E51818" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save slot"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

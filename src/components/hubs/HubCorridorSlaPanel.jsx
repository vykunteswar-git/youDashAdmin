import { useCallback, useEffect, useState } from "react";
import { Clock, Plus, Pencil } from "lucide-react";
import { hubCorridorSlaService, unwrapList } from "../../services/apiService";

const DELIVERY_TYPES = ["NEXT_DAY", "HOURS"];

const emptyForm = (hubId, destinationZoneId = "") => ({
  hubId,
  destinationZoneId,
  deliveryType: "NEXT_DAY",
  cutoffTime: "",
  deliveryTime: "",
  deliveredWithinHours: "",
  priority: "1",
  isActive: true,
});

function zoneLabel(zones, id) {
  const z = zones.find((x) => Number(x.id) === Number(id));
  if (!z) return `Zone #${id}`;
  return [z.city, z.name].filter(Boolean).join(" — ");
}

function summarizeSla(s) {
  const t = String(s.deliveryType || "").toUpperCase();
  if (t === "HOURS") {
    const h = s.deliveredWithinHours;
    return h != null ? `Within ${h}h` : "Hours";
  }
  const d = s.deliveryTime ? `by ${s.deliveryTime}` : "—";
  return `Next day ${d}`;
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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(hubId, destZones[0] ? String(destZones[0].id) : ""));
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      hubId,
      destinationZoneId: String(row.destinationZoneId),
      deliveryType: row.deliveryType || "NEXT_DAY",
      cutoffTime: row.cutoffTime ?? "",
      deliveryTime: row.deliveryTime ?? "",
      deliveredWithinHours:
        row.deliveredWithinHours != null ? String(row.deliveredWithinHours) : "",
      priority: row.priority != null ? String(row.priority) : "1",
      isActive: Boolean(row.isActive),
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    const destinationZoneId = parseInt(form.destinationZoneId, 10);
    const priority = parseInt(form.priority, 10);
    if (Number.isNaN(destinationZoneId)) {
      window.alert("Select destination zone.");
      return;
    }
    const payload = {
      hubId,
      destinationZoneId,
      deliveryType: form.deliveryType,
      cutoffTime: form.cutoffTime.trim() || null,
      deliveryTime: form.deliveryTime.trim() || null,
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
      <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
        <div>
          <h6 className="fw-bold small mb-1 d-flex align-items-center gap-2">
            <Clock size={16} />
            Per-corridor delivery (this hub)
          </h6>
          <p className="text-muted mb-0" style={{ fontSize: 11 }}>
            Override &quot;delivered by&quot; for each destination zone. Intake cutoff above
            still applies. Price uses Zone routes.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-sm text-white border-0 rounded-3 flex-shrink-0"
          style={{ backgroundColor: "#E51818" }}
          onClick={openCreate}
          disabled={destZones.length === 0}
        >
          <Plus size={14} />
        </button>
      </div>

      {loading ? (
        <p className="small text-muted mb-0">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="small text-muted mb-0">
          No overrides — zone route SLA applies for all corridors from this hub.
        </p>
      ) : (
        <ul className="list-group list-group-flush mb-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="list-group-item px-0 py-2 d-flex justify-content-between align-items-start gap-2"
            >
              <div className="small">
                <strong>{zoneLabel(zones, r.destinationZoneId)}</strong>
                <div className="text-muted">{summarizeSla(r)}</div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3"
                onClick={() => openEdit(r)}
              >
                <Pencil size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="border rounded-3 p-2 bg-light mt-2">
          <div className="mb-2">
            <label className="form-label small fw-semibold mb-1">To zone</label>
            <select
              className="form-select form-select-sm rounded-3"
              value={form.destinationZoneId}
              onChange={(e) =>
                setForm({ ...form, destinationZoneId: e.target.value })
              }
            >
              <option value="">Select…</option>
              {destZones.map((z) => (
                <option key={z.id} value={String(z.id)}>
                  {zoneLabel(zones, z.id)}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2">
            <label className="form-label small fw-semibold mb-1">Type</label>
            <select
              className="form-select form-select-sm rounded-3"
              value={form.deliveryType}
              onChange={(e) => setForm({ ...form, deliveryType: e.target.value })}
            >
              {DELIVERY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          {form.deliveryType === "NEXT_DAY" ? (
            <div className="mb-2">
              <label className="form-label small mb-1">Delivered by (time)</label>
              <input
                type="time"
                className="form-control form-control-sm rounded-3"
                value={form.deliveryTime}
                onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
              />
            </div>
          ) : (
            <div className="mb-2">
              <label className="form-label small mb-1">Within hours</label>
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
          <div className="d-flex gap-2 mt-2">
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
              {saving ? "…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

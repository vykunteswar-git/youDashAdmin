import { useCallback, useEffect, useState } from "react";
import { X, Plus, Pencil, Clock } from "lucide-react";
import { zoneRouteSlaService, unwrapList } from "../../services/apiService";

const DELIVERY_TYPES = ["NEXT_DAY", "HOURS"];

const emptyForm = (zoneRouteId) => ({
  zoneRouteId,
  deliveryType: "NEXT_DAY",
  cutoffTime: "",
  deliveryTime: "",
  deliveredWithinHours: "",
  priority: "1",
  isActive: true,
});

function summarizeSla(s) {
  const t = String(s.deliveryType || "").toUpperCase();
  if (t === "HOURS") {
    const h = s.deliveredWithinHours;
    return h != null ? `Within ${h}h` : "Hours";
  }
  const c = s.cutoffTime ? `corridor cutoff ${s.cutoffTime}` : "no corridor cutoff";
  const d = s.deliveryTime ? `by ${s.deliveryTime}` : "—";
  return `Next day · ${c} · ${d}`;
}

export default function ZoneRouteSlaPanel({ zoneRouteId, routeTitle, onClose }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(zoneRouteId));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await zoneRouteSlaService.list(zoneRouteId);
      setRows(unwrapList(res));
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load SLAs."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [zoneRouteId]);

  useEffect(() => {
    setForm(emptyForm(zoneRouteId));
    setEditingId(null);
    setFormOpen(false);
    load();
  }, [zoneRouteId, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(zoneRouteId));
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const t = String(row.deliveryType || "NEXT_DAY").toUpperCase();
    setForm({
      zoneRouteId,
      deliveryType: DELIVERY_TYPES.includes(t) ? t : "NEXT_DAY",
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
    const priority = parseInt(form.priority, 10);
    const payload = {
      zoneRouteId,
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
        await zoneRouteSlaService.update(editingId, payload);
      } else {
        await zoneRouteSlaService.create(payload);
      }
      await load();
      setFormOpen(false);
      setEditingId(null);
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card border-0 shadow-sm mt-4 p-4">
      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
        <div>
          <h6 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Clock size={18} />
            Corridor delivery promise
          </h6>
          <p className="text-muted small mb-0">{routeTitle}</p>
          <p className="text-muted small mb-0 mt-1">
            When parcels reach the origin hub in time. Set per-hub intake cutoffs on the{" "}
            <strong>Hubs</strong> page.
          </p>
        </div>
        <button type="button" className="btn btn-sm btn-light rounded-3" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger small rounded-3">{error}</div>
      ) : null}

      <div className="d-flex justify-content-between align-items-center mb-2">
        <span className="small text-muted">
          {loading ? "Loading…" : `${rows.length} SLA row(s)`}
        </span>
        <button
          type="button"
          className="btn btn-sm text-white rounded-3 border-0"
          style={{ backgroundColor: "#E51818" }}
          onClick={openCreate}
        >
          <Plus size={16} className="me-1" />
          Add SLA
        </button>
      </div>

      {rows.length === 0 && !loading ? (
        <p className="small text-muted mb-0">No corridor SLA yet — add next-day or hours promise.</p>
      ) : (
        <ul className="list-group list-group-flush mb-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="list-group-item px-0 d-flex justify-content-between align-items-center"
            >
              <span className="small">{summarizeSla(r)}</span>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary rounded-3"
                onClick={() => openEdit(r)}
              >
                <Pencil size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="border rounded-4 p-3 bg-light">
          <div className="mb-2">
            <label className="form-label small fw-semibold">Type</label>
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
            <>
              <div className="mb-2">
                <label className="form-label small fw-semibold">
                  Corridor cutoff (optional, HH:mm)
                </label>
                <input
                  type="time"
                  className="form-control form-control-sm rounded-3"
                  value={form.cutoffTime}
                  onChange={(e) => setForm({ ...form, cutoffTime: e.target.value })}
                />
              </div>
              <div className="mb-2">
                <label className="form-label small fw-semibold">Delivered by (HH:mm)</label>
                <input
                  type="time"
                  className="form-control form-control-sm rounded-3"
                  value={form.deliveryTime}
                  onChange={(e) => setForm({ ...form, deliveryTime: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="mb-2">
              <label className="form-label small fw-semibold">Within hours</label>
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
          <div className="mb-2">
            <label className="form-label small fw-semibold">Priority</label>
            <input
              type="number"
              min="1"
              className="form-control form-control-sm rounded-3"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
            />
          </div>
          <div className="form-check form-switch mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            <label className="form-check-label small">Active</label>
          </div>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-sm btn-light rounded-3 flex-grow-1"
              onClick={() => setFormOpen(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-sm text-white rounded-3 flex-grow-1 border-0"
              style={{ backgroundColor: "#E51818" }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

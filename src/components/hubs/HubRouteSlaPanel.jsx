import { useCallback, useEffect, useState } from "react";
import { X, Plus, Pencil, Clock } from "lucide-react";
import {
  hubRouteSlaService,
  unwrapList,
} from "../../services/apiService";

const DELIVERY_TYPES = ["NEXT_DAY", "HOURS"];

const emptyForm = (hubRouteId) => ({
  hubRouteId,
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
  const c = s.cutoffTime ? `cutoff ${s.cutoffTime}` : "no cutoff";
  const d = s.deliveryTime ? `by ${s.deliveryTime}` : "—";
  return `Next day · ${c} · ${d}`;
}

export default function HubRouteSlaPanel({
  hubRouteId,
  routeTitle,
  onClose,
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(() => emptyForm(hubRouteId));
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hubRouteSlaService.list(hubRouteId);
      setRows(unwrapList(res));
    } catch (e) {
      setError(
        e?.response?.data?.message ||
          e?.message ||
          "Failed to load SLAs."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [hubRouteId]);

  useEffect(() => {
    setForm(emptyForm(hubRouteId));
    setEditingId(null);
    setFormOpen(false);
    load();
  }, [hubRouteId, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm(hubRouteId));
    setFormOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    const t = String(row.deliveryType || "NEXT_DAY").toUpperCase();
    setForm({
      hubRouteId,
      deliveryType: DELIVERY_TYPES.includes(t) ? t : "NEXT_DAY",
      cutoffTime: row.cutoffTime != null ? String(row.cutoffTime) : "",
      deliveryTime: row.deliveryTime != null ? String(row.deliveryTime) : "",
      deliveredWithinHours:
        row.deliveredWithinHours != null
          ? String(row.deliveredWithinHours)
          : "",
      priority:
        row.priority != null && row.priority !== ""
          ? String(row.priority)
          : "1",
      isActive: Boolean(row.isActive),
    });
    setFormOpen(true);
  };

  const buildPayload = () => {
    const priority = parseInt(String(form.priority).trim(), 10);
    if (!Number.isFinite(priority)) {
      throw new Error("Priority must be a valid number.");
    }
    const base = {
      hubRouteId,
      priority,
      isActive: Boolean(form.isActive),
    };
    const dtype = String(form.deliveryType || "").toUpperCase();
    if (dtype === "NEXT_DAY") {
      const deliveryTime = String(form.deliveryTime || "").trim();
      if (!deliveryTime) {
        throw new Error("NEXT_DAY requires a delivery time (e.g. 10:00).");
      }
      const out = {
        ...base,
        deliveryType: "NEXT_DAY",
        deliveryTime,
      };
      const co = String(form.cutoffTime || "").trim();
      if (co) out.cutoffTime = co;
      return out;
    }
    if (dtype === "HOURS") {
      const h = parseInt(String(form.deliveredWithinHours).trim(), 10);
      if (!Number.isFinite(h) || h <= 0) {
        throw new Error("HOURS requires delivered within hours greater than 0.");
      }
      return {
        ...base,
        deliveryType: "HOURS",
        deliveredWithinHours: h,
      };
    }
    throw new Error("Select a delivery type.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      window.alert(err.message || "Invalid form.");
      return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        await hubRouteSlaService.update(editingId, payload);
      } else {
        await hubRouteSlaService.create(payload);
      }
      setFormOpen(false);
      setEditingId(null);
      setForm(emptyForm(hubRouteId));
      await load();
    } catch (err) {
      window.alert(
        err?.response?.data?.message || err?.message || "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-card border-0 shadow-sm mt-4 border border-secondary border-opacity-10">
      <div className="p-3 p-md-4 border-bottom d-flex flex-wrap align-items-start justify-content-between gap-2">
        <div className="d-flex align-items-start gap-2">
          <div
            className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
            style={{ background: "rgba(229, 24, 24, 0.08)" }}
          >
            <Clock size={20} style={{ color: "#E51818" }} />
          </div>
          <div>
            <h5 className="fw-bold mb-0">Route SLAs</h5>
            <p className="text-muted small mb-0">{routeTitle}</p>
            <p className="text-muted mb-0" style={{ fontSize: 11 }}>
              Hub route ID {hubRouteId} · ordered by priority
            </p>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-sm text-white rounded-3 border-0 d-flex align-items-center gap-1"
            style={{ backgroundColor: "#E51818" }}
            onClick={openCreate}
          >
            <Plus size={16} />
            Add SLA
          </button>
          <button
            type="button"
            className="btn btn-sm btn-light border rounded-3"
            aria-label="Close SLA panel"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger rounded-0 border-0 mb-0" role="alert">
          {error}
        </div>
      )}

      {formOpen && (
        <div className="p-3 p-md-4 bg-light bg-opacity-50 border-bottom">
          <h6 className="fw-semibold mb-3">
            {editingId == null ? "New SLA rule" : `Edit SLA #${editingId}`}
          </h6>
          <form onSubmit={handleSubmit}>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold">
                  Delivery type
                </label>
                <select
                  className="form-select rounded-3"
                  value={form.deliveryType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, deliveryType: e.target.value }))
                  }
                  disabled={saving}
                >
                  {DELIVERY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t === "NEXT_DAY" ? "Next day (cutoff / delivery time)" : "Hours (fallback)"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small fw-semibold">Priority</label>
                <input
                  type="number"
                  className="form-control rounded-3"
                  min={1}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  disabled={saving}
                />
                <div className="form-text">Smaller number = higher priority (listed first).</div>
              </div>
              <div className="col-12 col-md-4 d-flex align-items-end">
                <div className="form-check form-switch mb-1">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="sla-active"
                    checked={form.isActive}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, isActive: e.target.checked }))
                    }
                    disabled={saving}
                  />
                  <label className="form-check-label" htmlFor="sla-active">
                    Active
                  </label>
                </div>
              </div>

              {form.deliveryType === "NEXT_DAY" && (
                <>
                  <div className="col-12 col-sm-6 col-md-4">
                    <label className="form-label small fw-semibold">
                      Cutoff time (optional)
                    </label>
                    <input
                      type="time"
                      className="form-control rounded-3"
                      value={timeInputValue(form.cutoffTime)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          cutoffTime: e.target.value || "",
                        }))
                      }
                      disabled={saving}
                    />
                    <div className="form-text">ISO local time, e.g. 15:00</div>
                  </div>
                  <div className="col-12 col-sm-6 col-md-4">
                    <label className="form-label small fw-semibold">
                      Delivery time <span className="text-danger">*</span>
                    </label>
                    <input
                      type="time"
                      className="form-control rounded-3"
                      value={timeInputValue(form.deliveryTime)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          deliveryTime: e.target.value || "",
                        }))
                      }
                      disabled={saving}
                      required
                    />
                  </div>
                </>
              )}

              {form.deliveryType === "HOURS" && (
                <div className="col-12 col-md-4">
                  <label className="form-label small fw-semibold">
                    Delivered within (hours) <span className="text-danger">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-control rounded-3"
                    min={1}
                    step={1}
                    value={form.deliveredWithinHours}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        deliveredWithinHours: e.target.value,
                      }))
                    }
                    placeholder="e.g. 48"
                    disabled={saving}
                  />
                </div>
              )}

              <div className="col-12 d-flex flex-wrap gap-2 justify-content-end pt-1">
                <button
                  type="button"
                  className="btn btn-light border rounded-3"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                    setForm(emptyForm(hubRouteId));
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white rounded-3 px-4 border-0"
                  style={{ backgroundColor: "#E51818" }}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save SLA"}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-hover mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th className="px-3 py-2 small">Priority</th>
              <th className="px-3 py-2 small">Type</th>
              <th className="px-3 py-2 small">Details</th>
              <th className="px-3 py-2 small">Active</th>
              <th className="px-3 py-2 small text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted small">
                  Loading SLAs…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-4 text-muted small">
                  No SLA rules yet. Add one to define cutoff and delivery expectations.
                </td>
              </tr>
            ) : (
              rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-3 py-2 fw-semibold">{s.priority ?? "—"}</td>
                  <td className="px-3 py-2">
                    <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                      {s.deliveryType ?? "—"}
                    </span>
                  </td>
                  <td className="px-3 py-2 small text-muted">
                    {summarizeSla(s)}
                  </td>
                  <td className="px-3 py-2">
                    {s.isActive ? (
                      <span className="badge bg-success bg-opacity-10 text-success rounded-pill">
                        Yes
                      </span>
                    ) : (
                      <span className="badge bg-secondary bg-opacity-10 text-secondary rounded-pill">
                        No
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-end">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border rounded-2"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil size={14} className="me-1" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Map API "HH:mm" or "HH:mm:ss" to HTML time input value (HH:mm). */
function timeInputValue(raw) {
  if (raw == null || String(raw).trim() === "") return "";
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!m) return "";
  const h = m[1].padStart(2, "0");
  const min = m[2];
  return `${h}:${min}`;
}

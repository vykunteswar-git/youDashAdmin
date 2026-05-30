import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Route,
  Plus,
  Pencil,
  X,
  RefreshCw,
  ArrowRight,
  Clock,
  Info,
} from "lucide-react";
import {
  zoneRouteService,
  zoneService,
  unwrapList,
} from "../services/apiService";
import ZoneRouteSlaPanel from "../components/coverage/ZoneRouteSlaPanel";

const defaultForm = () => ({
  originZoneId: "",
  destinationZoneId: "",
  ratePerKm: "",
  isActive: true,
});

function zoneLabel(zones, id) {
  const z = zones.find((x) => Number(x.id) === Number(id));
  if (!z) return `#${id}`;
  const city = z.city?.trim();
  const name = z.name?.trim();
  if (city && name) return `${city} — ${name}`;
  return city || name || `#${id}`;
}

const ZoneRoutes = () => {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [slaRouteId, setSlaRouteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [routeRes, zoneRes] = await Promise.all([
        zoneRouteService.list(),
        zoneService.list(),
      ]);
      setRows(unwrapList(routeRes));
      setZones(unwrapList(zoneRes));
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load zone routes."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!editorOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editorOpen]);

  const slaRouteRow = useMemo(
    () => (slaRouteId == null ? null : rows.find((x) => x.id === slaRouteId) ?? null),
    [slaRouteId, rows]
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setEditorOpen(true);
  };

  const openEdit = (r) => {
    setEditingId(r.id);
    setForm({
      originZoneId: r.originZoneId != null ? String(r.originZoneId) : "",
      destinationZoneId:
        r.destinationZoneId != null ? String(r.destinationZoneId) : "",
      ratePerKm: r.ratePerKm != null ? String(r.ratePerKm) : "",
      isActive: Boolean(r.isActive),
    });
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(defaultForm());
  };

  const handleSubmit = async () => {
    const originZoneId = parseInt(form.originZoneId, 10);
    const destinationZoneId = parseInt(form.destinationZoneId, 10);
    const ratePerKm = parseFloat(form.ratePerKm);
    if (Number.isNaN(originZoneId) || Number.isNaN(destinationZoneId)) {
      window.alert("Select origin and destination zones.");
      return;
    }
    if (originZoneId === destinationZoneId) {
      window.alert("Zones must differ.");
      return;
    }
    if (Number.isNaN(ratePerKm) || ratePerKm <= 0) {
      window.alert("Enter a valid rate per km.");
      return;
    }
    const payload = {
      originZoneId,
      destinationZoneId,
      ratePerKm,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId != null) {
        await zoneRouteService.update(editingId, payload);
      } else {
        await zoneRouteService.create(payload);
      }
      await load();
      closeEditor();
    } catch (e) {
      window.alert(e?.response?.data?.message || e?.message || "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Zone routes</h2>
          <p className="text-muted small mb-0" style={{ maxWidth: 640 }}>
            One price corridor per city pair (e.g. VSKP → Hyderabad). Any active hub in
            each zone uses this rate unless a specific hub-route override exists.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            type="button"
            className="btn text-white rounded-3 d-flex align-items-center gap-2 px-4 shadow-sm border-0"
            style={{ backgroundColor: "#E51818" }}
            onClick={openCreate}
          >
            <Plus size={18} />
            Add corridor
          </button>
        </div>
      </div>

      <div
        className="alert alert-light border rounded-4 small d-flex gap-2 align-items-start mb-4"
        role="note"
      >
        <Info size={18} className="text-primary flex-shrink-0 mt-1" />
        <div>
          <strong>Price vs timing</strong>
          <ul className="mb-0 ps-3 mt-1">
            <li>
              <strong>Here:</strong> hub-to-hub ₹/km + corridor delivery promise (SLA).
            </li>
            <li>
              <Link to="/hubs">Hubs</Link>: last intake time per warehouse (e.g. Hub A 2 PM,
              Hub B 5 PM).
            </li>
            <li>
              <Link to="/app-config">App config</Link>: default ₹/km when no corridor is set.
            </li>
            <li>
              Optional <Link to="/hub-route-overrides">hub-pair overrides</Link> win on
              price for one origin hub → one destination hub only.
            </li>
          </ul>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 border-0 d-flex justify-content-between">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={load}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="dashboard-card p-0 border-0 overflow-hidden shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 small text-muted border-0">CORRIDOR</th>
                <th className="px-3 py-3 small text-muted border-0">₹ / KM</th>
                <th className="px-3 py-3 small text-muted border-0">ACTIVE</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted small">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted small">
                    No zone routes yet. Add a corridor or rely on app default rate.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-2 small fw-semibold">
                        <Route size={16} className="text-danger" />
                        <span>{zoneLabel(zones, r.originZoneId)}</span>
                        <ArrowRight size={14} className="text-muted" />
                        <span>{zoneLabel(zones, r.destinationZoneId)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-0 fw-bold">
                      ₹{r.ratePerKm != null ? Number(r.ratePerKm).toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-3 border-0">
                      <span
                        className={`badge rounded-pill ${
                          r.isActive
                            ? "bg-success bg-opacity-10 text-success"
                            : "bg-secondary bg-opacity-10 text-secondary"
                        }`}
                      >
                        {r.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-0 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary rounded-3 me-1"
                        onClick={() =>
                          setSlaRouteId((cur) => (cur === r.id ? null : r.id))
                        }
                      >
                        <Clock size={16} className="me-1" />
                        SLA
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light rounded-3"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {slaRouteId != null && slaRouteRow && (
        <ZoneRouteSlaPanel
          zoneRouteId={slaRouteId}
          routeTitle={`${zoneLabel(zones, slaRouteRow.originZoneId)} → ${zoneLabel(
            zones,
            slaRouteRow.destinationZoneId
          )}`}
          onClose={() => setSlaRouteId(null)}
        />
      )}

      {editorOpen &&
        createPortal(
          <div
            className="position-fixed d-flex align-items-center justify-content-center"
            style={{
              zIndex: 2000,
              inset: 0,
              background: "rgba(15,23,42,0.45)",
            }}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-4 shadow-lg p-4 w-100 mx-3"
              style={{ maxWidth: 440 }}
            >
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5 className="fw-bold mb-0">
                  {editingId != null ? "Edit corridor" : "New zone corridor"}
                </h5>
                <button type="button" className="btn btn-light btn-sm rounded-3" onClick={closeEditor}>
                  <X size={18} />
                </button>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">From zone</label>
                <select
                  className="form-select rounded-3 border-0 bg-light"
                  value={form.originZoneId}
                  onChange={(e) => setForm({ ...form, originZoneId: e.target.value })}
                >
                  <option value="">Select…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {zoneLabel(zones, z.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">To zone</label>
                <select
                  className="form-select rounded-3 border-0 bg-light"
                  value={form.destinationZoneId}
                  onChange={(e) =>
                    setForm({ ...form, destinationZoneId: e.target.value })
                  }
                >
                  <option value="">Select…</option>
                  {zones.map((z) => (
                    <option key={z.id} value={String(z.id)}>
                      {zoneLabel(zones, z.id)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label small fw-semibold">Rate per km (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control rounded-3 border-0 bg-light"
                  value={form.ratePerKm}
                  onChange={(e) => setForm({ ...form, ratePerKm: e.target.value })}
                />
              </div>
              <div className="form-check form-switch mb-4">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <label className="form-check-label small">Active</label>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light flex-grow-1 rounded-3" onClick={closeEditor}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn text-white flex-grow-1 rounded-3 border-0"
                  style={{ backgroundColor: "#E51818" }}
                  onClick={handleSubmit}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default ZoneRoutes;

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Route,
  Plus,
  Pencil,
  X,
  RefreshCw,
  ArrowRight,
  Clock,
} from "lucide-react";
import { hubRouteService, hubService, unwrapList } from "../services/apiService";
import HubRouteMapView from "../components/hubs/HubRouteMapView";
import HubRouteSlaPanel from "../components/hubs/HubRouteSlaPanel";

const defaultForm = () => ({
  originHubId: "",
  destinationHubId: "",
  ratePerKm: "",
  isActive: true,
});

const HubRoutes = () => {
  const [rows, setRows] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [slaRouteId, setSlaRouteId] = useState(null);

  const loadHubs = useCallback(async () => {
    try {
      const res = await hubService.list();
      setHubs(unwrapList(res));
    } catch {
      setHubs([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hubRouteService.list();
      setRows(unwrapList(res));
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to load hub routes."
      );
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadHubs();
  }, [load, loadHubs]);

  useEffect(() => {
    if (!editorOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editorOpen]);

  const hubLabel = (id) => {
    const h = hubs.find((x) => x.id === id);
    return h ? `${h.name} (#${id})` : `#${id}`;
  };

  const originHub = useMemo(() => {
    const id = parseInt(form.originHubId, 10);
    if (Number.isNaN(id)) return null;
    return hubs.find((h) => h.id === id) ?? null;
  }, [form.originHubId, hubs]);

  const destinationHub = useMemo(() => {
    const id = parseInt(form.destinationHubId, 10);
    if (Number.isNaN(id)) return null;
    return hubs.find((h) => h.id === id) ?? null;
  }, [form.destinationHubId, hubs]);

  const slaRouteRow = useMemo(
    () =>
      slaRouteId == null ? null : rows.find((x) => x.id === slaRouteId) ?? null,
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
      originHubId:
        r.originHubId != null ? String(r.originHubId) : "",
      destinationHubId:
        r.destinationHubId != null ? String(r.destinationHubId) : "",
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
    const originHubId = parseInt(form.originHubId, 10);
    const destinationHubId = parseInt(form.destinationHubId, 10);
    const ratePerKm = parseFloat(form.ratePerKm);
    if (Number.isNaN(originHubId) || Number.isNaN(destinationHubId)) {
      window.alert("Select origin and destination hubs.");
      return;
    }
    if (originHubId === destinationHubId) {
      window.alert("Origin and destination must differ.");
      return;
    }
    if (Number.isNaN(ratePerKm) || ratePerKm < 0) {
      window.alert("Enter a valid rate per km.");
      return;
    }
    const payload = {
      originHubId,
      destinationHubId,
      ratePerKm,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId != null) {
        await hubRouteService.update(editingId, payload);
      } else {
        await hubRouteService.create(payload);
      }
      await load();
      closeEditor();
    } catch (e) {
      window.alert(
        e?.response?.data?.message || e?.message || "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Hub routes</h2>
          <p className="text-muted small mb-0">
            Connect hubs with a rate per km. Map shows origin (green) and
            destination (red).
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
            onClick={() => {
              load();
              loadHubs();
            }}
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
            Add route
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 border-0 d-flex justify-content-between align-items-center">
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
                <th className="px-4 py-3 small text-muted border-0">ROUTE</th>
                <th className="px-3 py-3 small text-muted border-0">RATE / KM</th>
                <th className="px-3 py-3 small text-muted border-0">ACTIVE</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted small">
                    Loading routes…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted small">
                    No hub routes yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <div
                          className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                          style={{ background: "rgba(229, 24, 24, 0.08)" }}
                        >
                          <Route size={18} style={{ color: "#E51818" }} />
                        </div>
                        <div className="d-flex align-items-center gap-2 small fw-semibold">
                          <span>{hubLabel(r.originHubId)}</span>
                          <ArrowRight size={16} className="text-muted" />
                          <span>{hubLabel(r.destinationHubId)}</span>
                        </div>
                      </div>
                      <p className="mb-0 text-muted mt-1" style={{ fontSize: 11 }}>
                        Route ID {r.id}
                      </p>
                    </td>
                    <td className="px-3 py-3 border-0 fw-bold">
                      ₹{r.ratePerKm != null ? Number(r.ratePerKm).toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-3 border-0">
                      <span
                        className={`badge rounded-pill ${
                          r.isActive ? "bg-success bg-opacity-10 text-success" : "bg-secondary bg-opacity-10 text-secondary"
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
                        title="Delivery SLAs for this route"
                      >
                        <Clock size={16} className="me-1" />
                        SLAs
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-light rounded-3"
                        onClick={() => openEdit(r)}
                      >
                        <Pencil size={16} className="me-1" />
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

      {slaRouteId != null && slaRouteRow && (
        <HubRouteSlaPanel
          hubRouteId={slaRouteId}
          routeTitle={`${hubLabel(slaRouteRow.originHubId)} → ${hubLabel(
            slaRouteRow.destinationHubId
          )}`}
          onClose={() => setSlaRouteId(null)}
        />
      )}

      {editorOpen &&
        createPortal(
          <div
            className="position-fixed zone-editor-overlay d-flex flex-column overflow-hidden bg-white"
            style={{
              zIndex: 2000,
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100vw",
              height: "100dvh",
              maxHeight: "100dvh",
              margin: 0,
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-route-editor-title"
          >
            <div className="flex-shrink-0 border-bottom bg-white px-3 py-3 px-md-4 d-flex align-items-center justify-content-between gap-3 shadow-sm">
              <div>
                <h5 className="fw-bold mb-0" id="hub-route-editor-title">
                  {editingId != null ? "Edit hub route" : "New hub route"}
                </h5>
                <p className="text-muted small mb-0 d-none d-sm-block">
                  Map preview on the left — form on the right.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
                onClick={closeEditor}
                disabled={saving}
              >
                <X size={20} />
                <span className="d-none d-sm-inline">Close</span>
              </button>
            </div>

            <div
              className="d-flex flex-column flex-lg-row w-100 min-h-0 overflow-hidden"
              style={{ flex: "1 1 0%", minHeight: 0 }}
            >
              <div className="d-flex flex-column min-h-0 border-bottom border-lg-0 border-lg-end position-relative bg-light zone-editor-map-col">
                <div
                  className="position-absolute top-0 start-0 p-2 p-md-3 z-2"
                  style={{ pointerEvents: "none", zIndex: 2 }}
                >
                  <span
                    className="badge rounded-pill px-3 py-2 bg-dark text-white shadow-sm"
                    style={{ pointerEvents: "auto" }}
                  >
                    Green = origin hub · Red = destination · line = route
                  </span>
                </div>
                <div className="flex-grow-1 min-h-0 w-100 h-100" style={{ minHeight: 0 }}>
                  <HubRouteMapView
                    originHub={originHub}
                    destinationHub={destinationHub}
                    visible={editorOpen}
                  />
                </div>
              </div>

              <div
                className="d-flex flex-column min-h-0 bg-white border-start-lg overflow-auto"
                style={{ flex: "1 1 42%", maxHeight: "100%" }}
              >
                <div
                  className="p-4 flex-grow-1"
                  style={{ maxWidth: 520, marginLeft: "auto", marginRight: "auto", width: "100%" }}
                >
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">Origin hub</label>
                    <select
                      className="form-select border-0 bg-light rounded-3"
                      value={form.originHubId}
                      onChange={(e) =>
                        setForm({ ...form, originHubId: e.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="">Select…</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          {h.name} (#{h.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Destination hub
                    </label>
                    <select
                      className="form-select border-0 bg-light rounded-3"
                      value={form.destinationHubId}
                      onChange={(e) =>
                        setForm({ ...form, destinationHubId: e.target.value })
                      }
                      disabled={saving}
                    >
                      <option value="">Select…</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={String(h.id)}>
                          {h.name} (#{h.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="form-label small fw-semibold">
                      Rate per km (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control border-0 bg-light rounded-3"
                      value={form.ratePerKm}
                      onChange={(e) =>
                        setForm({ ...form, ratePerKm: e.target.value })
                      }
                      disabled={saving}
                    />
                  </div>
                  <div className="form-check form-switch mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="hr-active"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      disabled={saving}
                    />
                    <label className="form-check-label small" htmlFor="hr-active">
                      Active
                    </label>
                  </div>

                  <div className="d-flex flex-column flex-sm-row gap-2 pt-2 border-top">
                    <button
                      type="button"
                      className="btn btn-light flex-grow-1 py-2 rounded-3 fw-semibold"
                      onClick={closeEditor}
                      disabled={saving}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn text-white flex-grow-1 py-2 rounded-3 fw-semibold border-0"
                      style={{ backgroundColor: "#E51818" }}
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      {saving ? (
                        <span className="spinner-border spinner-border-sm" />
                      ) : (
                        "Save route"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      <style>{`
        .zone-editor-map-col {
          flex: 1 1 58%;
          min-height: min(42vh, 360px);
        }
        @media (min-width: 992px) {
          .border-start-lg { border-left: 1px solid var(--bs-border-color, #dee2e6) !important; }
          .zone-editor-map-col {
            min-height: 0;
            flex: 1 1 58%;
          }
        }
      `}</style>
    </div>
  );
};

export default HubRoutes;

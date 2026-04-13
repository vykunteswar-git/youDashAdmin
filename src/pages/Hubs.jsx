import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Warehouse,
  Plus,
  Pencil,
  X,
  RefreshCw,
  MapPin,
  Crosshair,
} from "lucide-react";
import { hubService, zoneService, unwrapList } from "../services/apiService";
import HubLocationMapView from "../components/hubs/HubLocationMapView";

const HYDERABAD = { lat: 17.4065, lng: 78.4772 };

const defaultForm = () => ({
  name: "",
  city: "",
  lat: String(HYDERABAD.lat),
  lng: String(HYDERABAD.lng),
  zoneId: "",
  isActive: true,
});

const Hubs = () => {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [flyToToken, setFlyToToken] = useState(0);

  const loadZones = useCallback(async () => {
    try {
      const res = await zoneService.list();
      setZones(unwrapList(res));
    } catch {
      setZones([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await hubService.list();
      setRows(unwrapList(res));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load hubs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    loadZones();
  }, [load, loadZones]);

  useEffect(() => {
    if (!editorOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [editorOpen]);

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setFlyToToken(0);
    setEditorOpen(true);
  };

  const openEdit = (h) => {
    setEditingId(h.id);
    setForm({
      name: h.name ?? "",
      city: h.city ?? "",
      lat: h.lat != null ? String(h.lat) : String(HYDERABAD.lat),
      lng: h.lng != null ? String(h.lng) : String(HYDERABAD.lng),
      zoneId: h.zoneId != null ? String(h.zoneId) : "",
      isActive: Boolean(h.isActive),
    });
    setFlyToToken(0);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingId(null);
    setForm(defaultForm());
    setFlyToToken(0);
  };

  const handleHubPosition = useCallback((la, ln) => {
    setForm((f) => ({ ...f, lat: String(la), lng: String(ln) }));
  }, []);

  const handleSubmit = async () => {
    const lat = parseFloat(form.lat);
    const lng = parseFloat(form.lng);
    const zoneId = parseInt(form.zoneId, 10);
    if (!form.name.trim() || !form.city.trim()) {
      window.alert("Name and city are required.");
      return;
    }
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      window.alert("Valid latitude and longitude are required.");
      return;
    }
    if (Number.isNaN(zoneId)) {
      window.alert("Select a zone.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      city: form.city.trim(),
      lat,
      lng,
      zoneId,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId != null) {
        await hubService.update(editingId, payload);
      } else {
        await hubService.create(payload);
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

  const zoneName = (id) => {
    const z = zones.find((x) => x.id === id);
    return z ? z.name : `Zone #${id}`;
  };

  const mapLat = parseFloat(form.lat);
  const mapLng = parseFloat(form.lng);
  const mapLatNum = Number.isFinite(mapLat) ? mapLat : HYDERABAD.lat;
  const mapLngNum = Number.isFinite(mapLng) ? mapLng : HYDERABAD.lng;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Hubs</h2>
          <p className="text-muted small mb-0">
            Place hubs on the map (same layout as Zones). Linked to a zone.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
            onClick={() => {
              load();
              loadZones();
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
            Add hub
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
                <th className="px-4 py-3 small text-muted border-0">HUB</th>
                <th className="px-3 py-3 small text-muted border-0">CITY</th>
                <th className="px-3 py-3 small text-muted border-0">LOCATION</th>
                <th className="px-3 py-3 small text-muted border-0">ZONE</th>
                <th className="px-3 py-3 small text-muted border-0">ACTIVE</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    Loading hubs…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-5 text-muted small">
                    No hubs yet.
                  </td>
                </tr>
              ) : (
                rows.map((h) => (
                  <tr key={h.id}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                          style={{ background: "rgba(229, 24, 24, 0.08)" }}
                        >
                          <Warehouse size={18} style={{ color: "#E51818" }} />
                        </div>
                        <div>
                          <p className="mb-0 fw-bold small">{h.name ?? "—"}</p>
                          <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                            ID {h.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-0 small">{h.city ?? "—"}</td>
                    <td className="px-3 py-3 border-0 small font-monospace text-muted">
                      {h.lat != null && h.lng != null
                        ? `${Number(h.lat).toFixed(5)}, ${Number(h.lng).toFixed(5)}`
                        : "—"}
                    </td>
                    <td className="px-3 py-3 border-0 small">
                      {h.zoneId != null ? (
                        <>
                          {zoneName(h.zoneId)}
                          <span className="text-muted"> (#{h.zoneId})</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-3 border-0">
                      <span
                        className={`badge rounded-pill ${
                          h.isActive ? "bg-success bg-opacity-10 text-success" : "bg-secondary bg-opacity-10 text-secondary"
                        }`}
                      >
                        {h.isActive ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-0 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light rounded-3"
                        onClick={() => openEdit(h)}
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
            aria-labelledby="hub-editor-title"
          >
            <div className="flex-shrink-0 border-bottom bg-white px-3 py-3 px-md-4 d-flex align-items-center justify-content-between gap-3 shadow-sm">
              <div>
                <h5 className="fw-bold mb-0" id="hub-editor-title">
                  {editingId != null ? "Edit hub" : "New hub"}
                </h5>
                <p className="text-muted small mb-0 d-none d-sm-block">
                  Map on the left — click or drag the pin to set location.
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
                    Click map or drag pin to set the hub location
                  </span>
                </div>
                <div className="flex-grow-1 min-h-0 w-100 h-100" style={{ minHeight: 0 }}>
                  <HubLocationMapView
                    lat={mapLatNum}
                    lng={mapLngNum}
                    onPositionChange={handleHubPosition}
                    visible={editorOpen}
                    flyToToken={flyToToken}
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
                    <label className="form-label small fw-semibold">Name</label>
                    <input
                      className="form-control border-0 bg-light rounded-3"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      disabled={saving}
                      placeholder="Hub name"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold">City</label>
                    <input
                      className="form-control border-0 bg-light rounded-3"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      disabled={saving}
                      placeholder="City"
                    />
                  </div>
                  <div className="row g-2 mb-2">
                    <div className="col-6">
                      <label className="form-label small">Latitude</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control border-0 bg-light rounded-3"
                        value={form.lat}
                        onChange={(e) => setForm({ ...form, lat: e.target.value })}
                        disabled={saving}
                      />
                    </div>
                    <div className="col-6">
                      <label className="form-label small">Longitude</label>
                      <input
                        type="number"
                        step="any"
                        className="form-control border-0 bg-light rounded-3"
                        value={form.lng}
                        onChange={(e) => setForm({ ...form, lng: e.target.value })}
                        disabled={saving}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm rounded-3 d-inline-flex align-items-center gap-2 mb-4"
                    onClick={() => setFlyToToken((n) => n + 1)}
                    disabled={saving}
                  >
                    <Crosshair size={16} />
                    Center map on coordinates
                  </button>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold d-flex align-items-center gap-2">
                      <MapPin size={14} />
                      Zone
                    </label>
                    <select
                      className="form-select border-0 bg-light rounded-3"
                      value={form.zoneId}
                      onChange={(e) => setForm({ ...form, zoneId: e.target.value })}
                      disabled={saving}
                    >
                      <option value="">Select zone…</option>
                      {zones.map((z) => (
                        <option key={z.id} value={String(z.id)}>
                          {z.name} (#{z.id}) — {z.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-check form-switch mb-4">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="hub-active"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      disabled={saving}
                    />
                    <label className="form-check-label small" htmlFor="hub-active">
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
                        "Save hub"
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

export default Hubs;

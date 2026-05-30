import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  MapPin,
  Plus,
  Pencil,
  X,
  RefreshCw,
  CircleDot,
  Pentagon,
  Crosshair,
  Undo2,
  Trash2,
} from "lucide-react";
import { zoneService, hubService, unwrapList } from "../services/apiService";
import ZoneMapView from "../components/zones/ZoneMapView";
import { CoverageSummaryCards } from "../components/coverage/CoverageSummaryCards";
import { StatusBadge, BookingImpactCard } from "../components/coverage/StatusBadge";
import { hubsByZoneId, zoneHubStats } from "../components/coverage/coverageUtils";

const ZONE_TYPES = ["CIRCLE", "POLYGON"];

const HYDERABAD = { lat: 17.4065, lng: 78.4772 };

function summarizeZone(z) {
  const t = String(z?.zoneType || "").toUpperCase();
  if (t === "CIRCLE") {
    const lat = z?.centerLat;
    const lng = z?.centerLng;
    const r = z?.radiusKm;
    if (lat != null && lng != null && r != null)
      return `Circle · ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)} · ${r} km`;
  }
  if (t === "POLYGON" && z?.coordinates) {
    return "Polygon · coordinates set";
  }
  return t || "—";
}

/** Normalize API `coordinates` into [[lat,lng], ...] for the map. */
function coordinatesToPoints(raw) {
  if (raw == null) return [];
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const first = raw[0];
  if (!Array.isArray(first)) return [];

  // Preferred API shape: [[lat,lng], [lat,lng], ...]
  const isPairRows = raw.every((row) => {
    if (!Array.isArray(row) || row.length !== 2) return false;
    const a = Number(row[0]);
    const b = Number(row[1]);
    return Number.isFinite(a) && Number.isFinite(b);
  });
  if (isPairRows) {
    return raw.map((p) => [Number(p[0]), Number(p[1])]);
  }

  // Legacy: one row [[lat,lng,lat,lng,...]] (single List<Double> per point bug)
  if (typeof first[0] === "number") {
    const inner = first;
    const pts = [];
    for (let i = 0; i + 1 < inner.length; i += 2) {
      pts.push([inner[i], inner[i + 1]]);
    }
    return pts;
  }

  return [];
}

const defaultForm = () => ({
  name: "",
  city: "",
  isActive: true,
  zoneType: "CIRCLE",
  centerLat: String(HYDERABAD.lat),
  centerLng: String(HYDERABAD.lng),
  radiusKm: "5",
  polygonPoints: [],
});

const ZONE_FILTERS = [
  { id: "all", label: "All zones" },
  { id: "active", label: "Serving" },
  { id: "paused", label: "Paused" },
];

const Zones = () => {
  const [rows, setRows] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [zoneFilter, setZoneFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [flyToToken, setFlyToToken] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [zoneRes, hubRes] = await Promise.all([
        zoneService.list(),
        hubService.list(),
      ]);
      setRows(unwrapList(zoneRes));
      setHubs(unwrapList(hubRes));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load zones.");
      setRows([]);
      setHubs([]);
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

  const openCreate = () => {
    setEditingId(null);
    setForm(defaultForm());
    setFlyToToken(0);
    setEditorOpen(true);
  };

  const openEdit = (z) => {
    setEditingId(z.id);
    const t = String(z.zoneType || "CIRCLE").toUpperCase();
    const pts = t === "POLYGON" ? coordinatesToPoints(z.coordinates) : [];
    setForm({
      name: z.name ?? "",
      city: z.city ?? "",
      isActive: Boolean(z.isActive),
      zoneType: ZONE_TYPES.includes(t) ? t : "CIRCLE",
      centerLat:
        z.centerLat != null ? String(z.centerLat) : String(HYDERABAD.lat),
      centerLng:
        z.centerLng != null ? String(z.centerLng) : String(HYDERABAD.lng),
      radiusKm: z.radiusKm != null ? String(z.radiusKm) : "5",
      polygonPoints: pts,
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

  const handleMapClick = useCallback((lat, lng) => {
    setForm((f) => {
      if (f.zoneType === "CIRCLE") {
        return { ...f, centerLat: String(lat), centerLng: String(lng) };
      }
      return { ...f, polygonPoints: [...f.polygonPoints, [lat, lng]] };
    });
  }, []);

  const handleCenterDragEnd = useCallback((la, ln) => {
    setForm((f) => ({
      ...f,
      centerLat: String(la),
      centerLng: String(ln),
    }));
  }, []);

  const handlePolygonVertexDragEnd = useCallback((index, la, ln) => {
    setForm((f) => {
      const pts = [...f.polygonPoints];
      if (index < 0 || index >= pts.length) return f;
      pts[index] = [la, ln];
      return { ...f, polygonPoints: pts };
    });
  }, []);

  const undoPolygonPoint = () => {
    setForm((f) => ({
      ...f,
      polygonPoints: f.polygonPoints.slice(0, -1),
    }));
  };

  const clearPolygon = () => {
    setForm((f) => ({ ...f, polygonPoints: [] }));
  };

  const buildPayload = () => {
    const base = {
      name: form.name.trim(),
      city: form.city.trim(),
      isActive: Boolean(form.isActive),
      zoneType: form.zoneType,
    };
    if (form.zoneType === "CIRCLE") {
      const centerLat = parseFloat(form.centerLat);
      const centerLng = parseFloat(form.centerLng);
      const radiusKm = parseFloat(form.radiusKm);
      if (
        Number.isNaN(centerLat) ||
        Number.isNaN(centerLng) ||
        Number.isNaN(radiusKm)
      ) {
        throw new Error("Circle zones need valid center lat, lng, and radius.");
      }
      return { ...base, centerLat, centerLng, radiusKm };
    }
    const pts = form.polygonPoints;
    if (pts.length < 3) {
      throw new Error("Polygon needs at least 3 corners — click the map to add points.");
    }
    const coordinates = pts.map(([a, b]) => [Number(a), Number(b)]);
    return { ...base, coordinates };
  };

  const handleSubmit = async () => {
    let payload;
    try {
      payload = buildPayload();
    } catch (err) {
      window.alert(err.message || "Invalid form.");
      return;
    }
    if (!payload.name || !payload.city) {
      window.alert("Name and city are required.");
      return;
    }
    setSaving(true);
    try {
      if (editingId != null) {
        await zoneService.update(editingId, payload);
      } else {
        await zoneService.create(payload);
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

  const centerLatNum = parseFloat(form.centerLat);
  const centerLngNum = parseFloat(form.centerLng);
  const mapCenterLat = Number.isFinite(centerLatNum) ? centerLatNum : HYDERABAD.lat;
  const mapCenterLng = Number.isFinite(centerLngNum) ? centerLngNum : HYDERABAD.lng;

  const hubMap = hubsByZoneId(hubs);
  const activeCount = rows.filter((z) => z.isActive).length;
  const pausedCount = rows.length - activeCount;
  const activeHubCount = hubs.filter((h) => h.isActive).length;

  const filteredRows = rows.filter((z) => {
    if (zoneFilter === "active") return Boolean(z.isActive);
    if (zoneFilter === "paused") return !z.isActive;
    return true;
  });

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Zones</h2>
          <p className="text-muted small mb-0" style={{ maxWidth: 560 }}>
            Service areas for the Parcel app. <strong>Active</strong> zones allow
            in-city booking; <strong>paused</strong> zones block local trips inside the
            polygon (cross-city via hubs may still work). Set corridor pricing on{" "}
            <Link to="/zone-routes">Zone routes</Link>.
          </p>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <Link
            to="/zone-routes"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
          >
            Zone routes
          </Link>
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin-zone" : ""} />
            Refresh
          </button>
          <button
            type="button"
            className="btn text-white rounded-3 d-flex align-items-center gap-2 px-4 shadow-sm border-0"
            style={{ backgroundColor: "#E51818" }}
            onClick={openCreate}
          >
            <Plus size={18} />
            Add zone
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

      {!loading && !error ? (
        <CoverageSummaryCards
          items={[
            {
              key: "active",
              label: "Serving zones",
              value: activeCount,
              color: "#198754",
              hint: "In-city enabled",
            },
            {
              key: "paused",
              label: "Paused zones",
              value: pausedCount,
              color: pausedCount > 0 ? "#b45309" : "#111",
              hint: "Local area off",
            },
            {
              key: "hubs",
              label: "Active hubs (all)",
              value: activeHubCount,
              hint: "Linked under Hubs",
            },
            {
              key: "total",
              label: "Total zones",
              value: rows.length,
            },
          ]}
        />
      ) : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {ZONE_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm rounded-pill ${
              zoneFilter === f.id
                ? "text-white border-0"
                : "btn-outline-secondary"
            }`}
            style={zoneFilter === f.id ? { backgroundColor: "#E51818" } : undefined}
            onClick={() => setZoneFilter(f.id)}
          >
            {f.label}
            {f.id === "active" ? ` (${activeCount})` : ""}
            {f.id === "paused" ? ` (${pausedCount})` : ""}
          </button>
        ))}
      </div>

      <div className="dashboard-card p-0 border-0 overflow-hidden shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 small text-muted border-0">ZONE</th>
                <th className="px-3 py-3 small text-muted border-0">CITY</th>
                <th className="px-3 py-3 small text-muted border-0">TYPE</th>
                <th className="px-3 py-3 small text-muted border-0">DETAIL</th>
                <th className="px-3 py-3 small text-muted border-0">STATUS</th>
                <th className="px-3 py-3 small text-muted border-0">HUBS</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    Loading zones…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    {rows.length === 0 ? "No zones yet." : "No zones match this filter."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((z) => {
                  const hs = zoneHubStats(z, hubMap);
                  return (
                  <tr key={z.id}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-2">
                        <div
                          className="rounded-3 p-2 d-flex align-items-center justify-content-center"
                          style={{ background: "rgba(229, 24, 24, 0.08)" }}
                        >
                          <MapPin size={18} style={{ color: "#E51818" }} />
                        </div>
                        <div>
                          <p className="mb-0 fw-bold small">{z.name ?? "—"}</p>
                          <p className="mb-0 text-muted" style={{ fontSize: 11 }}>
                            ID {z.id}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 border-0 small">{z.city ?? "—"}</td>
                    <td className="px-3 py-3 border-0 small">
                      {String(z.zoneType || "").toUpperCase() === "CIRCLE" ? (
                        <span className="badge rounded-pill bg-light text-dark border">
                          <CircleDot size={12} className="me-1" />
                          Circle
                        </span>
                      ) : (
                        <span className="badge rounded-pill bg-light text-dark border">
                          <Pentagon size={12} className="me-1" />
                          Polygon
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3 border-0 small text-muted">
                      {summarizeZone(z)}
                    </td>
                    <td className="px-3 py-3 border-0">
                      <StatusBadge
                        variant={z.isActive ? "zoneActive" : "zonePaused"}
                        size="sm"
                      />
                      <p className="mb-0 mt-1 text-muted" style={{ fontSize: 11 }}>
                        {z.isActive
                          ? "In-city on"
                          : "Local trips blocked"}
                      </p>
                    </td>
                    <td className="px-3 py-3 border-0 small">
                      <span className="fw-semibold">{hs.active}</span>
                      <span className="text-muted"> active</span>
                      {hs.total > hs.active ? (
                        <span className="text-muted"> · {hs.inactive} off</span>
                      ) : null}
                      {hs.total === 0 ? (
                        <p className="mb-0 text-warning" style={{ fontSize: 11 }}>
                          No hubs linked
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 border-0 text-end">
                      <button
                        type="button"
                        className="btn btn-sm btn-light rounded-3"
                        onClick={() => openEdit(z)}
                      >
                        <Pencil size={16} className="me-1" />
                        Edit
                      </button>
                    </td>
                  </tr>
                  );
                })
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
          aria-labelledby="zone-editor-title"
        >
          <div className="flex-shrink-0 border-bottom bg-white px-3 py-3 px-md-4 d-flex align-items-center justify-content-between gap-3 shadow-sm">
            <div>
              <h5 className="fw-bold mb-0" id="zone-editor-title">
                {editingId != null ? "Edit zone" : "New zone"}
              </h5>
              <p className="text-muted small mb-0 d-none d-sm-block">
                Map on the left — form on the right. Click the map to place geometry.
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
              <div className="position-absolute top-0 start-0 p-2 p-md-3 z-2" style={{ pointerEvents: "none" }}>
                <span className="badge rounded-pill px-3 py-2 bg-dark text-white shadow-sm" style={{ pointerEvents: "auto" }}>
                  {form.zoneType === "CIRCLE"
                    ? "Drag the center handle to move · click map to reposition · radius on the right"
                    : "Drag handles to move corners · click empty map to add · Undo / Clear on the right"}
                </span>
              </div>
              <div className="flex-grow-1 min-h-0 w-100 h-100" style={{ minHeight: 0 }}>
                <ZoneMapView
                  zoneType={form.zoneType}
                  centerLat={mapCenterLat}
                  centerLng={mapCenterLng}
                  radiusKm={parseFloat(form.radiusKm) || 5}
                  polygonPoints={form.polygonPoints}
                  onMapClick={handleMapClick}
                  onCenterDragEnd={handleCenterDragEnd}
                  onPolygonVertexDragEnd={handlePolygonVertexDragEnd}
                  visible={editorOpen}
                  flyToToken={flyToToken}
                />
              </div>
            </div>

            <div
              className="d-flex flex-column min-h-0 bg-white border-start-lg overflow-auto"
              style={{ flex: "1 1 42%", maxHeight: "100%" }}
            >
              <div className="p-4 flex-grow-1" style={{ maxWidth: 520, marginLeft: "auto", marginRight: "auto", width: "100%" }}>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Name</label>
                  <input
                    className="form-control border-0 bg-light rounded-3"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    disabled={saving}
                    placeholder="e.g. Hyderabad Central"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">City</label>
                  <input
                    className="form-control border-0 bg-light rounded-3"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    disabled={saving}
                    placeholder="e.g. Hyderabad"
                  />
                </div>
                <div className="mb-3 p-3 rounded-4 bg-light border">
                  <div className="form-check form-switch mb-2">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="zone-active"
                      checked={form.isActive}
                      onChange={(e) =>
                        setForm({ ...form, isActive: e.target.checked })
                      }
                      disabled={saving}
                    />
                    <label className="form-check-label fw-semibold" htmlFor="zone-active">
                      Zone is serving (active)
                    </label>
                  </div>
                  <p className="text-muted small mb-2">
                    Turn <strong>off</strong> to pause local bookings inside this zone.
                    Hubs can stay on for cross-city corridors (Zone routes).
                  </p>
                  <BookingImpactCard
                    type="zone"
                    zoneActive={form.isActive}
                    zoneName={form.city || form.name || "this zone"}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-semibold">Zone type</label>
                  <select
                    className="form-select border-0 bg-light rounded-3"
                    value={form.zoneType}
                    onChange={(e) =>
                      setForm({ ...form, zoneType: e.target.value })
                    }
                    disabled={saving}
                  >
                    {ZONE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {form.zoneType === "CIRCLE" ? (
                  <>
                    <div className="row g-2 mb-2">
                      <div className="col-4">
                        <label className="form-label small">Center lat</label>
                        <input
                          type="number"
                          step="any"
                          className="form-control border-0 bg-light rounded-3"
                          value={form.centerLat}
                          onChange={(e) =>
                            setForm({ ...form, centerLat: e.target.value })
                          }
                          disabled={saving}
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small">Center lng</label>
                        <input
                          type="number"
                          step="any"
                          className="form-control border-0 bg-light rounded-3"
                          value={form.centerLng}
                          onChange={(e) =>
                            setForm({ ...form, centerLng: e.target.value })
                          }
                          disabled={saving}
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small">Radius (km)</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          className="form-control border-0 bg-light rounded-3"
                          value={form.radiusKm}
                          onChange={(e) =>
                            setForm({ ...form, radiusKm: e.target.value })
                          }
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
                  </>
                ) : (
                  <div className="mb-4">
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      <button
                        type="button"
                        className="btn btn-outline-secondary btn-sm rounded-3 d-inline-flex align-items-center gap-1"
                        onClick={undoPolygonPoint}
                        disabled={saving || form.polygonPoints.length === 0}
                      >
                        <Undo2 size={14} />
                        Undo point
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm rounded-3 d-inline-flex align-items-center gap-1"
                        onClick={clearPolygon}
                        disabled={saving || form.polygonPoints.length === 0}
                      >
                        <Trash2 size={14} />
                        Clear all
                      </button>
                    </div>
                    <p className="text-muted small mb-0">
                      Corners: <strong>{form.polygonPoints.length}</strong>
                      {form.polygonPoints.length < 3 ? (
                        <span> — add at least 3 for a valid polygon.</span>
                      ) : null}
                    </p>
                  </div>
                )}

                <div className="d-flex flex-column flex-sm-row gap-2 pt-2 border-top mt-2">
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
                      "Save zone"
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
        .spin-zone { animation: sz 0.8s linear infinite; }
        @keyframes sz { to { transform: rotate(360deg); } }
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

export default Zones;

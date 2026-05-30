import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Warehouse,
  Plus,
  Pencil,
  X,
  RefreshCw,
  MapPin,
  Crosshair,
  Info,
} from "lucide-react";
import { hubService, zoneService, unwrapList } from "../services/apiService";
import HubLocationMapView from "../components/hubs/HubLocationMapView";
import HubCorridorSlaPanel from "../components/hubs/HubCorridorSlaPanel";
import { CoverageSummaryCards } from "../components/coverage/CoverageSummaryCards";
import { StatusBadge, BookingImpactCard } from "../components/coverage/StatusBadge";
import { hubRoleLabel } from "../components/coverage/coverageUtils";

const HYDERABAD = { lat: 17.4065, lng: 78.4772 };

const HUB_FILTERS = [
  { id: "all", label: "All hubs" },
  { id: "operational", label: "Fully operational" },
  { id: "crossCity", label: "Cross-city only" },
  { id: "hubOff", label: "Hub off" },
  { id: "noZone", label: "Missing zone" },
];

const defaultForm = () => ({
  name: "",
  city: "",
  lat: String(HYDERABAD.lat),
  lng: String(HYDERABAD.lng),
  zoneId: "",
  intakeCutoff: "",
  isActive: true,
});

function zoneById(zones, id) {
  return zones.find((z) => Number(z.id) === Number(id));
}

function matchesHubFilter(h, zones, filterId) {
  const z = h.zoneId != null ? zoneById(zones, h.zoneId) : null;
  const hubOn = Boolean(h.isActive);
  const zoneOn = z ? Boolean(z.isActive) : false;

  switch (filterId) {
    case "operational":
      return hubOn && zoneOn;
    case "crossCity":
      return hubOn && z && !zoneOn;
    case "hubOff":
      return !hubOn;
    case "noZone":
      return h.zoneId == null;
    default:
      return true;
  }
}

const Hubs = () => {
  const [rows, setRows] = useState([]);
  const [zones, setZones] = useState([]);
  const [hubFilter, setHubFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [flyToToken, setFlyToToken] = useState(0);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [hubRes, zoneRes] = await Promise.all([
        hubService.list(),
        zoneService.list(),
      ]);
      setRows(unwrapList(hubRes));
      setZones(unwrapList(zoneRes));
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load hubs.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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
      intakeCutoff: h.intakeCutoff ?? "",
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
      intakeCutoff: form.intakeCutoff.trim() || null,
      isActive: Boolean(form.isActive),
    };
    setSaving(true);
    try {
      if (editingId != null) {
        await hubService.update(editingId, payload);
      } else {
        await hubService.create(payload);
      }
      await loadAll();
      closeEditor();
    } catch (e) {
      window.alert(
        e?.response?.data?.message || e?.message || "Save failed."
      );
    } finally {
      setSaving(false);
    }
  };

  const selectedZone = useMemo(
    () => (form.zoneId ? zoneById(zones, form.zoneId) : null),
    [zones, form.zoneId]
  );

  const stats = useMemo(() => {
    let operational = 0;
    let crossCity = 0;
    let off = 0;
    for (const h of rows) {
      const z = h.zoneId != null ? zoneById(zones, h.zoneId) : null;
      if (!h.isActive) off++;
      else if (z?.isActive) operational++;
      else if (z) crossCity++;
    }
    return { operational, crossCity, off, total: rows.length };
  }, [rows, zones]);

  const filteredRows = rows.filter((h) => matchesHubFilter(h, zones, hubFilter));

  const mapLat = parseFloat(form.lat);
  const mapLng = parseFloat(form.lng);
  const mapLatNum = Number.isFinite(mapLat) ? mapLat : HYDERABAD.lat;
  const mapLngNum = Number.isFinite(mapLng) ? mapLng : HYDERABAD.lng;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-3">
        <div>
          <h2 className="fw-bold mb-1">Hubs</h2>
          <p className="text-muted small mb-0" style={{ maxWidth: 560 }}>
            Warehouse points for outstation legs. Each hub must link to a{" "}
            <Link to="/zones">zone</Link>. Hub <strong>on</strong> + zone{" "}
            <strong>paused</strong> = cross-city only; both on = in-city + outstation.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
            onClick={loadAll}
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

      <div
        className="alert alert-light border rounded-4 small d-flex gap-2 align-items-start mb-4"
        role="note"
      >
        <Info size={18} className="text-primary flex-shrink-0 mt-1" />
        <div>
          <strong>Zone vs hub</strong>
          <ul className="mb-0 ps-3 mt-1">
            <li>
              <strong>Zone paused</strong> — blocks pickup &amp; drop both inside that
              zone (local trips).
            </li>
            <li>
              <strong>Hub active</strong> — still used for outstation corridors when the
              zone is paused (<Link to="/zone-routes">Zone routes</Link>).
            </li>
            <li>
              <strong>Intake cutoff</strong> — per hub (when parcel must reach that warehouse).
            </li>
            <li>
              <strong>Per-corridor delivery</strong> — edit each hub to set &quot;delivered
              by&quot; per destination zone (e.g. each Vizag hub → Hyd).
            </li>
            <li>
              <strong>Zone active</strong> — enables in-city vehicles inside the zone.
            </li>
          </ul>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 border-0 d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadAll}>
            Retry
          </button>
        </div>
      ) : null}

      {!loading && !error ? (
        <CoverageSummaryCards
          items={[
            {
              key: "op",
              label: "Fully operational",
              value: stats.operational,
              color: "#198754",
              hint: "Hub on + zone serving",
            },
            {
              key: "cc",
              label: "Cross-city only",
              value: stats.crossCity,
              color: stats.crossCity > 0 ? "#0d6efd" : "#111",
              hint: "Hub on, zone paused",
            },
            {
              key: "off",
              label: "Hubs off",
              value: stats.off,
              hint: "Not in quotes",
            },
            {
              key: "total",
              label: "Total hubs",
              value: stats.total,
            },
          ]}
        />
      ) : null}

      <div className="d-flex flex-wrap gap-2 mb-3">
        {HUB_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            className={`btn btn-sm rounded-pill ${
              hubFilter === f.id ? "text-white border-0" : "btn-outline-secondary"
            }`}
            style={hubFilter === f.id ? { backgroundColor: "#E51818" } : undefined}
            onClick={() => setHubFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="dashboard-card p-0 border-0 overflow-hidden shadow-sm">
        <div className="table-responsive">
          <table className="table table-hover mb-0 align-middle">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 small text-muted border-0">HUB</th>
                <th className="px-3 py-3 small text-muted border-0">CITY</th>
                <th className="px-3 py-3 small text-muted border-0">ZONE</th>
                <th className="px-3 py-3 small text-muted border-0">INTAKE CUTOFF</th>
                <th className="px-3 py-3 small text-muted border-0">BOOKING ROLE</th>
                <th className="px-3 py-3 small text-muted border-0">HUB</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    Loading hubs…
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-5 text-muted small">
                    {rows.length === 0 ? "No hubs yet." : "No hubs match this filter."}
                  </td>
                </tr>
              ) : (
                filteredRows.map((h) => {
                  const z = h.zoneId != null ? zoneById(zones, h.zoneId) : null;
                  const hubOn = Boolean(h.isActive);
                  const zoneOn = z ? Boolean(z.isActive) : false;
                  const role = hubRoleLabel(hubOn, zoneOn, Boolean(z));

                  let hubBadge = "hubOff";
                  if (hubOn && zoneOn) hubBadge = "hubActive";
                  else if (hubOn && z && !zoneOn) hubBadge = "crossCity";

                  return (
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
                            <p className="mb-0 text-muted font-monospace" style={{ fontSize: 10 }}>
                              {h.lat != null && h.lng != null
                                ? `${Number(h.lat).toFixed(4)}, ${Number(h.lng).toFixed(4)}`
                                : "—"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-0 small">{h.city ?? "—"}</td>
                      <td className="px-3 py-3 border-0 small">
                        {z ? (
                          <div>
                            <span className="fw-semibold">{z.name}</span>
                            <div className="mt-1">
                              <StatusBadge
                                variant={zoneOn ? "zoneActive" : "zonePaused"}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-danger fw-semibold">Not linked</span>
                        )}
                      </td>
                      <td className="px-3 py-3 border-0 small font-monospace">
                        {h.intakeCutoff ? h.intakeCutoff : "—"}
                      </td>
                      <td className="px-3 py-3 border-0">
                        <span className="fw-semibold small d-block">{role.short}</span>
                        <span className="text-muted" style={{ fontSize: 11 }}>
                          {role.detail}
                        </span>
                      </td>
                      <td className="px-3 py-3 border-0">
                        <StatusBadge variant={hubBadge} />
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
                      Linked zone
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
                          {z.name} — {z.city}
                          {z.isActive ? " · Serving" : " · Paused"}
                        </option>
                      ))}
                    </select>
                    {selectedZone ? (
                      <div className="mt-2">
                        <StatusBadge
                          variant={selectedZone.isActive ? "zoneActive" : "zonePaused"}
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-semibold">
                      Last intake cutoff (local time)
                    </label>
                    <input
                      type="time"
                      className="form-control border-0 bg-light rounded-3"
                      value={form.intakeCutoff}
                      onChange={(e) =>
                        setForm({ ...form, intakeCutoff: e.target.value })
                      }
                      disabled={saving}
                    />
                    <p className="text-muted small mb-0 mt-1">
                      Optional latest handover if you do <strong>not</strong> use dispatch
                      slots below (one deadline for all buses).
                    </p>
                  </div>

                  {editingId != null ? (
                    <HubCorridorSlaPanel
                      hubId={editingId}
                      hubZoneId={form.zoneId}
                      zones={zones}
                    />
                  ) : (
                    <p className="small text-muted mb-3">
                      Save the hub once, then edit it to set per-zone delivery times (e.g.
                      Vizag hub → Hyderabad).
                    </p>
                  )}

                  <div className="mb-3 p-3 rounded-4 bg-light border">
                    <div className="form-check form-switch mb-2">
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
                      <label className="form-check-label fw-semibold" htmlFor="hub-active">
                        Hub is active
                      </label>
                    </div>
                    <BookingImpactCard
                      type="hub"
                      hubActive={form.isActive}
                      zoneActive={selectedZone ? Boolean(selectedZone.isActive) : false}
                      zoneName={selectedZone?.city || selectedZone?.name}
                    />
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

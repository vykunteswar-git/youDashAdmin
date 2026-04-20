import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, Plus, RefreshCw, Search, Send } from "lucide-react";
import {
  getAxiosErrorMessage,
  notificationAdminService,
} from "../services/apiService";

const TARGET_TABS = [
  { label: "All Users", value: "ALL_USERS" },
  { label: "All Riders", value: "ALL_RIDERS" },
  { label: "By City (Users)", value: "CITY_USERS" },
  { label: "By City (Riders)", value: "CITY_RIDERS" },
  { label: "By Zone (Users)", value: "ZONE_USERS" },
  { label: "By Zone (Riders)", value: "ZONE_RIDERS" },
  { label: "Specific ID (Users)", value: "SPECIFIC_USERS" },
  { label: "Specific ID (Riders)", value: "SPECIFIC_RIDERS" },
];

const PAGE_SIZE_OPTIONS = [10, 20, 50];
const DEFAULT_TARGETS = { cities: [], zones: [], users: [], riders: [] };

function toInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function parseJsonData(raw) {
  const input = String(raw || "").trim();
  if (!input) return {};
  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    throw new Error("Data field must be valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Data must be a JSON object.");
  }
  const mapped = {};
  Object.entries(parsed).forEach(([key, value]) => {
    mapped[String(key)] = value == null ? "" : String(value);
  });
  return mapped;
}

function normalizeTargets(payload) {
  const data = payload && typeof payload === "object" ? payload : DEFAULT_TARGETS;
  const citiesRaw = Array.isArray(data.cities) ? data.cities : [];
  const zonesRaw = Array.isArray(data.zones) ? data.zones : [];
  const usersRaw = Array.isArray(data.users) ? data.users : [];
  const ridersRaw = Array.isArray(data.riders) ? data.riders : [];

  const cities = citiesRaw
    .map((c) =>
      typeof c === "string"
        ? { value: c, label: c }
        : { value: String(c?.name ?? c?.city ?? ""), label: String(c?.name ?? c?.city ?? "") }
    )
    .filter((c) => c.value.trim());

  const zones = zonesRaw
    .map((z) => ({
      id: toInt(z?.id ?? z?.zoneId, NaN),
      label: String(z?.name ?? z?.zoneName ?? `Zone ${z?.id ?? z?.zoneId ?? ""}`),
    }))
    .filter((z) => Number.isInteger(z.id) && z.id > 0);

  const users = usersRaw
    .map((u) => ({
      id: toInt(u?.id ?? u?.userId, NaN),
      label: String(u?.name ?? u?.fullName ?? u?.email ?? `User ${u?.id ?? u?.userId ?? ""}`),
    }))
    .filter((u) => Number.isInteger(u.id) && u.id > 0);

  const riders = ridersRaw
    .map((r) => ({
      id: toInt(r?.id ?? r?.riderId, NaN),
      label: String(r?.name ?? r?.fullName ?? r?.phone ?? `Rider ${r?.id ?? r?.riderId ?? ""}`),
    }))
    .filter((r) => Number.isInteger(r.id) && r.id > 0);

  return { cities, zones, users, riders };
}

function normalizeLogsResponse(payload, page, size) {
  if (Array.isArray(payload)) {
    return {
      content: payload,
      number: page,
      size,
      totalElements: payload.length,
      totalPages: payload.length ? 1 : 0,
    };
  }
  const content = Array.isArray(payload?.content)
    ? payload.content
    : Array.isArray(payload?.logs)
      ? payload.logs
      : [];
  const totalElements = toInt(payload?.totalElements ?? payload?.total ?? content.length, 0);
  const resolvedSize = toInt(payload?.size, size) || size;
  const totalPages = toInt(
    payload?.totalPages,
    resolvedSize > 0 ? Math.ceil(totalElements / resolvedSize) : 0
  );
  return {
    content,
    number: toInt(payload?.number, page),
    size: resolvedSize,
    totalElements,
    totalPages,
  };
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

const Notifications = () => {
  const [targetType, setTargetType] = useState("ALL_USERS");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notificationType, setNotificationType] = useState("PROMOTIONAL");
  const [city, setCity] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [dataJson, setDataJson] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedRiderIds, setSelectedRiderIds] = useState([]);

  const [targets, setTargets] = useState(DEFAULT_TARGETS);
  const [targetSearch, setTargetSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [targetsError, setTargetsError] = useState("");
  const initialTargetsCacheRef = useRef(null);

  const [logs, setLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [logsError, setLogsError] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [toasts, setToasts] = useState([]);

  const isCityTarget = targetType === "CITY_USERS" || targetType === "CITY_RIDERS";
  const isZoneTarget = targetType === "ZONE_USERS" || targetType === "ZONE_RIDERS";
  const isSpecificUsers = targetType === "SPECIFIC_USERS";
  const isSpecificRiders = targetType === "SPECIFIC_RIDERS";
  const isSpecificTarget = isSpecificUsers || isSpecificRiders;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(targetSearch.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [targetSearch]);

  const pushToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const loadTargets = useCallback(async (query = "", limit = 20) => {
    const q = String(query || "").trim();
    if (!q && initialTargetsCacheRef.current) {
      setTargets(initialTargetsCacheRef.current);
      setTargetsError("");
      setTargetsLoading(false);
      return;
    }

    setTargetsLoading(true);
    setTargetsError("");
    try {
      const payload = await notificationAdminService.getNotificationTargets({
        ...(q ? { q } : {}),
        limit,
      });
      const normalized = normalizeTargets(payload);
      if (!q) {
        initialTargetsCacheRef.current = normalized;
      }
      setTargets(normalized);
    } catch (e) {
      setTargetsError(getAxiosErrorMessage(e, "Failed to load targets."));
      if (!q && initialTargetsCacheRef.current) {
        setTargets(initialTargetsCacheRef.current);
      } else {
        setTargets(DEFAULT_TARGETS);
      }
    } finally {
      setTargetsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTargets("", 20);
  }, [loadTargets]);

  useEffect(() => {
    loadTargets(debouncedSearch, 20);
  }, [debouncedSearch, loadTargets]);

  const loadLogs = useCallback(async (nextPage = 0, nextSize = 20) => {
    setLogsLoading(true);
    setLogsError("");
    try {
      const payload = await notificationAdminService.getNotificationLogs({
        page: nextPage,
        size: nextSize,
      });
      const normalized = normalizeLogsResponse(payload, nextPage, nextSize);
      setLogs(normalized.content);
      setPage(normalized.number);
      setSize(normalized.size);
      setTotalPages(normalized.totalPages);
      setTotalElements(normalized.totalElements);
    } catch (e) {
      setLogsError(getAxiosErrorMessage(e, "Failed to load notification logs."));
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs(0, 20);
  }, [loadLogs]);

  const selectedEntityList = isSpecificUsers ? targets.users : targets.riders;
  const selectedIds = isSpecificUsers ? selectedUserIds : selectedRiderIds;

  const toggleSpecificId = (id) => {
    const setter = isSpecificUsers ? setSelectedUserIds : setSelectedRiderIds;
    setter((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const validateBeforeSubmit = (dataPayload) => {
    if (!targetType) return "Target type is required.";
    if (!title.trim()) return "Notification title is required.";
    if (!body.trim()) return "Message body is required.";
    if (isCityTarget && !city.trim()) return "Please select a city.";
    if (isZoneTarget && !zoneId) return "Please select a zone.";
    if (isSpecificUsers && selectedUserIds.length === 0) {
      return "Please select at least one user.";
    }
    if (isSpecificRiders && selectedRiderIds.length === 0) {
      return "Please select at least one rider.";
    }
    if (dataJson.trim() && !dataPayload) return "Invalid data JSON.";
    return "";
  };

  const submitBroadcast = async (saveDraft) => {
    let dataPayload;
    try {
      dataPayload = parseJsonData(dataJson);
    } catch (e) {
      setValidationError(e.message || "Invalid JSON.");
      return;
    }

    const error = validateBeforeSubmit(dataPayload);
    if (error) {
      setValidationError(error);
      return;
    }

    const payload = {
      targetType,
      title: title.trim(),
      body: body.trim(),
      notificationType: notificationType || undefined,
      city: isCityTarget ? city.trim() || null : null,
      zoneId: isZoneTarget ? toInt(zoneId, 0) || null : null,
      userIds: isSpecificUsers ? selectedUserIds : undefined,
      riderIds: isSpecificRiders ? selectedRiderIds : undefined,
      data: dataPayload,
      saveDraft,
    };

    setSubmitting(true);
    setValidationError("");
    try {
      await notificationAdminService.sendNotificationBroadcast(payload);
      pushToast("success", saveDraft ? "Draft saved" : "Broadcast queued");
      await loadLogs(0, size);
    } catch (e) {
      const msg = getAxiosErrorMessage(
        e,
        saveDraft ? "Failed to save draft." : "Failed to queue broadcast."
      );
      setValidationError(msg);
      pushToast("danger", msg);
    } finally {
      setSubmitting(false);
    }
  };

  const statusClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s === "SENT" || s === "SUCCESS") return "active";
    if (s === "FAILED") return "cancelled";
    if (s === "DRAFT") return "pending";
    return "info";
  };

  const clearSpecificSelections = () => {
    setSelectedUserIds([]);
    setSelectedRiderIds([]);
  };

  const summaryText = useMemo(
    () => `${targets.cities.length} cities · ${targets.zones.length} zones · ${targets.users.length} users · ${targets.riders.length} riders`,
    [targets]
  );

  return (
    <div className="container-fluid fade-in position-relative">
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} border-0 shadow-sm mb-2`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div className="d-flex align-items-center gap-3">
          <div className="notifications-hero-icon rounded-3 d-flex align-items-center justify-content-center">
            <Bell size={22} />
          </div>
          <div>
            <h2 className="fw-bold mb-1">Push Notifications</h2>
            <p className="text-muted small mb-0">
              Compose campaigns and review delivery logs.
            </p>
          </div>
        </div>
        <div className="notifications-summary-pill small text-muted fw-semibold">
          {targetsLoading ? "Loading target directory..." : summaryText}
        </div>
      </div>

      <div className="row g-4 notifications-flow-stack">
        <div className="col-12">
          <div className="notifications-compose-wrap">
          <div className="dashboard-card border-0 shadow-sm h-100 p-4 notifications-compose-card">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Plus size={20} className="text-primary-red" /> Compose Broadcast
            </h5>

            {validationError ? (
              <div className="alert alert-danger rounded-4 border-0 py-2 px-3 small">
                {validationError}
              </div>
            ) : null}

            {targetsError ? (
              <div className="alert alert-warning rounded-4 border-0 py-2 px-3 small d-flex justify-content-between align-items-center">
                <span>{targetsError}</span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => loadTargets(debouncedSearch, 20)}
                >
                  Retry
                </button>
              </div>
            ) : null}

            <div className="d-flex flex-column gap-3">
              <div>
                <label className="form-label small text-muted fw-bold">Target Audience</label>
                <div className="d-flex gap-2 flex-wrap notifications-tab-wrap">
                  {TARGET_TABS.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      className={`btn notifications-target-pill rounded-pill small fw-bold border ${
                        targetType === tab.value ? "text-white border-0" : "bg-light text-muted"
                      }`}
                      style={{ backgroundColor: targetType === tab.value ? "#E51818" : undefined }}
                      onClick={() => {
                        setTargetType(tab.value);
                        setValidationError("");
                        clearSpecificSelections();
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {(isCityTarget || isZoneTarget || isSpecificTarget) ? (
                <div className="notifications-section-box">
                  <label className="form-label small text-muted fw-bold">
                    Search targets
                  </label>
                  <div className="search-container">
                    <Search size={16} className="text-muted" />
                    <input
                      type="text"
                      placeholder="Type city, zone, user, rider..."
                      className="form-control bg-light border-0 ps-5 py-2 small"
                      style={{ borderRadius: 10 }}
                      value={targetSearch}
                      onChange={(e) => setTargetSearch(e.target.value)}
                    />
                  </div>
                </div>
              ) : null}

              {isCityTarget ? (
                <div className="notifications-section-box">
                  <label className="form-label small text-muted fw-bold">City *</label>
                  <select
                    className="form-select bg-light border-0 py-2"
                    style={{ borderRadius: 10 }}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={targetsLoading}
                  >
                    <option value="">
                      {targetsLoading ? "Loading cities..." : "Select a city"}
                    </option>
                    {targets.cities.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isZoneTarget ? (
                <div className="notifications-section-box">
                  <label className="form-label small text-muted fw-bold">Zone *</label>
                  <select
                    className="form-select bg-light border-0 py-2"
                    style={{ borderRadius: 10 }}
                    value={zoneId}
                    onChange={(e) => setZoneId(e.target.value)}
                    disabled={targetsLoading}
                  >
                    <option value="">
                      {targetsLoading ? "Loading zones..." : "Select a zone"}
                    </option>
                    {targets.zones.map((z) => (
                      <option key={z.id} value={String(z.id)}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {isSpecificTarget ? (
                <div className="notifications-section-box border rounded-3 p-3">
                  <label className="form-label small text-muted fw-bold mb-2">
                    {isSpecificUsers ? "Select user IDs *" : "Select rider IDs *"}
                  </label>
                  <div className="d-flex flex-wrap gap-2" style={{ maxHeight: 160, overflowY: "auto" }}>
                    {targetsLoading ? (
                      <span className="small text-muted">Loading...</span>
                    ) : selectedEntityList.length === 0 ? (
                      <span className="small text-muted">No matching targets.</span>
                    ) : (
                      selectedEntityList.map((item) => {
                        const active = selectedIds.includes(item.id);
                        return (
                          <button
                            type="button"
                            key={item.id}
                            className={`btn btn-sm rounded-pill ${active ? "text-white border-0" : "btn-light text-muted"}`}
                            style={{ backgroundColor: active ? "#E51818" : undefined }}
                            onClick={() => toggleSpecificId(item.id)}
                          >
                            #{item.id} {item.label}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <div className="small text-muted mt-2">
                    Selected IDs: {selectedIds.length ? selectedIds.join(", ") : "none"}
                  </div>
                </div>
              ) : null}

              <div className="notifications-section-box">
                <label className="form-label small text-muted fw-bold">Notification Title *</label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2"
                  style={{ borderRadius: 10 }}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Free Delivery Alert!"
                />
              </div>

              <div className="notifications-section-box">
                <label className="form-label small text-muted fw-bold">Message Content *</label>
                <textarea
                  className="form-control bg-light border-0 p-3"
                  rows={4}
                  style={{ borderRadius: 12 }}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write your broadcast message..."
                />
              </div>

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <div className="notifications-section-box">
                    <label className="form-label small text-muted fw-bold">Notification Type</label>
                    <input
                      type="text"
                      className="form-control bg-light border-0 py-2"
                      style={{ borderRadius: 10 }}
                      value={notificationType}
                      onChange={(e) => setNotificationType(e.target.value)}
                      placeholder="PROMOTIONAL"
                    />
                  </div>
                </div>
                <div className="col-12 col-md-6 d-flex align-items-end">
                  <div className="notifications-helper-note small text-muted">
                    Tip: keep title short and include clear action text in message.
                  </div>
                </div>
              </div>

              <div className="notifications-section-box">
                <label className="form-label small text-muted fw-bold">Data (JSON)</label>
                <textarea
                  className="form-control bg-light border-0 p-3 font-monospace small"
                  rows={3}
                  style={{ borderRadius: 12 }}
                  value={dataJson}
                  onChange={(e) => setDataJson(e.target.value)}
                  placeholder='e.g. {"screen":"OFFERS","campaignId":"FESTIVE_1"}'
                />
              </div>
            </div>

            <div className="d-flex gap-2 mt-4 pt-2 border-top">
              <button
                type="button"
                className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3 shadow-sm notifications-action-btn"
                disabled={submitting}
                onClick={() => submitBroadcast(true)}
              >
                {submitting ? "Working..." : "Save Draft"}
              </button>
              <button
                type="button"
                className="btn flex-grow-1 py-3 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2 text-white border-0 notifications-action-btn"
                style={{ backgroundColor: "#E51818" }}
                disabled={submitting}
                onClick={() => submitBroadcast(false)}
              >
                {submitting ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <Send size={16} />
                    Send Broadcast
                  </>
                )}
              </button>
            </div>
          </div>
          </div>
        </div>

        <div className="col-12 h-100">
          <div className="dashboard-card border-0 shadow-sm h-100 p-0 overflow-hidden d-flex flex-column">
            <div className="p-4 border-bottom d-flex justify-content-between align-items-center gap-3">
              <h5 className="fw-bold mb-0">Notification History</h5>
              <div className="d-flex gap-2">
                <select
                  className="form-select form-select-sm"
                  value={size}
                  onChange={(e) => loadLogs(0, toInt(e.target.value, 20))}
                  style={{ minWidth: 90 }}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  disabled={logsLoading}
                  onClick={() => loadLogs(page, size)}
                >
                  <RefreshCw size={16} className={logsLoading ? "spin" : ""} />
                </button>
              </div>
            </div>

            <div className="flex-grow-1 overflow-auto custom-scrollbar">
              <div className="table-responsive">
                <table className="table mb-0 table-hover align-middle notifications-table">
                  <thead className="bg-light">
                    <tr>
                      <th className="px-4 py-3 text-muted small border-0">TITLE</th>
                      <th className="px-3 py-3 text-muted small border-0">TARGET</th>
                      <th className="px-3 py-3 text-muted small border-0">TYPE</th>
                      <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                      <th className="px-3 py-3 text-muted small border-0">TOTAL</th>
                      <th className="px-3 py-3 text-muted small border-0">SUCCESS</th>
                      <th className="px-3 py-3 text-muted small border-0">FAILED</th>
                      <th className="px-4 py-3 text-muted small border-0">CREATED</th>
                      <th className="px-4 py-3 text-muted small border-0">SENT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      Array.from({ length: 6 }).map((_, idx) => (
                        <tr key={idx}>
                          <td colSpan={9} className="px-4 py-3 border-0">
                            <div className="skeleton-line w-100" />
                          </td>
                        </tr>
                      ))
                    ) : logsError ? (
                      <tr>
                        <td colSpan={9} className="text-center py-5">
                          <p className="text-muted small mb-2">{logsError}</p>
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => loadLogs(page, size)}
                          >
                            Retry
                          </button>
                        </td>
                      </tr>
                    ) : logs.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-5 text-muted small">
                          No notification logs found.
                        </td>
                      </tr>
                    ) : (
                      logs.map((row, idx) => (
                        <tr key={`${row?.id || "log"}-${idx}`}>
                          <td className="px-4 py-3 border-0 small fw-bold">{row?.title || "Untitled"}</td>
                          <td className="px-3 py-3 border-0 small text-muted">{row?.targetType || "—"}</td>
                          <td className="px-3 py-3 border-0 small text-muted">{row?.notificationType || "—"}</td>
                          <td className="px-3 py-3 border-0">
                            <span className={`status-badge status-${statusClass(row?.status)} p-1 px-3`} style={{ fontSize: 11 }}>
                              {row?.status || "UNKNOWN"}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-0 small">{toInt(row?.totalTargets, 0)}</td>
                          <td className="px-3 py-3 border-0 small text-success">{toInt(row?.successCount, 0)}</td>
                          <td className="px-3 py-3 border-0 small text-danger">{toInt(row?.failedCount, 0)}</td>
                          <td className="px-4 py-3 border-0 small text-muted">{formatDateTime(row?.createdAt)}</td>
                          <td className="px-4 py-3 border-0 small text-muted">{formatDateTime(row?.sentAt)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="border-top d-flex align-items-center justify-content-between p-3">
              <div className="small text-muted d-flex align-items-center">
                <Bell size={14} className="me-1" />
                {totalElements} logs
              </div>
              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => loadLogs(Math.max(page - 1, 0), size)}
                  disabled={logsLoading || page <= 0}
                >
                  Prev
                </button>
                <span className="small text-muted">
                  Page {totalPages > 0 ? page + 1 : 0} / {totalPages || 0}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-light"
                  onClick={() => loadLogs(page + 1, size)}
                  disabled={logsLoading || totalPages === 0 || page + 1 >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 0.35; }
          100% { opacity: 0.7; }
        }
        .skeleton-line {
          height: 14px;
          border-radius: 8px;
          background: #e5e7eb;
          animation: pulse 1.4s ease-in-out infinite;
        }
        .notifications-hero-icon {
          width: 44px;
          height: 44px;
          color: #E51818;
          background: rgba(229, 24, 24, 0.10);
        }
        .notifications-summary-pill {
          background: #fff;
          border: 1px solid #edf0f5;
          border-radius: 999px;
          padding: 8px 14px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.03);
        }
        .notifications-compose-card {
          background: linear-gradient(180deg, #ffffff 0%, #fcfcfe 100%);
        }
        .notifications-flow-stack {
          align-items: stretch;
        }
        .notifications-compose-wrap {
          max-width: 980px;
          margin: 0 auto;
        }
        .notifications-tab-wrap {
          margin-top: 2px;
        }
        .notifications-target-pill {
          padding: 6px 12px;
        }
        .notifications-section-box {
          background: #fff;
          border: 1px solid #f0f2f7;
          border-radius: 12px;
          padding: 10px 12px;
        }
        .notifications-helper-note {
          background: #f8fafc;
          border: 1px dashed #d7dde7;
          border-radius: 10px;
          padding: 10px 12px;
          width: 100%;
        }
        .notifications-action-btn {
          min-height: 46px;
        }
        .notifications-table thead th {
          white-space: nowrap;
        }
        .notifications-table tbody tr:hover {
          background-color: #fbfcff;
        }
      `}</style>
    </div>
  );
};

export default Notifications;

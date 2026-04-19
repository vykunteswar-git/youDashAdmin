import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Ticket,
  Plus,
  Search,
  Tag,
  Clock,
  CheckCircle2,
  XCircle,
  Percent,
  Banknote,
  Navigation,
  RefreshCw,
  Pencil,
} from "lucide-react";
import {
  couponAdminService,
  unwrapList,
  readApiMessage,
  isApiFailureBody,
  getAxiosErrorMessage,
} from "../services/apiService";

function getRedemptionCount(c) {
  const v =
    c?.currentRedemptions ??
    c?.redemptionCount ??
    c?.totalRedemptions ??
    c?.usedCount ??
    c?.redemptions ??
    c?.uses;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getMaxTotal(c) {
  const v = c?.maxRedemptionsTotal;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function deriveUiStatus(c) {
  if (!c) return "Expired";
  const to = c.validTo ? new Date(c.validTo).getTime() : NaN;
  if (Number.isFinite(to) && to < Date.now()) return "Expired";
  if (c.active === false) return "Paused";
  return "Active";
}

function serviceModeLabel(mode) {
  if (mode === "INCITY") return "In city";
  if (mode === "OUTSTATION") return "Outstation";
  return "Any mode";
}

function toIsoInstant(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function rowToWritePayload(row, overrides = {}) {
  const base = {
    code: row.code,
    title: row.title ?? row.code,
    description: row.description ?? "",
    discountType: row.discountType,
    discountValue: Number(row.discountValue) || 0,
    validFrom: row.validFrom,
    validTo: row.validTo,
    active: row.active !== false,
  };
  if (row.maxDiscountAmount != null && row.maxDiscountAmount !== "")
    base.maxDiscountAmount = Number(row.maxDiscountAmount);
  if (row.minOrderAmount != null && row.minOrderAmount !== "")
    base.minOrderAmount = Number(row.minOrderAmount);
  if (row.maxRedemptionsTotal != null && row.maxRedemptionsTotal !== "")
    base.maxRedemptionsTotal = Number(row.maxRedemptionsTotal);
  if (row.maxRedemptionsPerUser != null && row.maxRedemptionsPerUser !== "")
    base.maxRedemptionsPerUser = Number(row.maxRedemptionsPerUser);
  if (row.serviceMode === "INCITY" || row.serviceMode === "OUTSTATION")
    base.serviceMode = row.serviceMode;
  return { ...base, ...overrides };
}

const emptyCreateForm = () => ({
  code: "",
  title: "",
  description: "",
  discountType: "FLAT",
  discountValue: "",
  maxDiscountAmount: "",
  minOrderAmount: "",
  validFrom: "",
  validTo: "",
  maxRedemptionsTotal: "",
  maxRedemptionsPerUser: "",
  serviceMode: "",
  active: true,
});

const Promotions = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCreateForm);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await couponAdminService.list();
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setError(readApiMessage(raw) || "Failed to load coupons.");
        setRows([]);
        return;
      }
      setRows(unwrapList(res));
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load coupons."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((c) => {
      const status = deriveUiStatus(c);
      if (activeTab !== "All" && status !== activeTab) return false;
      if (!q) return true;
      return (
        String(c.code || "")
          .toLowerCase()
          .includes(q) ||
        String(c.title || "")
          .toLowerCase()
          .includes(q) ||
        String(c.id).includes(q)
      );
    });
  }, [rows, search, activeTab]);

  const activeCount = useMemo(
    () => rows.filter((c) => deriveUiStatus(c) === "Active").length,
    [rows]
  );
  const totalRedemptions = useMemo(
    () => rows.reduce((acc, c) => acc + getRedemptionCount(c), 0),
    [rows]
  );
  const avgDiscountValue = useMemo(() => {
    if (!rows.length) return 0;
    const sum = rows.reduce((a, c) => a + (Number(c.discountValue) || 0), 0);
    return Math.round((sum / rows.length) * 100) / 100;
  }, [rows]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyCreateForm());
    setActionError("");
    setIsModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({
      code: row.code ?? "",
      title: row.title ?? "",
      description: row.description ?? "",
      discountType: row.discountType === "PERCENT" ? "PERCENT" : "FLAT",
      discountValue:
        row.discountValue != null ? String(row.discountValue) : "",
      maxDiscountAmount:
        row.maxDiscountAmount != null ? String(row.maxDiscountAmount) : "",
      minOrderAmount:
        row.minOrderAmount != null ? String(row.minOrderAmount) : "",
      validFrom: toDatetimeLocalValue(row.validFrom),
      validTo: toDatetimeLocalValue(row.validTo),
      maxRedemptionsTotal:
        row.maxRedemptionsTotal != null ? String(row.maxRedemptionsTotal) : "",
      maxRedemptionsPerUser:
        row.maxRedemptionsPerUser != null
          ? String(row.maxRedemptionsPerUser)
          : "",
      serviceMode: row.serviceMode === "INCITY" || row.serviceMode === "OUTSTATION" ? row.serviceMode : "",
      active: row.active !== false,
    });
    setActionError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setForm(emptyCreateForm());
    setActionError("");
  };

  const buildPayloadFromForm = () => {
    const code = form.code.trim();
    if (!code) throw new Error("Promo code is required.");
    const title = form.title.trim() || code;
    const validFrom = toIsoInstant(form.validFrom);
    const validTo = toIsoInstant(form.validTo);
    if (!validFrom || !validTo) throw new Error("Valid from and valid to are required (ISO local date-time).");
    const discountValue = Number(String(form.discountValue).trim());
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      throw new Error("Discount value must be a valid number.");
    }
    const payload = {
      code: code.toUpperCase(),
      title,
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue,
      validFrom,
      validTo,
      active: Boolean(form.active),
    };
    if (form.maxDiscountAmount.trim()) {
      const n = Number(form.maxDiscountAmount);
      if (Number.isFinite(n) && n >= 0) payload.maxDiscountAmount = n;
    }
    if (form.minOrderAmount.trim()) {
      const n = Number(form.minOrderAmount);
      if (Number.isFinite(n) && n >= 0) payload.minOrderAmount = n;
    }
    if (form.maxRedemptionsTotal.trim()) {
      const n = parseInt(form.maxRedemptionsTotal, 10);
      if (Number.isFinite(n) && n > 0) payload.maxRedemptionsTotal = n;
    }
    if (form.maxRedemptionsPerUser.trim()) {
      const n = parseInt(form.maxRedemptionsPerUser, 10);
      if (Number.isFinite(n) && n > 0) payload.maxRedemptionsPerUser = n;
    }
    if (form.serviceMode === "INCITY" || form.serviceMode === "OUTSTATION") {
      payload.serviceMode = form.serviceMode;
    }
    return payload;
  };

  const handleSave = async () => {
    setActionError("");
    let payload;
    try {
      payload = buildPayloadFromForm();
    } catch (err) {
      setActionError(err?.message || "Invalid form.");
      return;
    }
    setSaving(true);
    try {
      const res = editingId
        ? await couponAdminService.update(editingId, payload)
        : await couponAdminService.create(payload);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setActionError(readApiMessage(raw) || "Save failed.");
        return;
      }
      closeModal();
      await load();
    } catch (e) {
      setActionError(getAxiosErrorMessage(e, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (row) => {
    if (deriveUiStatus(row) === "Expired") return;
    setTogglingId(row.id);
    setError("");
    try {
      const nextActive = !(row.active !== false);
      const payload = rowToWritePayload(row, { active: nextActive });
      const res = await couponAdminService.update(row.id, payload);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setError(readApiMessage(raw) || "Update failed.");
        return;
      }
      await load();
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Update failed."));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="container-fluid fade-in position-relative">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Promotions & Coupons</h2>
          <p className="text-muted small mb-0">
            <code className="small">GET/POST /admin/coupons</code>,{" "}
            <code className="small">PUT /admin/coupons/{"{id}"}</code>
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 rounded-3"
            disabled={loading}
            onClick={() => load()}
          >
            <RefreshCw size={18} />
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
            style={{
              backgroundColor: "#E51818",
              color: "white",
              borderRadius: "10px",
            }}
            onClick={openCreate}
          >
            <Plus size={18} /> <span>Create coupon</span>
          </button>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
          {error}
        </div>
      ) : null}

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 shadow-sm bg-white border-start border-4 border-danger">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-danger bg-opacity-10 p-2 rounded-3 text-danger">
                <Ticket size={20} />
              </div>
              <span className="small text-muted fw-bold">Active coupons</span>
            </div>
            <h4 className="fw-bold mb-0">{loading ? "—" : activeCount}</h4>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 shadow-sm bg-white border-start border-4 border-success">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success">
                <Tag size={20} />
              </div>
              <span className="small text-muted fw-bold">
                Total redemptions (sum)
              </span>
            </div>
            <h4 className="fw-bold mb-0">{loading ? "—" : totalRedemptions}</h4>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div
            className="dashboard-card border-0 shadow-sm bg-primary-red text-white"
            style={{ backgroundColor: "#E51818" }}
          >
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-white bg-opacity-25 p-2 rounded-3">
                <Banknote size={20} />
              </div>
              <span className="small opacity-75 fw-bold">
                Avg discount value
              </span>
            </div>
            <h4 className="fw-bold mb-0">
              {loading ? "—" : avgDiscountValue}
            </h4>
          </div>
        </div>
      </div>

      <div className="dashboard-card p-0 border-0 shadow-sm overflow-hidden bg-white">
        <div className="p-4 border-bottom d-flex flex-column flex-md-row gap-4">
          <div className="d-flex gap-2 overflow-auto custom-scrollbar">
            {["All", "Active", "Paused", "Expired"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`btn p-0 px-4 py-2 rounded-pill small fw-bold transition-all border ${
                  activeTab === tab
                    ? "bg-secondary text-white border-secondary"
                    : "bg-light text-muted border-0"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="search-container flex-grow-1">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search promo codes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </div>

        {loading ? (
          <div
            className="d-flex flex-column align-items-center justify-content-center py-5 gap-3"
            style={{ minHeight: 240 }}
          >
            <div
              className="spinner-border text-danger"
              style={{ width: "2rem", height: "2rem" }}
              role="status"
            />
            <p className="text-muted small mb-0">Loading coupons…</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table hover-bg-light mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 small text-muted border-0">
                    PROMO CODE
                  </th>
                  <th className="px-3 py-3 small text-muted border-0">
                    DISCOUNT
                  </th>
                  <th className="px-3 py-3 small text-muted border-0">
                    USAGE / LIMIT
                  </th>
                  <th className="px-3 py-3 small text-muted border-0">MODE</th>
                  <th className="px-3 py-3 small text-muted border-0">STATUS</th>
                  <th className="px-4 py-3 small text-muted border-0 text-end">
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-5 small">
                      No coupons match this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((coupon) => {
                    const status = deriveUiStatus(coupon);
                    const uses = getRedemptionCount(coupon);
                    const maxTot = getMaxTotal(coupon);
                    const pct =
                      maxTot != null && maxTot > 0
                        ? Math.min(100, (uses / maxTot) * 100)
                        : uses > 0
                          ? 100
                          : 0;
                    return (
                      <tr
                        key={coupon.id}
                        className="align-middle border-bottom border-light"
                      >
                        <td className="px-4 py-3 border-0">
                          <div className="d-flex align-items-center gap-3">
                            <div className="p-2 bg-danger bg-opacity-10 text-danger rounded-3">
                              <Ticket size={16} />
                            </div>
                            <div>
                              <p className="mb-0 fw-bold">{coupon.code}</p>
                              <small className="text-muted d-block" style={{ fontSize: "10px" }}>
                                {coupon.title || "—"}
                              </small>
                              <small className="text-muted" style={{ fontSize: "10px" }}>
                                <Clock size={10} className="me-1" />
                                {coupon.validTo
                                  ? `Until ${new Date(coupon.validTo).toLocaleString()}`
                                  : "No end"}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 border-0 fw-bold">
                          {coupon.discountType === "PERCENT" ? (
                            <span className="text-primary-red">
                              {coupon.discountValue}% OFF
                            </span>
                          ) : (
                            <span className="text-primary-red">
                              ₹{coupon.discountValue} FLAT
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 border-0 small text-muted">
                          <div className="d-flex align-items-center gap-2">
                            <div
                              className="progress flex-grow-1"
                              style={{ height: "6px", maxWidth: "80px" }}
                            >
                              <div
                                className={`progress-bar ${uses >= (maxTot ?? Infinity) ? "bg-danger" : "bg-success"}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="fw-bold">
                              {uses}{" "}
                              <span className="fw-normal opacity-50">
                                / {maxTot != null ? maxTot : "∞"}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-3 border-0 small text-muted">
                          <span className="d-flex align-items-center gap-1">
                            <Navigation size={12} />
                            {serviceModeLabel(coupon.serviceMode)}
                          </span>
                        </td>
                        <td className="px-3 py-3 border-0">
                          <span
                            className={`status-badge status-${status.toLowerCase()} p-1 px-3`}
                            style={{ fontSize: "10px" }}
                          >
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 border-0 text-end">
                          <button
                            type="button"
                            className="btn btn-light p-2 rounded-3 border-0 me-1"
                            title="Edit"
                            onClick={() => openEdit(coupon)}
                          >
                            <Pencil size={16} className="text-secondary" />
                          </button>
                          {status !== "Expired" && (
                            <button
                              type="button"
                              className="btn btn-light p-2 rounded-3 border-0"
                              disabled={togglingId === coupon.id}
                              title={
                                coupon.active !== false
                                  ? "Pause"
                                  : "Resume"
                              }
                              onClick={() => handleToggleActive(coupon)}
                            >
                              {togglingId === coupon.id ? (
                                <span className="spinner-border spinner-border-sm" />
                              ) : coupon.active !== false ? (
                                <XCircle size={16} className="text-warning" />
                              ) : (
                                <CheckCircle2 size={16} className="text-success" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen &&
        createPortal(
          <div
            className="yd-admin-modal-layer position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.55)",
              backdropFilter: "blur(6px)",
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="yd-coupon-modal-title"
          >
          <div
            className="bg-white rounded-4 p-4 shadow-lg fade-in w-100 border-0"
            style={{ maxWidth: 560, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.18)" }}
          >
            <h4 id="yd-coupon-modal-title" className="fw-bold mb-3 d-flex align-items-center gap-2">
              <Ticket className="text-danger" />
              {editingId ? "Edit coupon" : "New coupon"}
            </h4>

            {actionError ? (
              <div className="alert alert-danger small py-2 mb-3">{actionError}</div>
            ) : null}

            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Code *
                </label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2 text-uppercase fw-bold text-danger"
                  placeholder="SUMMER50"
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  disabled={Boolean(editingId)}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Title *
                </label>
                <input
                  type="text"
                  className="form-control bg-light border-0 py-2"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12">
                <label className="form-label small text-muted fw-bold">
                  Description
                </label>
                <textarea
                  className="form-control bg-light border-0 small"
                  rows={2}
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Discount type *
                </label>
                <select
                  className="form-select bg-light border-0 py-2"
                  value={form.discountType}
                  onChange={(e) =>
                    setForm({ ...form, discountType: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                >
                  <option value="FLAT">FLAT (₹)</option>
                  <option value="PERCENT">PERCENT (%)</option>
                </select>
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Discount value *
                </label>
                <div className="input-group">
                  <span className="input-group-text bg-light border-0">
                    {form.discountType === "FLAT" ? (
                      <Banknote size={16} />
                    ) : (
                      <Percent size={16} />
                    )}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control bg-light border-0 py-2"
                    value={form.discountValue}
                    onChange={(e) =>
                      setForm({ ...form, discountValue: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Max discount (₹, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control bg-light border-0 py-2"
                  value={form.maxDiscountAmount}
                  onChange={(e) =>
                    setForm({ ...form, maxDiscountAmount: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Min order (₹, optional)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control bg-light border-0 py-2"
                  value={form.minOrderAmount}
                  onChange={(e) =>
                    setForm({ ...form, minOrderAmount: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Valid from *
                </label>
                <input
                  type="datetime-local"
                  className="form-control bg-light border-0 py-2"
                  value={form.validFrom}
                  onChange={(e) =>
                    setForm({ ...form, validFrom: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Valid to *
                </label>
                <input
                  type="datetime-local"
                  className="form-control bg-light border-0 py-2"
                  value={form.validTo}
                  onChange={(e) =>
                    setForm({ ...form, validTo: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Max redemptions total (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control bg-light border-0 py-2"
                  value={form.maxRedemptionsTotal}
                  onChange={(e) =>
                    setForm({ ...form, maxRedemptionsTotal: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Max per user (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  className="form-control bg-light border-0 py-2"
                  value={form.maxRedemptionsPerUser}
                  onChange={(e) =>
                    setForm({ ...form, maxRedemptionsPerUser: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-sm-6">
                <label className="form-label small text-muted fw-bold">
                  Service mode (optional)
                </label>
                <select
                  className="form-select bg-light border-0 py-2"
                  value={form.serviceMode}
                  onChange={(e) =>
                    setForm({ ...form, serviceMode: e.target.value })
                  }
                  style={{ borderRadius: "10px" }}
                >
                  <option value="">Any</option>
                  <option value="INCITY">INCITY</option>
                  <option value="OUTSTATION">OUTSTATION</option>
                </select>
              </div>
              <div className="col-12 col-sm-6 d-flex align-items-end">
                <div className="form-check">
                  <input
                    id="coupon-active"
                    type="checkbox"
                    className="form-check-input"
                    checked={form.active}
                    onChange={(e) =>
                      setForm({ ...form, active: e.target.checked })
                    }
                  />
                  <label
                    htmlFor="coupon-active"
                    className="form-check-label small fw-bold"
                  >
                    Active
                  </label>
                </div>
              </div>
            </div>

            <div className="d-flex gap-3 mt-4 pt-3 border-top">
              <button
                type="button"
                className="btn btn-light flex-grow-1 py-2 fw-bold rounded-3"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary-red flex-grow-1 py-2 fw-bold text-white shadow-sm rounded-3"
                style={{ backgroundColor: "#E51818" }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : editingId ? (
                  "Save changes"
                ) : (
                  "Create coupon"
                )}
              </button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </div>
  );
};

export default Promotions;

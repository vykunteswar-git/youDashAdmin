import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  CalendarClock,
  CheckCircle2,
  Image,
  Link,
  Pencil,
  Plus,
  RefreshCw,
  Ticket,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  bannerAdminService,
  couponAdminService,
  getAxiosErrorMessage,
  isApiFailureBody,
  readApiMessage,
  unwrapList,
} from "../services/apiService";

const EMPTY_BANNER_FORM = {
  title: "",
  subtitle: "",
  imageUrl: "",
  redirectUrl: "",
  sortOrder: "",
  isActive: true,
  startsAt: "",
  endsAt: "",
};

const EMPTY_COUPON_FORM = {
  code: "",
  title: "",
  description: "",
  discountType: "FLAT",
  discountValue: "",
  minOrderAmount: "",
  validFrom: "",
  validTo: "",
  maxRedemptions: "",
  isActive: true,
};

function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toIsoInstant(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function normalizeBanner(raw) {
  return {
    id: raw?.id,
    title: raw?.title ?? "",
    subtitle: raw?.subtitle ?? "",
    imageUrl: raw?.imageUrl ?? "",
    redirectUrl: raw?.redirectUrl ?? "",
    sortOrder: Number.isFinite(Number(raw?.sortOrder)) ? Number(raw.sortOrder) : 0,
    isActive: Boolean(raw?.isActive),
    startsAt: raw?.startsAt ?? null,
    endsAt: raw?.endsAt ?? null,
  };
}

function bannerStatusMeta(banner) {
  if (!banner?.isActive) return { label: "Inactive", className: "cancelled" };
  const now = Date.now();
  const starts = banner.startsAt ? new Date(banner.startsAt).getTime() : NaN;
  const ends = banner.endsAt ? new Date(banner.endsAt).getTime() : NaN;
  if (Number.isFinite(starts) && starts > now) {
    return { label: "Scheduled", className: "info" };
  }
  if (Number.isFinite(ends) && ends < now) {
    return { label: "Inactive", className: "cancelled" };
  }
  return { label: "Active", className: "active" };
}

function couponIsActive(coupon) {
  return coupon?.isActive ?? coupon?.active ?? false;
}

function normalizeCoupon(raw) {
  const isActive = couponIsActive(raw);
  return {
    ...raw,
    code: String(raw?.code ?? ""),
    title: raw?.title ?? "",
    description: raw?.description ?? "",
    discountType: raw?.discountType === "PERCENT" ? "PERCENT" : "FLAT",
    discountValue: Number(raw?.discountValue) || 0,
    minOrderAmount:
      raw?.minOrderAmount != null && raw?.minOrderAmount !== ""
        ? Number(raw.minOrderAmount)
        : null,
    validFrom: raw?.validFrom ?? null,
    validTo: raw?.validTo ?? null,
    maxRedemptions:
      raw?.maxRedemptions ??
      raw?.maxRedemptionsTotal ??
      raw?.maxUses ??
      raw?.usageLimit ??
      null,
    isActive,
    active: isActive,
  };
}

function couponDiscountSummary(coupon) {
  if (coupon.discountType === "PERCENT") {
    return `${coupon.discountValue}% OFF`;
  }
  return `₹${coupon.discountValue} OFF`;
}

function couponValiditySummary(coupon) {
  if (!coupon.validFrom && !coupon.validTo) return "No validity window";
  return `${formatDateTime(coupon.validFrom)} → ${formatDateTime(coupon.validTo)}`;
}

function buildBannerUpdatePayload(banner, overrides = {}) {
  return {
    title: banner.title,
    subtitle: banner.subtitle,
    imageUrl: banner.imageUrl,
    redirectUrl: banner.redirectUrl || null,
    sortOrder: Number(banner.sortOrder) || 0,
    isActive: Boolean(banner.isActive),
    startsAt: banner.startsAt || null,
    endsAt: banner.endsAt || null,
    ...overrides,
  };
}

function buildCouponUpdatePayload(coupon, overrides = {}) {
  const payload = {
    code: coupon.code,
    title: coupon.title || coupon.code,
    description: coupon.description || "",
    discountType: coupon.discountType,
    discountValue: Number(coupon.discountValue) || 0,
    validFrom: coupon.validFrom || null,
    validTo: coupon.validTo || null,
    active: couponIsActive(coupon),
  };
  if (coupon.minOrderAmount != null && coupon.minOrderAmount !== "") {
    payload.minOrderAmount = Number(coupon.minOrderAmount);
  }
  if (coupon.maxRedemptions != null && coupon.maxRedemptions !== "") {
    const limit = Number(coupon.maxRedemptions);
    if (Number.isFinite(limit) && limit > 0) payload.maxRedemptionsTotal = limit;
  }
  if (coupon.maxRedemptionsTotal != null && coupon.maxRedemptionsTotal !== "") {
    const limit = Number(coupon.maxRedemptionsTotal);
    if (Number.isFinite(limit) && limit > 0) payload.maxRedemptionsTotal = limit;
  }
  if (coupon.maxDiscountAmount != null && coupon.maxDiscountAmount !== "") {
    payload.maxDiscountAmount = Number(coupon.maxDiscountAmount);
  }
  if (coupon.maxRedemptionsPerUser != null && coupon.maxRedemptionsPerUser !== "") {
    payload.maxRedemptionsPerUser = Number(coupon.maxRedemptionsPerUser);
  }
  if (coupon.serviceMode === "INCITY" || coupon.serviceMode === "OUTSTATION") {
    payload.serviceMode = coupon.serviceMode;
  }
  return { ...payload, ...overrides };
}

const CMS = () => {
  const [toasts, setToasts] = useState([]);

  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [bannersError, setBannersError] = useState("");
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerDeletingId, setBannerDeletingId] = useState(null);
  const [bannerTogglingId, setBannerTogglingId] = useState(null);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState(null);
  const [bannerForm, setBannerForm] = useState(EMPTY_BANNER_FORM);
  const [bannerFormError, setBannerFormError] = useState("");

  const [coupons, setCoupons] = useState([]);
  const [couponsLoading, setCouponsLoading] = useState(true);
  const [couponsError, setCouponsError] = useState("");
  const [couponSaving, setCouponSaving] = useState(false);
  const [couponTogglingId, setCouponTogglingId] = useState(null);
  const [couponModalOpen, setCouponModalOpen] = useState(false);
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON_FORM);
  const [couponFormError, setCouponFormError] = useState("");

  const pushToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  }, []);

  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    setBannersError("");
    try {
      const res = await bannerAdminService.list();
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setBannersError(readApiMessage(raw) || "Failed to load banners.");
        setBanners([]);
        return;
      }
      setBanners(unwrapList(res).map(normalizeBanner));
    } catch (e) {
      setBannersError(getAxiosErrorMessage(e, "Failed to load banners."));
      setBanners([]);
    } finally {
      setBannersLoading(false);
    }
  }, []);

  const loadCoupons = useCallback(async () => {
    setCouponsLoading(true);
    setCouponsError("");
    try {
      const res = await couponAdminService.list();
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setCouponsError(readApiMessage(raw) || "Failed to load promo codes.");
        setCoupons([]);
        return;
      }
      setCoupons(unwrapList(res).map(normalizeCoupon));
    } catch (e) {
      setCouponsError(getAxiosErrorMessage(e, "Failed to load promo codes."));
      setCoupons([]);
    } finally {
      setCouponsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
    loadCoupons();
  }, [loadBanners, loadCoupons]);

  const sortedBanners = useMemo(
    () =>
      [...banners].sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(a.title).localeCompare(String(b.title));
      }),
    [banners]
  );

  const closeBannerModal = () => {
    setBannerModalOpen(false);
    setEditingBannerId(null);
    setBannerForm(EMPTY_BANNER_FORM);
    setBannerFormError("");
  };

  const openCreateBanner = () => {
    setEditingBannerId(null);
    setBannerForm(EMPTY_BANNER_FORM);
    setBannerFormError("");
    setBannerModalOpen(true);
  };

  const openEditBanner = (banner) => {
    setEditingBannerId(banner.id);
    setBannerForm({
      title: banner.title || "",
      subtitle: banner.subtitle || "",
      imageUrl: banner.imageUrl || "",
      redirectUrl: banner.redirectUrl || "",
      sortOrder: String(banner.sortOrder ?? 0),
      isActive: Boolean(banner.isActive),
      startsAt: toDatetimeLocalValue(banner.startsAt),
      endsAt: toDatetimeLocalValue(banner.endsAt),
    });
    setBannerFormError("");
    setBannerModalOpen(true);
  };

  const saveBanner = async () => {
    setBannerFormError("");

    const startsAt = toIsoInstant(bannerForm.startsAt);
    const endsAt = toIsoInstant(bannerForm.endsAt);
    if (!editingBannerId && !bannerForm.imageUrl.trim()) {
      setBannerFormError("Image URL is required when creating a banner.");
      return;
    }
    if (startsAt && endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setBannerFormError("End date/time must be after start date/time.");
      return;
    }

    const payload = {
      title: bannerForm.title.trim(),
      subtitle: bannerForm.subtitle.trim(),
      imageUrl: bannerForm.imageUrl.trim(),
      redirectUrl: bannerForm.redirectUrl.trim() || null,
      sortOrder: Number(bannerForm.sortOrder) || 0,
      isActive: Boolean(bannerForm.isActive),
      startsAt,
      endsAt,
    };

    setBannerSaving(true);
    try {
      const res = editingBannerId
        ? await bannerAdminService.update(editingBannerId, payload)
        : await bannerAdminService.create(payload);
      if (isApiFailureBody(res?.data)) {
        setBannerFormError(readApiMessage(res.data) || "Failed to save banner.");
        return;
      }
      closeBannerModal();
      await loadBanners();
      pushToast("success", editingBannerId ? "Banner updated." : "Banner created.");
    } catch (e) {
      setBannerFormError(getAxiosErrorMessage(e, "Failed to save banner."));
    } finally {
      setBannerSaving(false);
    }
  };

  const toggleBannerActive = async (banner) => {
    setBannerTogglingId(banner.id);
    try {
      await bannerAdminService.update(
        banner.id,
        buildBannerUpdatePayload(banner, { isActive: !banner.isActive })
      );
      await loadBanners();
      pushToast("success", !banner.isActive ? "Banner activated." : "Banner deactivated.");
    } catch (e) {
      pushToast("danger", getAxiosErrorMessage(e, "Failed to update banner status."));
    } finally {
      setBannerTogglingId(null);
    }
  };

  const deleteBanner = async (banner) => {
    const ok = window.confirm(`Delete banner "${banner.title || `#${banner.id}`}"?`);
    if (!ok) return;
    setBannerDeletingId(banner.id);
    try {
      await bannerAdminService.remove(banner.id);
      await loadBanners();
      pushToast("success", "Banner deleted.");
    } catch (e) {
      pushToast("danger", getAxiosErrorMessage(e, "Failed to delete banner."));
    } finally {
      setBannerDeletingId(null);
    }
  };

  const closeCouponModal = () => {
    setCouponModalOpen(false);
    setEditingCouponId(null);
    setCouponForm(EMPTY_COUPON_FORM);
    setCouponFormError("");
  };

  const openCreateCoupon = () => {
    setEditingCouponId(null);
    setCouponForm(EMPTY_COUPON_FORM);
    setCouponFormError("");
    setCouponModalOpen(true);
  };

  const openEditCoupon = (coupon) => {
    setEditingCouponId(coupon.id);
    setCouponForm({
      code: coupon.code || "",
      title: coupon.title || "",
      description: coupon.description || "",
      discountType: coupon.discountType === "PERCENT" ? "PERCENT" : "FLAT",
      discountValue: String(coupon.discountValue ?? ""),
      minOrderAmount:
        coupon.minOrderAmount != null && coupon.minOrderAmount !== ""
          ? String(coupon.minOrderAmount)
          : "",
      validFrom: toDatetimeLocalValue(coupon.validFrom),
      validTo: toDatetimeLocalValue(coupon.validTo),
      maxRedemptions:
        coupon.maxRedemptions != null && coupon.maxRedemptions !== ""
          ? String(coupon.maxRedemptions)
          : "",
      isActive: couponIsActive(coupon),
    });
    setCouponFormError("");
    setCouponModalOpen(true);
  };

  const saveCoupon = async () => {
    setCouponFormError("");
    const code = couponForm.code.trim().toUpperCase();
    if (!code) {
      setCouponFormError("Promo code is required.");
      return;
    }

    const discountValue = Number(couponForm.discountValue);
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      setCouponFormError("Discount value must be a valid non-negative number.");
      return;
    }

    const validFrom = toIsoInstant(couponForm.validFrom);
    const validTo = toIsoInstant(couponForm.validTo);
    if (validFrom && validTo && new Date(validTo).getTime() <= new Date(validFrom).getTime()) {
      setCouponFormError("Valid to must be after valid from.");
      return;
    }

    const payload = {
      code,
      title: couponForm.title.trim() || code,
      description: couponForm.description.trim(),
      discountType: couponForm.discountType,
      discountValue,
      validFrom,
      validTo,
      active: Boolean(couponForm.isActive),
    };
    if (couponForm.minOrderAmount.trim()) {
      const minOrderAmount = Number(couponForm.minOrderAmount);
      if (!Number.isFinite(minOrderAmount) || minOrderAmount < 0) {
        setCouponFormError("Minimum order amount must be a non-negative number.");
        return;
      }
      payload.minOrderAmount = minOrderAmount;
    }
    if (couponForm.maxRedemptions.trim()) {
      const maxRedemptions = Number(couponForm.maxRedemptions);
      if (!Number.isFinite(maxRedemptions) || maxRedemptions <= 0) {
        setCouponFormError("Max redemptions must be a positive number.");
        return;
      }
      payload.maxRedemptionsTotal = Math.trunc(maxRedemptions);
    }

    setCouponSaving(true);
    try {
      const res = editingCouponId
        ? await couponAdminService.update(editingCouponId, payload)
        : await couponAdminService.create(payload);
      if (isApiFailureBody(res?.data)) {
        setCouponFormError(readApiMessage(res.data) || "Failed to save promo code.");
        return;
      }
      closeCouponModal();
      await loadCoupons();
      pushToast("success", editingCouponId ? "Promo code updated." : "Promo code created.");
    } catch (e) {
      setCouponFormError(getAxiosErrorMessage(e, "Failed to save promo code."));
    } finally {
      setCouponSaving(false);
    }
  };

  const toggleCouponActive = async (coupon) => {
    setCouponTogglingId(coupon.id);
    try {
      await couponAdminService.update(
        coupon.id,
        buildCouponUpdatePayload(coupon, { active: !couponIsActive(coupon) })
      );
      await loadCoupons();
      pushToast(
        "success",
        !couponIsActive(coupon) ? "Promo code activated." : "Promo code deactivated."
      );
    } catch (e) {
      pushToast("danger", getAxiosErrorMessage(e, "Failed to update promo code status."));
    } finally {
      setCouponTogglingId(null);
    }
  };

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
        <div>
          <h2 className="fw-bold mb-1">Content Management (CMS)</h2>
          <p className="text-muted small mb-0">
            Manage Hero Banners and Promo Codes with live admin APIs.
          </p>
        </div>
      </div>

      <div className="dashboard-card border-0 shadow-sm mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Image size={20} className="text-primary-red" /> Hero Banners
          </h5>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light d-flex align-items-center gap-2"
              onClick={loadBanners}
              disabled={bannersLoading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary-red d-flex align-items-center gap-2"
              style={{ backgroundColor: "#E51818", color: "white" }}
              onClick={openCreateBanner}
            >
              <Plus size={16} />
              Create Banner
            </button>
          </div>
        </div>

        {bannersLoading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-danger" role="status" />
          </div>
        ) : bannersError ? (
          <div className="alert alert-danger d-flex justify-content-between align-items-center">
            <span>{bannersError}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadBanners}>
              Retry
            </button>
          </div>
        ) : sortedBanners.length === 0 ? (
          <div className="text-center py-5 text-muted small">No banners found.</div>
        ) : (
          <div className="row g-3">
            {sortedBanners.map((banner) => {
              const status = bannerStatusMeta(banner);
              const isDeleting = bannerDeletingId === banner.id;
              const isToggling = bannerTogglingId === banner.id;
              return (
                <div key={banner.id} className="col-12 col-md-6 col-xl-4">
                  <div className="border rounded-4 h-100 p-3 d-flex flex-column">
                    <div className="bg-light rounded-3 mb-3 overflow-hidden" style={{ minHeight: 140 }}>
                      {banner.imageUrl ? (
                        <img
                          src={banner.imageUrl}
                          alt={banner.title || "Banner"}
                          className="w-100"
                          style={{ maxHeight: 170, objectFit: "cover" }}
                        />
                      ) : (
                        <div className="w-100 h-100 d-flex align-items-center justify-content-center py-5">
                          <Image size={36} className="text-muted" />
                        </div>
                      )}
                    </div>
                    <div className="d-flex justify-content-between align-items-start gap-2 mb-2">
                      <div>
                        <p className="mb-0 fw-bold">{banner.title || "Untitled banner"}</p>
                        <small className="text-muted">{banner.subtitle || "No subtitle"}</small>
                      </div>
                      <span
                        className={`status-badge status-${status.className} p-1 px-3`}
                        style={{ fontSize: "10px" }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="small text-muted mb-3">
                      <div>Order: {banner.sortOrder}</div>
                      <div>
                        <CalendarClock size={12} className="me-1" />
                        {formatDateTime(banner.startsAt)} → {formatDateTime(banner.endsAt)}
                      </div>
                      <div className="text-truncate">
                        <Link size={12} className="me-1" />
                        {banner.redirectUrl || "No redirect URL"}
                      </div>
                    </div>
                    <div className="d-flex gap-2 mt-auto">
                      <button
                        type="button"
                        className="btn btn-light flex-grow-1"
                        onClick={() => openEditBanner(banner)}
                        disabled={isDeleting}
                      >
                        <Pencil size={15} className="me-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-light flex-grow-1"
                        onClick={() => toggleBannerActive(banner)}
                        disabled={isDeleting || isToggling}
                      >
                        {isToggling ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : banner.isActive ? (
                          "Deactivate"
                        ) : (
                          "Activate"
                        )}
                      </button>
                      <button
                        type="button"
                        className="btn btn-light text-danger"
                        title="Delete banner"
                        onClick={() => deleteBanner(banner)}
                        disabled={isDeleting || isToggling}
                      >
                        {isDeleting ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="dashboard-card border-0 shadow-sm">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
            <Ticket size={20} className="text-primary-red" /> Promo Codes (Offers & Coupons)
          </h5>
          <div className="d-flex gap-2">
            <button
              type="button"
              className="btn btn-light d-flex align-items-center gap-2"
              onClick={loadCoupons}
              disabled={couponsLoading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              type="button"
              className="btn btn-primary-red d-flex align-items-center gap-2"
              style={{ backgroundColor: "#E51818", color: "white" }}
              onClick={openCreateCoupon}
            >
              <Plus size={16} />
              Create Promo Code
            </button>
          </div>
        </div>

        {couponsLoading ? (
          <div className="py-5 text-center">
            <div className="spinner-border text-danger" role="status" />
          </div>
        ) : couponsError ? (
          <div className="alert alert-danger d-flex justify-content-between align-items-center">
            <span>{couponsError}</span>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={loadCoupons}>
              Retry
            </button>
          </div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-5 text-muted small">No promo codes found.</div>
        ) : (
          <div className="table-responsive">
            <table className="table mb-0 align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="small text-muted border-0">CODE</th>
                  <th className="small text-muted border-0">DISCOUNT</th>
                  <th className="small text-muted border-0">VALIDITY</th>
                  <th className="small text-muted border-0">STATUS</th>
                  <th className="small text-muted border-0 text-end">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id || coupon.code}>
                    <td className="small fw-bold">
                      {coupon.code}
                      <div className="text-muted fw-normal">{coupon.title || "—"}</div>
                    </td>
                    <td className="small">
                      {couponDiscountSummary(coupon)}
                      {coupon.minOrderAmount != null ? (
                        <div className="text-muted">Min order ₹{coupon.minOrderAmount}</div>
                      ) : null}
                    </td>
                    <td className="small text-muted">{couponValiditySummary(coupon)}</td>
                    <td>
                      <span
                        className={`status-badge status-${couponIsActive(coupon) ? "active" : "cancelled"} p-1 px-3`}
                        style={{ fontSize: "10px" }}
                      >
                        {couponIsActive(coupon) ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        type="button"
                        className="btn btn-light btn-sm me-2"
                        onClick={() => openEditCoupon(coupon)}
                      >
                        <Pencil size={14} className="me-1" />
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-light btn-sm"
                        onClick={() => toggleCouponActive(coupon)}
                        disabled={couponTogglingId === coupon.id}
                      >
                        {couponTogglingId === coupon.id ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : couponIsActive(coupon) ? (
                          <>
                            <XCircle size={14} className="me-1 text-warning" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={14} className="me-1 text-success" />
                            Activate
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {bannerModalOpen &&
        createPortal(
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", zIndex: 1200 }}
          >
            <div className="bg-white rounded-4 p-4 shadow-lg w-100" style={{ maxWidth: 620 }}>
              <h5 className="fw-bold mb-3">{editingBannerId ? "Edit Banner" : "Create Banner"}</h5>
              {bannerFormError ? (
                <div className="alert alert-danger small py-2">{bannerFormError}</div>
              ) : null}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Title</label>
                  <input
                    className="form-control bg-light border-0"
                    value={bannerForm.title}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Sort order</label>
                  <input
                    type="number"
                    className="form-control bg-light border-0"
                    value={bannerForm.sortOrder}
                    onChange={(e) =>
                      setBannerForm((prev) => ({ ...prev, sortOrder: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted fw-bold">Subtitle</label>
                  <input
                    className="form-control bg-light border-0"
                    value={bannerForm.subtitle}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, subtitle: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted fw-bold">Image URL *</label>
                  <input
                    className="form-control bg-light border-0"
                    value={bannerForm.imageUrl}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, imageUrl: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted fw-bold">Redirect URL</label>
                  <input
                    className="form-control bg-light border-0"
                    value={bannerForm.redirectUrl}
                    onChange={(e) =>
                      setBannerForm((prev) => ({ ...prev, redirectUrl: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Starts at</label>
                  <input
                    type="datetime-local"
                    className="form-control bg-light border-0"
                    value={bannerForm.startsAt}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, startsAt: e.target.value }))}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Ends at</label>
                  <input
                    type="datetime-local"
                    className="form-control bg-light border-0"
                    value={bannerForm.endsAt}
                    onChange={(e) => setBannerForm((prev) => ({ ...prev, endsAt: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="banner-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={bannerForm.isActive}
                      onChange={(e) =>
                        setBannerForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    <label htmlFor="banner-active" className="form-check-label small fw-bold">
                      Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1"
                  onClick={closeBannerModal}
                  disabled={bannerSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary-red text-white flex-grow-1"
                  style={{ backgroundColor: "#E51818" }}
                  onClick={saveBanner}
                  disabled={bannerSaving}
                >
                  {bannerSaving ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : editingBannerId ? (
                    "Save Changes"
                  ) : (
                    "Create Banner"
                  )}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {couponModalOpen &&
        createPortal(
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
            style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", zIndex: 1200 }}
          >
            <div className="bg-white rounded-4 p-4 shadow-lg w-100" style={{ maxWidth: 620 }}>
              <h5 className="fw-bold mb-3">
                {editingCouponId ? "Edit Promo Code" : "Create Promo Code"}
              </h5>
              {couponFormError ? (
                <div className="alert alert-danger small py-2">{couponFormError}</div>
              ) : null}

              <div className="row g-3">
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Code *</label>
                  <input
                    className="form-control bg-light border-0 text-uppercase"
                    value={couponForm.code}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
                    }
                    disabled={Boolean(editingCouponId)}
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Title</label>
                  <input
                    className="form-control bg-light border-0"
                    value={couponForm.title}
                    onChange={(e) => setCouponForm((prev) => ({ ...prev, title: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <label className="form-label small text-muted fw-bold">Description</label>
                  <textarea
                    className="form-control bg-light border-0"
                    rows={2}
                    value={couponForm.description}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Discount type</label>
                  <select
                    className="form-select bg-light border-0"
                    value={couponForm.discountType}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, discountType: e.target.value }))
                    }
                  >
                    <option value="FLAT">FLAT (₹)</option>
                    <option value="PERCENT">PERCENT (%)</option>
                  </select>
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Discount value *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control bg-light border-0"
                    value={couponForm.discountValue}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, discountValue: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Minimum order amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control bg-light border-0"
                    value={couponForm.minOrderAmount}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, minOrderAmount: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Max redemptions</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control bg-light border-0"
                    value={couponForm.maxRedemptions}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, maxRedemptions: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Valid from</label>
                  <input
                    type="datetime-local"
                    className="form-control bg-light border-0"
                    value={couponForm.validFrom}
                    onChange={(e) =>
                      setCouponForm((prev) => ({ ...prev, validFrom: e.target.value }))
                    }
                  />
                </div>
                <div className="col-12 col-md-6">
                  <label className="form-label small text-muted fw-bold">Valid to</label>
                  <input
                    type="datetime-local"
                    className="form-control bg-light border-0"
                    value={couponForm.validTo}
                    onChange={(e) => setCouponForm((prev) => ({ ...prev, validTo: e.target.value }))}
                  />
                </div>
                <div className="col-12">
                  <div className="form-check">
                    <input
                      id="coupon-active"
                      type="checkbox"
                      className="form-check-input"
                      checked={couponForm.isActive}
                      onChange={(e) =>
                        setCouponForm((prev) => ({ ...prev, isActive: e.target.checked }))
                      }
                    />
                    <label htmlFor="coupon-active" className="form-check-label small fw-bold">
                      Active
                    </label>
                  </div>
                </div>
              </div>

              <div className="d-flex gap-2 mt-4">
                <button
                  type="button"
                  className="btn btn-light flex-grow-1"
                  onClick={closeCouponModal}
                  disabled={couponSaving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary-red text-white flex-grow-1"
                  style={{ backgroundColor: "#E51818" }}
                  onClick={saveCoupon}
                  disabled={couponSaving}
                >
                  {couponSaving ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : editingCouponId ? (
                    "Save Changes"
                  ) : (
                    "Create Promo"
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

export default CMS;

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CreditCard,
  Settings,
  CheckCircle2,
  Info,
  Banknote,
  AlertTriangle,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  appConfigService,
  getAxiosErrorMessage,
  unwrapEntity,
} from "../services/apiService";

const DEFAULT_FORM = {
  codEnabled: true,
  onlineEnabled: true,
  defaultPaymentType: "ONLINE",
};

function normalizePaymentType(value, fallback = "ONLINE") {
  return value === "COD" || value === "ONLINE" ? value : fallback;
}

function mapFromApi(config) {
  if (!config || typeof config !== "object") return DEFAULT_FORM;
  const codEnabled = Boolean(config.codEnabled);
  const onlineEnabled = Boolean(config.onlineEnabled);
  const safeFallback = codEnabled ? "COD" : "ONLINE";
  return {
    codEnabled,
    onlineEnabled,
    defaultPaymentType: normalizePaymentType(config.defaultPaymentType, safeFallback),
  };
}

function isFormEqual(a, b) {
  return (
    Boolean(a?.codEnabled) === Boolean(b?.codEnabled) &&
    Boolean(a?.onlineEnabled) === Boolean(b?.onlineEnabled) &&
    normalizePaymentType(a?.defaultPaymentType) ===
      normalizePaymentType(b?.defaultPaymentType)
  );
}

const Payments = () => {
  const [form, setForm] = useState(DEFAULT_FORM);
  const [initialForm, setInitialForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [toasts, setToasts] = useState([]);

  const isDirty = useMemo(() => !isFormEqual(form, initialForm), [form, initialForm]);

  const pushToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 3000);
  }, []);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setValidationError("");
    try {
      const res = await appConfigService.getConfig();
      const nextForm = mapFromApi(unwrapEntity(res));
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e, "Failed to load payment config."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handleNavigationAttempt = (event) => {
      if (!isDirty) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!anchor || anchor.getAttribute("target") === "_blank") return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;

      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const nextUrl = new URL(anchor.href, window.location.origin);
      const nextPath = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      if (currentPath === nextPath) return;

      const ok = window.confirm("You have unsaved payment changes. Leave this page?");
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handleNavigationAttempt, true);
    return () =>
      document.removeEventListener("click", handleNavigationAttempt, true);
  }, [isDirty]);

  const applyCodToggle = () => {
    setValidationError("");
    setForm((prev) => {
      const nextCodEnabled = !prev.codEnabled;
      if (!nextCodEnabled && !prev.onlineEnabled) {
        setValidationError("At least one payment mode must remain enabled.");
        return prev;
      }
      const nextDefault =
        !nextCodEnabled && prev.defaultPaymentType === "COD"
          ? "ONLINE"
          : prev.defaultPaymentType;
      return {
        ...prev,
        codEnabled: nextCodEnabled,
        defaultPaymentType: nextDefault,
      };
    });
  };

  const applyOnlineToggle = () => {
    setValidationError("");
    setForm((prev) => {
      const nextOnlineEnabled = !prev.onlineEnabled;
      if (!nextOnlineEnabled && !prev.codEnabled) {
        setValidationError("At least one payment mode must remain enabled.");
        return prev;
      }
      const nextDefault =
        !nextOnlineEnabled && prev.defaultPaymentType === "ONLINE"
          ? "COD"
          : prev.defaultPaymentType;
      return {
        ...prev,
        onlineEnabled: nextOnlineEnabled,
        defaultPaymentType: nextDefault,
      };
    });
  };

  const handleDefaultChange = (event) => {
    const nextValue = normalizePaymentType(event.target.value);
    if (nextValue === "COD" && !form.codEnabled) return;
    if (nextValue === "ONLINE" && !form.onlineEnabled) return;
    setValidationError("");
    setForm((prev) => ({ ...prev, defaultPaymentType: nextValue }));
  };

  const handleSave = async () => {
    if (!form.codEnabled && !form.onlineEnabled) {
      setValidationError("At least one payment mode must remain enabled.");
      return;
    }

    const payload = {
      codEnabled: form.codEnabled,
      onlineEnabled: form.onlineEnabled,
      defaultPaymentType: form.defaultPaymentType,
    };

    setSaving(true);
    setValidationError("");
    setLoadError("");
    try {
      const res = await appConfigService.updateConfig(payload);
      const persisted = mapFromApi(unwrapEntity(res) ?? payload);
      setForm(persisted);
      setInitialForm(persisted);
      pushToast("success", "Payment config published successfully.");
    } catch (e) {
      const message = getAxiosErrorMessage(e, "Failed to publish payment config.");
      setValidationError(message);
      pushToast("danger", message);
    } finally {
      setSaving(false);
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
          <h2 className="fw-bold mb-1">Payment Routing & Gateways</h2>
          <p className="text-muted small mb-0">
            Configure which payment modes users can see and the checkout default.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
          style={{ backgroundColor: "#E51818", color: "white", borderRadius: "10px" }}
          onClick={handleSave}
          disabled={loading || saving || !isDirty}
        >
          {saving ? (
            <span className="spinner-border spinner-border-sm" />
          ) : (
            <Save size={18} />
          )}
          <span>{saving ? "Publishing..." : "Publish Config"}</span>
        </button>
      </div>

      {loadError ? (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4 d-flex justify-content-between align-items-center">
          <span>{loadError}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1"
            onClick={loadConfig}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      ) : null}

      {validationError ? (
        <div className="alert alert-warning rounded-4 border-0 shadow-sm mb-4">
          {validationError}
        </div>
      ) : null}

      {loading ? (
        <div
          className="dashboard-card border-0 d-flex flex-column align-items-center justify-content-center py-5 gap-3"
          style={{ minHeight: 320 }}
        >
          <div
            className="spinner-border text-danger"
            style={{ width: "2.5rem", height: "2.5rem" }}
            role="status"
          />
          <p className="text-muted small mb-0">Loading payment configuration...</p>
        </div>
      ) : (
        <div className="row g-4">
          <div className="col-12 col-xl-8">
            <div className="dashboard-card border-0 shadow-sm p-4 mb-4 bg-white position-relative overflow-hidden">
              <div
                className={`position-absolute h-100 border-start border-4 top-0 start-0 ${form.onlineEnabled ? "border-success" : "border-danger"}`}
              />
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="fw-bold d-flex align-items-center gap-2 text-dark mb-1">
                    {form.onlineEnabled ? (
                      <CheckCircle2 className="text-success" size={20} />
                    ) : (
                      <AlertTriangle className="text-danger" size={20} />
                    )}
                    UPI/Cards/Online
                  </h5>
                  <p
                    className={`small mb-0 ${form.onlineEnabled ? "text-muted" : "text-danger fw-bold"}`}
                  >
                    {form.onlineEnabled
                      ? "Customers can pay online during checkout."
                      : "Online payments are disabled for all users."}
                  </p>
                </div>
                <div
                  className={`badge rounded-pill ${form.onlineEnabled ? "text-bg-success" : "text-bg-danger"}`}
                >
                  {form.onlineEnabled ? "ENABLED" : "DISABLED"}
                </div>
              </div>
            </div>

            <div className="dashboard-card border-0 shadow-sm mb-4">
              <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                <Settings size={20} className="text-primary-red" /> Dynamic Payment Methods
              </h5>
              <div className="d-flex flex-column gap-3">
                <div className="p-3 border rounded-3 d-flex align-items-center justify-content-between transition-all hover-bg-light">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-light rounded-3">
                      <Banknote
                        size={20}
                        className={form.codEnabled ? "text-primary-red" : "text-muted"}
                      />
                    </div>
                    <div>
                      <p className="mb-0 fw-bold small">Cash on Delivery</p>
                      <small className="text-muted" style={{ fontSize: "10px" }}>
                        Rider collects payment at delivery.
                      </small>
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      aria-label="Cash on Delivery toggle"
                      checked={form.codEnabled}
                      onChange={applyCodToggle}
                      style={{ width: "45px", height: "22px" }}
                    />
                  </div>
                </div>

                <div className="p-3 border rounded-3 d-flex align-items-center justify-content-between transition-all hover-bg-light">
                  <div className="d-flex align-items-center gap-3">
                    <div className="p-2 bg-light rounded-3">
                      <CreditCard
                        size={20}
                        className={form.onlineEnabled ? "text-primary-red" : "text-muted"}
                      />
                    </div>
                    <div>
                      <p className="mb-0 fw-bold small">UPI/Cards/Online</p>
                      <small className="text-muted" style={{ fontSize: "10px" }}>
                        Supports prepaid digital payments.
                      </small>
                    </div>
                  </div>
                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      aria-label="Online payment toggle"
                      checked={form.onlineEnabled}
                      onChange={applyOnlineToggle}
                      style={{ width: "45px", height: "22px" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="dashboard-card border-0 shadow-sm p-4">
              <h5 className="fw-bold mb-3">Default Payment Selection</h5>
              <select
                className="form-select bg-light border-0 py-2 fw-bold"
                aria-label="Default payment mode"
                value={form.defaultPaymentType}
                onChange={handleDefaultChange}
                style={{ borderRadius: "10px", maxWidth: "360px" }}
              >
                <option value="ONLINE" disabled={!form.onlineEnabled}>
                  Default: Online
                </option>
                <option value="COD" disabled={!form.codEnabled}>
                  Default: COD
                </option>
              </select>
              <p className="small text-muted mt-3 mb-0">
                If the selected default is disabled, it automatically switches to the
                enabled mode.
              </p>
            </div>
          </div>

          <div className="col-12 col-xl-4 h-100">
            <div className="dashboard-card border-0 shadow-sm mb-4 h-100 d-flex flex-column">
              <h5 className="fw-bold mb-4">Config Status</h5>

              <div className="d-flex flex-column gap-3 mb-4">
                <div className="p-3 border rounded-3 position-relative">
                  <p className="mb-1 fw-bold small">Cash on Delivery</p>
                  <small className="text-muted">
                    {form.codEnabled ? "Enabled" : "Disabled"}
                  </small>
                </div>

                <div className="p-3 border rounded-3 position-relative">
                  <p className="mb-1 fw-bold small">UPI/Cards/Online</p>
                  <small className="text-muted">
                    {form.onlineEnabled ? "Enabled" : "Disabled"}
                  </small>
                </div>

                <div className="p-3 border rounded-3 position-relative">
                  <p className="mb-1 fw-bold small">Default payment mode</p>
                  <small className="text-muted">{form.defaultPaymentType}</small>
                </div>
              </div>

              <div className="p-3 bg-light rounded-3 d-flex gap-2 mt-auto text-center">
                <Info size={16} className="text-info flex-shrink-0 mt-1" />
                <p className="mb-0 text-muted mx-auto" style={{ fontSize: "10px" }}>
                  Save is enabled only when changes are detected. Unsaved changes prompt
                  before leaving this page.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;

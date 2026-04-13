import { useState, useEffect, useCallback } from "react";
import {
  Save,
  RotateCcw,
  Pencil,
  SlidersHorizontal,
  Percent,
  Banknote,
  Route,
  Weight,
} from "lucide-react";
import { appConfigService, unwrapEntity } from "../services/apiService";

const emptyForm = () => ({
  id: "",
  gstPercent: "",
  platformFee: "",
  pickupRatePerKm: "",
  dropRatePerKm: "",
  perKgRate: "",
  defaultRouteRatePerKm: "",
});

function mapFromApi(cfg) {
  if (!cfg || typeof cfg !== "object") return emptyForm();
  return {
    id: cfg.id != null ? String(cfg.id) : "",
    gstPercent: cfg.gstPercent ?? "",
    platformFee: cfg.platformFee ?? "",
    pickupRatePerKm: cfg.pickupRatePerKm ?? "",
    dropRatePerKm: cfg.dropRatePerKm ?? "",
    perKgRate: cfg.perKgRate ?? "",
    defaultRouteRatePerKm: cfg.defaultRouteRatePerKm ?? "",
  };
}

const DeliveryFee = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await appConfigService.getConfig();
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg));
    } catch (e) {
      setLoadError(
        e?.response?.data?.message || e?.message || "Failed to load config."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleChange = (field) => (e) => {
    const v = e.target.value;
    setForm((f) => ({ ...f, [field]: v }));
  };

  const parseNum = (s) => {
    const n = Number(String(s).trim());
    return Number.isFinite(n) ? n : 0;
  };

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    const id = parseInt(String(form.id || "1"), 10) || 1;
    setSaving(true);
    setLoadError("");
    try {
      const payload = {
        id,
        gstPercent: parseNum(form.gstPercent),
        platformFee: parseNum(form.platformFee),
        pickupRatePerKm: parseNum(form.pickupRatePerKm),
        dropRatePerKm: parseNum(form.dropRatePerKm),
        perKgRate: parseNum(form.perKgRate),
        defaultRouteRatePerKm: parseNum(form.defaultRouteRatePerKm),
      };
      const res = await appConfigService.updateConfig(payload);
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg ?? payload));
      setIsEditing(false);
    } catch (e) {
      setLoadError(
        e?.response?.data?.message || e?.message || "Failed to save config."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm("Reload config from server? Unsaved edits will be lost."))
      return;
    setIsEditing(false);
    load();
  };

  const fields = [
    {
      key: "gstPercent",
      label: "GST",
      suffix: "%",
      icon: Percent,
      hint: "Tax percentage applied to the order",
    },
    {
      key: "platformFee",
      label: "Platform fee",
      suffix: "₹",
      icon: Banknote,
      hint: "Flat platform charge per order",
    },
    {
      key: "pickupRatePerKm",
      label: "Pickup rate / km",
      suffix: "₹/km",
      icon: Route,
      hint: "Rate for pickup leg",
    },
    {
      key: "dropRatePerKm",
      label: "Drop rate / km",
      suffix: "₹/km",
      icon: Route,
      hint: "Rate for drop leg",
    },
    {
      key: "perKgRate",
      label: "Per kg rate",
      suffix: "₹/kg",
      icon: Weight,
      hint: "Weight-based component",
    },
    {
      key: "defaultRouteRatePerKm",
      label: "Default route rate / km",
      suffix: "₹/km",
      icon: SlidersHorizontal,
      hint: "Fallback route pricing",
    },
  ];

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">App configuration</h2>
          <p className="text-muted small mb-0">
            GET/PUT <code className="small">/admin/config</code> — GST, fees,
            and route rates.
          </p>
          {form.id ? (
            <p className="small text-muted mb-0 mt-2">
              Config id: <span className="fw-semibold text-dark">{form.id}</span>
            </p>
          ) : null}
        </div>
        <div className="d-flex gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="btn btn-outline-secondary d-flex align-items-center gap-2 rounded-3"
            disabled={loading || saving}
          >
            <RotateCcw size={18} />
            Reload
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="btn d-flex align-items-center gap-2 rounded-3 text-white border-0 shadow-sm px-4"
            style={{ backgroundColor: "#E51818" }}
            disabled={loading || saving}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : isEditing ? (
              <Save size={18} />
            ) : (
              <Pencil size={18} />
            )}
            {isEditing ? "Save changes" : "Edit"}
          </button>
        </div>
      </div>

      {loadError ? (
        <div className="alert alert-danger rounded-4 border-0 shadow-sm mb-4">
          {loadError}
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
          <p className="text-muted small mb-0">Loading configuration…</p>
        </div>
      ) : (
        <div className="row g-3 g-md-4">
          {fields.map(({ key, label, suffix, icon: Icon, hint }) => (
            <div key={key} className="col-12 col-md-6">
              <div className="dashboard-card border-0 h-100 shadow-sm">
                <div className="d-flex align-items-start gap-3 mb-2">
                  <div
                    className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                    style={{ background: "rgba(229, 24, 24, 0.08)" }}
                  >
                    <Icon size={20} style={{ color: "#E51818" }} />
                  </div>
                  <div className="flex-grow-1 min-w-0">
                    <label className="form-label fw-semibold mb-0 d-block">
                      {label}
                    </label>
                    <p className="text-muted small mb-2 mb-md-3">{hint}</p>
                    <div className="input-group">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-control border-0 bg-light rounded-start-3 py-2"
                        value={form[key]}
                        onChange={handleChange(key)}
                        disabled={!isEditing}
                      />
                      <span className="input-group-text border-0 bg-light text-muted small rounded-end-3">
                        {suffix}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DeliveryFee;

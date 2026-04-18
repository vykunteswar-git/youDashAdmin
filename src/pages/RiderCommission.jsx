import { useState, useEffect, useCallback } from "react";
import {
  Save,
  RotateCcw,
  Pencil,
  Percent,
  Banknote,
  TrendingUp,
  Route,
  Wallet,
} from "lucide-react";
import {
  commissionService,
  unwrapEntity,
  readApiMessage,
  isApiFailureBody,
  getAxiosErrorMessage,
} from "../services/apiService";

const emptyForm = () => ({
  onlineCommissionPercent: "",
  codCashCommissionPercent: "",
  codQrCommissionPercent: "",
  peakSurgeBonusFlat: "",
  baseFee: "",
  perKmRate: "",
});

function mapFromApi(cfg) {
  if (!cfg || typeof cfg !== "object") return emptyForm();
  return {
    onlineCommissionPercent: cfg.onlineCommissionPercent ?? "",
    codCashCommissionPercent: cfg.codCashCommissionPercent ?? "",
    codQrCommissionPercent: cfg.codQrCommissionPercent ?? "",
    peakSurgeBonusFlat: cfg.peakSurgeBonusFlat ?? "",
    baseFee: cfg.baseFee ?? "",
    perKmRate: cfg.perKmRate ?? "",
  };
}

const RiderCommission = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setSuccessMsg("");
    try {
      const res = await commissionService.getConfig();
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setLoadError(readApiMessage(raw) || "Failed to load commission config.");
        return;
      }
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg));
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e, "Failed to load commission config."));
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
    setSaving(true);
    setLoadError("");
    setSuccessMsg("");
    try {
      const payload = {
        onlineCommissionPercent: parseNum(form.onlineCommissionPercent),
        codCashCommissionPercent: parseNum(form.codCashCommissionPercent),
        codQrCommissionPercent: parseNum(form.codQrCommissionPercent),
        peakSurgeBonusFlat: parseNum(form.peakSurgeBonusFlat),
        baseFee: parseNum(form.baseFee),
        perKmRate: parseNum(form.perKmRate),
      };
      const res = await commissionService.saveConfig(payload);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setLoadError(readApiMessage(raw) || "Failed to save commission config.");
        return;
      }
      const cfg = unwrapEntity(res);
      setForm(mapFromApi(cfg ?? payload));
      setSuccessMsg(readApiMessage(raw) || "Commission config saved.");
      setIsEditing(false);
    } catch (e) {
      setLoadError(getAxiosErrorMessage(e, "Failed to save commission config."));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (
      !window.confirm(
        "Reload commission config from server? Unsaved edits will be lost."
      )
    )
      return;
    setIsEditing(false);
    setSuccessMsg("");
    load();
  };

  const fields = [
    {
      key: "onlineCommissionPercent",
      label: "Online commission",
      suffix: "%",
      icon: Percent,
      hint: "Commission on online-paid orders",
    },
    {
      key: "codCashCommissionPercent",
      label: "COD cash commission",
      suffix: "%",
      icon: Banknote,
      hint: "Commission when COD is settled as cash",
    },
    {
      key: "codQrCommissionPercent",
      label: "COD QR commission",
      suffix: "%",
      icon: Wallet,
      hint: "Commission when COD is paid via QR",
    },
    {
      key: "peakSurgeBonusFlat",
      label: "Peak surge bonus (flat)",
      suffix: "₹",
      icon: TrendingUp,
      hint: "Flat bonus during peak / surge",
    },
    {
      key: "baseFee",
      label: "Base fee",
      suffix: "₹",
      icon: Banknote,
      hint: "Fixed base component for rider payout",
    },
    {
      key: "perKmRate",
      label: "Per km rate",
      suffix: "₹/km",
      icon: Route,
      hint: "Distance-based component",
    },
  ];

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Rider commission</h2>
          <p className="text-muted small mb-0">
            <code className="small">GET /admin/commission/config</code> ·{" "}
            <code className="small">POST /admin/commission/config</code>
          </p>
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
      {successMsg ? (
        <div className="alert alert-success rounded-4 border-0 shadow-sm mb-4">
          {successMsg}
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
          <p className="text-muted small mb-0">Loading commission config…</p>
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

export default RiderCommission;

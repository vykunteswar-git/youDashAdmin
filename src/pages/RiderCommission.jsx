import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Save,
  RotateCcw,
  Pencil,
  Percent,
  Banknote,
  Wallet,
  Calculator,
  Info,
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

const percentFields = [
  {
    key: "onlineCommissionPercent",
    label: "Online commission %",
    hint: "Applied to online-paid orders",
    icon: Percent,
  },
  {
    key: "codCashCommissionPercent",
    label: "COD cash commission %",
    hint: "Applied to COD paid by cash",
    icon: Banknote,
  },
  {
    key: "codQrCommissionPercent",
    label: "COD QR commission %",
    hint: "Applied to COD paid by QR",
    icon: Wallet,
  },
];

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

function parseNum(v) {
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : 0;
}

function getPercentValidationError(v) {
  const s = String(v).trim();
  if (!s) return "Required.";
  const n = Number(s);
  if (!Number.isFinite(n)) return "Must be a valid number.";
  if (n < 0 || n > 100) return "Must be between 0 and 100.";
  return "";
}

const RiderCommission = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [sampleOrderAmount, setSampleOrderAmount] = useState("100");
  const [fieldErrors, setFieldErrors] = useState({});

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
      setFieldErrors({});
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
    if (percentFields.some((x) => x.key === field)) {
      setFieldErrors((prev) => ({ ...prev, [field]: getPercentValidationError(v) }));
    }
  };

  const handleSave = async () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }
    const nextErrors = {};
    for (const f of percentFields) {
      const err = getPercentValidationError(form[f.key]);
      if (err) nextErrors[f.key] = err;
    }
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setLoadError("Please fix validation errors before saving.");
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
    setFieldErrors({});
    load();
  };

  const previewBaseAmount = useMemo(() => {
    const n = Number(String(sampleOrderAmount).trim());
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [sampleOrderAmount]);

  const previewRows = useMemo(
    () =>
      [
        { key: "onlineCommissionPercent", label: "Online" },
        { key: "codCashCommissionPercent", label: "COD cash" },
        { key: "codQrCommissionPercent", label: "COD QR" },
      ].map((x) => {
        const percent = Math.max(0, Math.min(100, parseNum(form[x.key])));
        const appCommission = (previewBaseAmount * percent) / 100;
        const riderEarning = previewBaseAmount - appCommission;
        return {
          ...x,
          percent,
          appCommission,
          riderEarning,
        };
      }),
    [form, previewBaseAmount]
  );

  const formatMoney = (v) =>
    new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(v);

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Rider commission</h2>
          <p className="text-muted small mb-0">
            Percentage-based payout split:{" "}
            <code className="small">commissionAmount = orderAmount × (commission% / 100)</code>
            {" · "}
            <code className="small">riderEarning = orderAmount - commissionAmount</code>
          </p>
          <p className="text-muted small mb-0 mt-1">
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
        <>
          <div className="row g-3 g-md-4 mb-1">
            {percentFields.map(({ key, label, icon: Icon, hint }) => {
              const percent = parseNum(form[key]);
              const riderShare = 100 - percent;
              const isValid = !fieldErrors[key];
              return (
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
                            max="100"
                            className={`form-control border-0 bg-light rounded-start-3 py-2 ${
                              fieldErrors[key] ? "is-invalid" : ""
                            }`}
                            value={form[key]}
                            onChange={handleChange(key)}
                            disabled={!isEditing}
                          />
                          <span className="input-group-text border-0 bg-light text-muted small rounded-end-3">
                            %
                          </span>
                        </div>
                        {fieldErrors[key] ? (
                          <div className="text-danger small mt-2">{fieldErrors[key]}</div>
                        ) : null}
                        {isValid ? (
                          <div className="small text-muted mt-2">
                            Rider share = 100 - commission % ={" "}
                            <span className="fw-semibold">
                              {Number.isFinite(riderShare) ? riderShare.toFixed(2) : "0.00"}%
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dashboard-card border-0 shadow-sm mt-3">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div
                className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ background: "rgba(229, 24, 24, 0.08)" }}
              >
                <Calculator size={20} style={{ color: "#E51818" }} />
              </div>
              <div className="flex-grow-1">
                <h5 className="fw-bold mb-1">Payout preview calculator</h5>
                <p className="text-muted small mb-0">
                  Enter a sample order amount to preview app commission and rider earning
                  for each payment mode.
                </p>
              </div>
            </div>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small">Sample order amount</label>
                <div className="input-group">
                  <span className="input-group-text border-0 bg-light text-muted small">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control border-0 bg-light py-2"
                    value={sampleOrderAmount}
                    onChange={(e) => setSampleOrderAmount(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="table-responsive mt-3">
              <table className="table mb-0 align-middle">
                <thead className="bg-light">
                  <tr>
                    <th className="small text-muted border-0">Mode</th>
                    <th className="small text-muted border-0">Commission %</th>
                    <th className="small text-muted border-0">App commission amount</th>
                    <th className="small text-muted border-0">Rider earning amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r) => (
                    <tr key={r.key}>
                      <td className="small fw-semibold">{r.label}</td>
                      <td className="small">{r.percent.toFixed(2)}%</td>
                      <td className="small">₹{formatMoney(r.appCommission)}</td>
                      <td className="small fw-semibold text-success">
                        ₹{formatMoney(r.riderEarning)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small text-muted mt-3 mb-0">
              QA quick check: with ₹100 and 30% commission, preview should show app ₹30 and rider ₹70.
            </p>
          </div>

          <div className="dashboard-card border-0 shadow-sm mt-3 bg-light-subtle">
            <div className="d-flex align-items-start gap-2">
              <Info size={16} className="text-muted mt-1 flex-shrink-0" />
              <div>
                <p className="fw-semibold mb-1">Legacy fields (not used in payout split)</p>
                <p className="text-muted small mb-3">
                  These values are retained only for backward compatibility with older DTOs.
                  Current payout calculation uses percentage fields above.
                </p>
              </div>
            </div>
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <label className="form-label small text-muted">Base fee (legacy)</label>
                <input
                  type="number"
                  className="form-control bg-light"
                  value={form.baseFee}
                  disabled
                  readOnly
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small text-muted">Per km rate (legacy)</label>
                <input
                  type="number"
                  className="form-control bg-light"
                  value={form.perKmRate}
                  disabled
                  readOnly
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label small text-muted">Peak surge bonus (legacy)</label>
                <input
                  type="number"
                  className="form-control bg-light"
                  value={form.peakSurgeBonusFlat}
                  disabled
                  readOnly
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RiderCommission;

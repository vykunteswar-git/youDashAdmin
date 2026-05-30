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
  Plus,
  Trash2,
} from "lucide-react";
import { appConfigService, unwrapEntity } from "../services/apiService";

const emptyTier = () => ({
  minWeightKg: "",
  maxWeightKg: "",
  ratePerKm: "",
});

const emptyForm = () => ({
  id: "",
  gstPercent: "",
  incityPlatformFee: "",
  outstationPlatformFee: "",
  pickupRatePerKm: "",
  dropRatePerKm: "",
  perKgRate: "",
  defaultRouteRatePerKm: "",
  pickupLegTiers: [emptyTier()],
  dropLegTiers: [emptyTier()],
});

function mapTierFromApi(t) {
  if (!t || typeof t !== "object") return emptyTier();
  return {
    minWeightKg: t.minWeightKg ?? "",
    maxWeightKg: t.maxWeightKg ?? "",
    ratePerKm: t.ratePerKm ?? "",
  };
}

function mapFromApi(cfg) {
  if (!cfg || typeof cfg !== "object") return emptyForm();
  const pickupTiers =
    Array.isArray(cfg.pickupLegTiers) && cfg.pickupLegTiers.length > 0
      ? cfg.pickupLegTiers.map(mapTierFromApi)
      : [emptyTier()];
  const dropTiers =
    Array.isArray(cfg.dropLegTiers) && cfg.dropLegTiers.length > 0
      ? cfg.dropLegTiers.map(mapTierFromApi)
      : [emptyTier()];
  return {
    id: cfg.id != null ? String(cfg.id) : "",
    gstPercent: cfg.gstPercent ?? "",
    incityPlatformFee: cfg.incityPlatformFee ?? cfg.platformFee ?? "",
    outstationPlatformFee: cfg.outstationPlatformFee ?? cfg.platformFee ?? "",
    pickupRatePerKm: cfg.pickupRatePerKm ?? "",
    dropRatePerKm: cfg.dropRatePerKm ?? "",
    perKgRate: cfg.perKgRate ?? "",
    defaultRouteRatePerKm: cfg.defaultRouteRatePerKm ?? "",
    pickupLegTiers: pickupTiers,
    dropLegTiers: dropTiers,
  };
}

function TierTableBody({ tiers, legKey, isEditing, onChange, onAdd, onRemove }) {
  return (
    <>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-2">
          <thead className="table-light">
            <tr>
              <th>Min kg (incl.)</th>
              <th>Max kg (excl.)</th>
              <th>Rate ₹/km</th>
              {isEditing ? <th style={{ width: 48 }} /> : null}
            </tr>
          </thead>
          <tbody>
            {tiers.map((row, idx) => (
              <tr key={`${legKey}-${idx}`}>
                <td>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-control form-control-sm border-0 bg-light"
                    value={row.minWeightKg}
                    disabled={!isEditing}
                    onChange={(e) =>
                      onChange(legKey, idx, "minWeightKg", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-control form-control-sm border-0 bg-light"
                    value={row.maxWeightKg}
                    disabled={!isEditing}
                    onChange={(e) =>
                      onChange(legKey, idx, "maxWeightKg", e.target.value)
                    }
                  />
                </td>
                <td>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control form-control-sm border-0 bg-light"
                    value={row.ratePerKm}
                    disabled={!isEditing}
                    onChange={(e) =>
                      onChange(legKey, idx, "ratePerKm", e.target.value)
                    }
                  />
                </td>
                {isEditing ? (
                  <td>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger border-0"
                      onClick={() => onRemove(legKey, idx)}
                      disabled={tiers.length <= 1}
                      aria-label="Remove tier"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isEditing ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-3 d-inline-flex align-items-center gap-1"
          onClick={() => onAdd(legKey)}
        >
          <Plus size={16} />
          Add band
        </button>
      ) : null}
    </>
  );
}

/** Finance → App config — single screen for GET/PUT /admin/config */
const AppConfig = () => {
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

  const handleTierChange = (legKey, index, field, value) => {
    setForm((f) => {
      const list = [...f[legKey]];
      list[index] = { ...list[index], [field]: value };
      return { ...f, [legKey]: list };
    });
  };

  const addTier = (legKey) => {
    setForm((f) => ({ ...f, [legKey]: [...f[legKey], emptyTier()] }));
  };

  const removeTier = (legKey, index) => {
    setForm((f) => {
      const list = f[legKey].filter((_, i) => i !== index);
      return { ...f, [legKey]: list.length ? list : [emptyTier()] };
    });
  };

  const parseNum = (s) => {
    const n = Number(String(s).trim());
    return Number.isFinite(n) ? n : 0;
  };

  const tiersToPayload = (rows, legType) =>
    rows
      .map((row, sortOrder) => ({
        legType,
        minWeightKg: parseNum(row.minWeightKg),
        maxWeightKg: parseNum(row.maxWeightKg),
        ratePerKm: parseNum(row.ratePerKm),
        sortOrder,
        isActive: true,
      }))
      .filter((t) => t.maxWeightKg > t.minWeightKg);

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
        incityPlatformFee: parseNum(form.incityPlatformFee),
        outstationPlatformFee: parseNum(form.outstationPlatformFee),
        pickupRatePerKm: parseNum(form.pickupRatePerKm),
        dropRatePerKm: parseNum(form.dropRatePerKm),
        perKgRate: parseNum(form.perKgRate),
        defaultRouteRatePerKm: parseNum(form.defaultRouteRatePerKm),
        pickupLegTiers: tiersToPayload(form.pickupLegTiers, "PICKUP"),
        dropLegTiers: tiersToPayload(form.dropLegTiers, "DROP"),
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

  const scalarFields = [
    {
      key: "gstPercent",
      label: "GST",
      suffix: "%",
      icon: Percent,
      hint: "Tax percentage applied to the order",
    },
    {
      key: "incityPlatformFee",
      label: "In-city platform fee",
      suffix: "₹",
      icon: Banknote,
      hint: "Flat fee per same-zone (in-city) order",
    },
    {
      key: "outstationPlatformFee",
      label: "Outstation platform fee",
      suffix: "₹",
      icon: Banknote,
      hint: "Flat fee per inter-city (outstation) order",
    },
    {
      key: "pickupRatePerKm",
      label: "Pickup fallback / km",
      suffix: "₹/km",
      icon: Route,
      hint: "Used when parcel weight matches no pickup band",
    },
    {
      key: "dropRatePerKm",
      label: "Drop fallback / km",
      suffix: "₹/km",
      icon: Route,
      hint: "Used when parcel weight matches no drop band",
    },
    {
      key: "perKgRate",
      label: "Per kg rate",
      suffix: "₹/kg",
      icon: Weight,
      hint: "Weight-based component (outstation)",
    },
    {
      key: "defaultRouteRatePerKm",
      label: "Default route rate / km",
      suffix: "₹/km",
      icon: SlidersHorizontal,
      hint: "Fallback hub-to-hub pricing",
    },
  ];

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">App config</h2>
          <p className="text-muted small mb-0">
            <code className="small">GET/PUT /admin/config</code> — GST, platform
            fees, outstation leg rates by weight, and hub route defaults.
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
        <>
          <div className="row g-3 g-md-4">
            {scalarFields.map(({ key, label, suffix, icon: Icon, hint }) => (
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

          <div className="dashboard-card border-0 shadow-sm mt-3 mt-md-4">
            <h5 className="fw-semibold mb-1">Outstation leg rates (by weight)</h5>
            <p className="text-muted small mb-4">
              Pickup and drop ₹/km bands for outstation quotes. Max kg is exclusive
              (e.g. 10 kg uses the 10–20 band, not 0–10).
            </p>

            <h6 className="fw-semibold small text-uppercase text-muted mb-2">
              Pickup leg
            </h6>
            <TierTableBody
              tiers={form.pickupLegTiers}
              legKey="pickupLegTiers"
              isEditing={isEditing}
              onChange={handleTierChange}
              onAdd={addTier}
              onRemove={removeTier}
            />

            <hr className="my-4" />

            <h6 className="fw-semibold small text-uppercase text-muted mb-2">
              Drop leg
            </h6>
            <TierTableBody
              tiers={form.dropLegTiers}
              legKey="dropLegTiers"
              isEditing={isEditing}
              onChange={handleTierChange}
              onAdd={addTier}
              onRemove={removeTier}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default AppConfig;

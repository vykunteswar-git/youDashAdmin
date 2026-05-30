import { useState, useEffect, useCallback, useMemo } from "react";
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
  MapPin,
  Truck,
  Info,
  ArrowRight,
  Package,
} from "lucide-react";
import { appConfigService, unwrapEntity } from "../services/apiService";

const BRAND = "#E51818";

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

function parseNum(s) {
  const n = Number(String(s ?? "").trim());
  return Number.isFinite(n) ? n : 0;
}

/** min inclusive, max exclusive */
function resolveTierRate(tiers, weightKg, fallback) {
  if (weightKg <= 0) return { rate: fallback, matched: false };
  for (const t of tiers) {
    const min = parseNum(t.minWeightKg);
    const max = parseNum(t.maxWeightKg);
    if (max > min && weightKg >= min && weightKg < max) {
      return { rate: parseNum(t.ratePerKm), matched: true, min, max };
    }
  }
  return { rate: fallback, matched: false };
}

function Section({ id, icon: Icon, title, subtitle, children }) {
  return (
    <section
      id={id}
      className="dashboard-card border-0 shadow-sm mb-4"
      style={{ scrollMarginTop: "5rem" }}
    >
      <div className="d-flex align-items-start gap-3 mb-4 pb-3 border-bottom">
        <div
          className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ background: "rgba(229, 24, 24, 0.08)" }}
        >
          <Icon size={22} style={{ color: BRAND }} />
        </div>
        <div>
          <h5 className="fw-bold mb-1">{title}</h5>
          <p className="text-muted small mb-0">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, suffix, value, onChange, disabled, example }) {
  return (
    <div className="mb-0">
      <label className="form-label fw-semibold mb-1">{label}</label>
      {hint ? <p className="text-muted small mb-2">{hint}</p> : null}
      <div className="input-group">
        <input
          type="number"
          step="0.01"
          min="0"
          className="form-control border-0 bg-light rounded-start-3"
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <span className="input-group-text border-0 bg-light text-muted small rounded-end-3">
          {suffix}
        </span>
      </div>
      {example ? (
        <p className="small text-muted mb-0 mt-2">
          <span className="text-secondary">Example:</span> {example}
        </p>
      ) : null}
    </div>
  );
}

function ServiceFeeCard({ title, badge, description, fieldLabel, value, onChange, disabled }) {
  return (
    <div className="h-100 p-3 p-md-4 rounded-4 border bg-white">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <span
          className="badge rounded-pill"
          style={{ background: "rgba(229, 24, 24, 0.1)", color: BRAND }}
        >
          {badge}
        </span>
      </div>
      <h6 className="fw-bold mb-1">{title}</h6>
      <p className="text-muted small mb-3">{description}</p>
      <Field
        label={fieldLabel}
        suffix="₹ flat"
        value={value}
        onChange={onChange}
        disabled={disabled}
        example="Added once per order on top of fare + GST"
      />
    </div>
  );
}

function WeightBandsEditor({
  title,
  legLabel,
  tiers,
  legKey,
  isEditing,
  onChange,
  onAdd,
  onRemove,
  previewWeight,
  fallbackRate,
}) {
  const preview = resolveTierRate(tiers, previewWeight, parseNum(fallbackRate));

  return (
    <div className="h-100">
      <h6 className="fw-bold mb-1">{title}</h6>
      <p className="text-muted small mb-3">{legLabel}</p>

      <div
        className="rounded-3 px-3 py-2 mb-3 small"
        style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
      >
        <span className="text-muted">Preview at </span>
        <strong>{previewWeight} kg</strong>
        <span className="text-muted"> → </span>
        <strong style={{ color: BRAND }}>
          ₹{preview.rate}/km
          {preview.matched
            ? ` (band ${preview.min}–${preview.max} kg)`
            : " (fallback)"}
        </strong>
      </div>

      <div className="d-flex flex-column gap-2">
        {tiers.map((row, idx) => (
          <div
            key={`${legKey}-${idx}`}
            className="rounded-3 p-3 bg-light border border-light-subtle"
          >
            <div className="d-flex justify-content-between align-items-center mb-2">
              <span className="badge text-bg-secondary rounded-pill">
                Band {idx + 1}
              </span>
              {isEditing && tiers.length > 1 ? (
                <button
                  type="button"
                  className="btn btn-sm btn-link text-danger p-0"
                  onClick={() => onRemove(legKey, idx)}
                  aria-label="Remove band"
                >
                  <Trash2 size={16} />
                </button>
              ) : null}
            </div>
            <div className="row g-2">
              <div className="col-4">
                <label className="form-label small text-muted mb-0">From kg</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control form-control-sm"
                  value={row.minWeightKg}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onChange(legKey, idx, "minWeightKg", e.target.value)
                  }
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-muted mb-0">Up to kg</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control form-control-sm"
                  value={row.maxWeightKg}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onChange(legKey, idx, "maxWeightKg", e.target.value)
                  }
                />
              </div>
              <div className="col-4">
                <label className="form-label small text-muted mb-0">₹/km</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-control form-control-sm"
                  value={row.ratePerKm}
                  disabled={!isEditing}
                  onChange={(e) =>
                    onChange(legKey, idx, "ratePerKm", e.target.value)
                  }
                />
              </div>
            </div>
            <p className="small text-muted mb-0 mt-2">
              Applies when weight is ≥ {row.minWeightKg || "0"} kg and &lt;{" "}
              {row.maxWeightKg || "?"} kg
            </p>
          </div>
        ))}
      </div>
      {isEditing ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-3 mt-2 d-inline-flex align-items-center gap-1"
          onClick={() => onAdd(legKey)}
        >
          <Plus size={16} />
          Add weight band
        </button>
      ) : null}
    </div>
  );
}

function OutstationFormulaStrip() {
  const steps = [
    { label: "Pickup km", sub: "× pickup ₹/km" },
    { label: "+ Hub km", sub: "× hub route ₹/km" },
    { label: "+ Drop km", sub: "× drop ₹/km" },
    { label: "+ Weight", sub: "× ₹/kg" },
    { label: "+ GST %", sub: "on subtotal" },
    { label: "+ Platform ₹", sub: "outstation flat" },
  ];
  return (
    <div
      className="rounded-4 p-3 mb-4 d-flex flex-wrap align-items-center gap-2 small"
      style={{ background: "linear-gradient(135deg, #fff5f5 0%, #f8fafc 100%)" }}
    >
      <Package size={18} style={{ color: BRAND }} className="flex-shrink-0" />
      <span className="fw-semibold text-dark me-1">Outstation total =</span>
      {steps.map((s, i) => (
        <span key={s.label} className="d-inline-flex align-items-center gap-1">
          {i > 0 ? <ArrowRight size={14} className="text-muted" /> : null}
          <span
            className="badge rounded-pill bg-white text-dark border px-2 py-2"
            title={s.sub}
          >
            {s.label}
          </span>
        </span>
      ))}
    </div>
  );
}

const AppConfig = () => {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewWeight, setPreviewWeight] = useState("8");

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

  const previewKg = useMemo(() => parseNum(previewWeight) || 8, [previewWeight]);

  const handleChange = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
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
    if (!window.confirm("Reload from server? Unsaved edits will be lost.")) return;
    setIsEditing(false);
    load();
  };

  const sectionLinks = [
    { id: "section-tax", label: "Tax" },
    { id: "section-incity", label: "In-city" },
    { id: "section-outstation", label: "Outstation" },
    { id: "section-bands", label: "Weight bands" },
  ];

  return (
    <div className="container-fluid fade-in pb-5" style={{ maxWidth: 1080 }}>
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-2">App config</h2>
          <p className="text-muted mb-2" style={{ maxWidth: 520 }}>
            Controls how the <strong>Parcel app</strong> calculates prices when
            customers get a quote. Changes apply on the next booking — no app
            update needed.
          </p>
          {!loading && !loadError ? (
            <div className="d-flex flex-wrap gap-2">
              {sectionLinks.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="btn btn-sm btn-light border rounded-pill text-secondary"
                >
                  {s.label}
                </a>
              ))}
            </div>
          ) : null}
        </div>
        <div className="d-flex gap-2 flex-shrink-0 align-self-start">
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
            style={{ backgroundColor: BRAND }}
            disabled={loading || saving}
          >
            {saving ? (
              <span className="spinner-border spinner-border-sm" />
            ) : isEditing ? (
              <Save size={18} />
            ) : (
              <Pencil size={18} />
            )}
            {isEditing ? "Save all" : "Edit pricing"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div
          className="alert border-0 rounded-4 mb-4 d-flex align-items-start gap-2"
          style={{ background: "#fff8e6" }}
        >
          <Info size={20} className="text-warning flex-shrink-0 mt-1" />
          <div className="small">
            <strong>Editing mode.</strong> Update fields below, then click{" "}
            <strong>Save all</strong>. Hub-specific route rates are still managed
            under <strong>Hub routes</strong>; vehicle fares under{" "}
            <strong>Vehicles</strong>.
          </div>
        </div>
      ) : null}

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
          <p className="text-muted small mb-0">Loading pricing settings…</p>
        </div>
      ) : (
        <>
          <Section
            id="section-tax"
            icon={Percent}
            title="Tax (all orders)"
            subtitle="GST is calculated on the fare subtotal before the platform fee is added."
          >
            <div className="row">
              <div className="col-12 col-md-6 col-lg-4">
                <Field
                  label="GST rate"
                  hint="Shown on customer receipt and added to subtotal."
                  suffix="%"
                  value={form.gstPercent}
                  onChange={handleChange("gstPercent")}
                  disabled={!isEditing}
                  example="18% on ₹100 subtotal → ₹18 GST"
                />
              </div>
            </div>
          </Section>

          <Section
            id="section-incity"
            icon={MapPin}
            title="In-city (same zone)"
            subtitle="Customer pickup and drop are in the same service zone. Fare is mainly from the vehicle; platform fee is a flat add-on."
          >
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <ServiceFeeCard
                  title="Platform fee"
                  badge="In-city"
                  description="Fixed charge added to every local delivery after vehicle fare + GST."
                  fieldLabel="Amount per order"
                  value={form.incityPlatformFee}
                  onChange={handleChange("incityPlatformFee")}
                  disabled={!isEditing}
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="h-100 p-3 p-md-4 rounded-4 bg-light border border-light-subtle">
                  <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                    <Truck size={18} className="text-muted" />
                    Vehicle pricing
                  </h6>
                  <p className="text-muted small mb-0">
                    Base fare and ₹/km per bike, auto, or truck are configured
                    on the <strong>Vehicles</strong> page. This screen only sets
                    the extra platform fee and GST for in-city quotes.
                  </p>
                </div>
              </div>
            </div>
            <p className="small text-muted mb-0 mt-3">
              <strong>Customer sees:</strong> Vehicle price + GST + in-city platform
              fee = estimated total on each vehicle card.
            </p>
          </Section>

          <Section
            id="section-outstation"
            icon={Route}
            title="Outstation (between zones / cities)"
            subtitle="Price is built from distance legs, weight, GST, and a separate platform fee."
          >
            <OutstationFormulaStrip />

            <div className="row g-3 mb-4">
              <div className="col-12 col-md-6">
                <ServiceFeeCard
                  title="Platform fee"
                  badge="Outstation"
                  description="Fixed charge added after all leg costs and GST. Different from in-city fee."
                  fieldLabel="Amount per order"
                  value={form.outstationPlatformFee}
                  onChange={handleChange("outstationPlatformFee")}
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12 col-md-4">
                <Field
                  label="Weight charge"
                  hint="Extra ₹ per kg of parcel (all outstation modes)."
                  suffix="₹/kg"
                  value={form.perKgRate}
                  onChange={handleChange("perKgRate")}
                  disabled={!isEditing}
                  example="12 kg × ₹5/kg = ₹60"
                />
              </div>
              <div className="col-12 col-md-4">
                <Field
                  label="Default hub-to-hub rate"
                  hint="Used when no custom rate exists on Hub routes for that pair."
                  suffix="₹/km"
                  value={form.defaultRouteRatePerKm}
                  onChange={handleChange("defaultRouteRatePerKm")}
                  disabled={!isEditing}
                />
              </div>
              <div className="col-12 col-md-4">
                <div className="p-3 rounded-4 bg-light border h-100">
                  <p className="small fw-semibold mb-2">Fallback leg rates</p>
                  <p className="text-muted small mb-3">
                    Only used if parcel weight does not fall in any band below.
                  </p>
                  <Field
                    label="Pickup fallback"
                    suffix="₹/km"
                    value={form.pickupRatePerKm}
                    onChange={handleChange("pickupRatePerKm")}
                    disabled={!isEditing}
                  />
                  <div className="mt-3">
                    <Field
                      label="Drop fallback"
                      suffix="₹/km"
                      value={form.dropRatePerKm}
                      onChange={handleChange("dropRatePerKm")}
                      disabled={!isEditing}
                    />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="section-bands"
            icon={Weight}
            title="Outstation ₹/km by parcel weight"
            subtitle="Heavier parcels can use higher pickup and drop rates. Door-to-hub skips drop km; hub-to-door skips pickup km."
          >
            <div
              className="alert alert-light border rounded-4 mb-4 small"
              role="note"
            >
              <strong>How weight bands work</strong>
              <ul className="mb-2 ps-3">
                <li>
                  <strong>From kg</strong> = included (e.g. 10 means 10 kg counts
                  in this band).
                </li>
                <li>
                  <strong>Up to kg</strong> = excluded (e.g. 20 means 19.9 kg is
                  still in this band; exactly 20 kg moves to the next band).
                </li>
                <li>
                  Example: bands 0→10 at ₹10/km and 10→20 at ₹30/km → an{" "}
                  <strong>8 kg</strong> parcel uses ₹10/km; a <strong>15 kg</strong>{" "}
                  parcel uses ₹30/km.
                </li>
              </ul>
              <div className="d-flex flex-wrap align-items-center gap-2">
                <label className="fw-semibold mb-0">Try preview weight:</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control form-control-sm"
                  style={{ width: 100 }}
                  value={previewWeight}
                  onChange={(e) => setPreviewWeight(e.target.value)}
                />
                <span className="text-muted">kg</span>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <WeightBandsEditor
                  title="Pickup leg"
                  legLabel="Customer address → origin hub (first mile)"
                  tiers={form.pickupLegTiers}
                  legKey="pickupLegTiers"
                  isEditing={isEditing}
                  onChange={handleTierChange}
                  onAdd={addTier}
                  onRemove={removeTier}
                  previewWeight={previewKg}
                  fallbackRate={form.pickupRatePerKm}
                />
              </div>
              <div className="col-12 col-lg-6">
                <WeightBandsEditor
                  title="Drop leg"
                  legLabel="Destination hub → customer address (last mile)"
                  tiers={form.dropLegTiers}
                  legKey="dropLegTiers"
                  isEditing={isEditing}
                  onChange={handleTierChange}
                  onAdd={addTier}
                  onRemove={removeTier}
                  previewWeight={previewKg}
                  fallbackRate={form.dropRatePerKm}
                />
              </div>
            </div>
          </Section>

          <p className="text-muted small text-center mb-0">
            Config record #{form.id || "1"} · Saved settings apply to new quotes
            immediately
          </p>
        </>
      )}
    </div>
  );
};

export default AppConfig;

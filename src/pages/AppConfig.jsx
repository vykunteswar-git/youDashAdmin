import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Save,
  RotateCcw,
  Pencil,
  Percent,
  Route,
  Weight,
  Plus,
  Trash2,
  MapPin,
  Truck,
  Info,
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
      <div className="d-flex align-items-center gap-3 mb-4 pb-3 border-bottom">
        <div
          className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{ background: "rgba(229, 24, 24, 0.08)" }}
        >
          <Icon size={20} style={{ color: BRAND }} />
        </div>
        <div className="min-w-0">
          <h5 className="fw-bold mb-0">{title}</h5>
          {subtitle ? (
            <p className="text-muted small mb-0 mt-1">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function FieldLabel({ children, hint }) {
  return (
    <label
      className="form-label fw-semibold mb-2 d-flex align-items-center gap-1"
      style={{ fontSize: 13, color: "#374151" }}
    >
      {children}
      {hint ? (
        <span
          className="d-inline-flex align-items-center justify-content-center rounded-circle text-white"
          style={{
            width: 15,
            height: 15,
            fontSize: 10,
            cursor: "help",
            background: "#94a3b8",
            flexShrink: 0,
          }}
          title={hint}
        >
          ?
        </span>
      ) : null}
    </label>
  );
}

function Field({
  label,
  hint,
  prefix,
  suffix,
  value,
  onChange,
  disabled,
  placeholder,
  step = "0.01",
  min = "0",
}) {
  return (
    <div>
      <FieldLabel hint={hint}>{label}</FieldLabel>
      <div className="input-group">
        {prefix ? (
          <span
            className="input-group-text rounded-start-3 border-end-0 text-muted"
            style={{ background: "#f8fafc", fontSize: 13 }}
          >
            {prefix}
          </span>
        ) : null}
        <input
          type="number"
          step={step}
          min={min}
          className={`form-control py-2 ${prefix ? "rounded-0 border-start-0" : "rounded-start-3"} ${suffix ? "rounded-0 border-end-0" : "rounded-end-3"}`}
          style={{ background: "#fff", fontSize: 15 }}
          value={value}
          onChange={onChange}
          disabled={disabled}
          placeholder={placeholder}
        />
        {suffix ? (
          <span
            className="input-group-text rounded-end-3 border-start-0 text-muted"
            style={{ background: "#f8fafc", fontSize: 13, minWidth: 56 }}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function CompactFeeField({ badge, label, hint, value, onChange, disabled }) {
  return (
    <div className="p-3 p-md-4 rounded-4 border bg-white h-100">
      <span
        className="badge rounded-pill mb-3"
        style={{ background: "rgba(229, 24, 24, 0.1)", color: BRAND }}
      >
        {badge}
      </span>
      <Field
        label={label}
        hint={hint}
        prefix="₹"
        suffix="flat"
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder="0"
      />
    </div>
  );
}

function WeightBandsEditor({
  title,
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
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        <h6 className="fw-bold mb-0">{title}</h6>
        <span className="small text-muted">
          Preview {previewWeight} kg →{" "}
          <strong style={{ color: BRAND }}>
            ₹{preview.rate}/km
            {preview.matched ? ` (${preview.min}–${preview.max} kg)` : " (fallback)"}
          </strong>
        </span>
      </div>

      <div className="table-responsive rounded-3 border">
        <table className="table table-sm mb-0 align-middle">
          <thead style={{ background: "#f8fafc" }}>
            <tr className="small text-muted">
              <th className="ps-3 py-2 fw-semibold" style={{ width: "28%" }}>
                From (kg)
              </th>
              <th className="py-2 fw-semibold" style={{ width: "28%" }}>
                Up to (kg)
              </th>
              <th className="py-2 fw-semibold" style={{ width: "28%" }}>
                Rate
              </th>
              <th className="pe-3 py-2" style={{ width: "16%" }} />
            </tr>
          </thead>
          <tbody>
            {tiers.map((row, idx) => (
              <tr key={`${legKey}-${idx}`}>
                <td className="ps-3">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    className="form-control form-control-sm py-2"
                    value={row.minWeightKg}
                    disabled={!isEditing}
                    placeholder="0"
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
                    className="form-control form-control-sm py-2"
                    value={row.maxWeightKg}
                    disabled={!isEditing}
                    placeholder="10"
                    onChange={(e) =>
                      onChange(legKey, idx, "maxWeightKg", e.target.value)
                    }
                  />
                </td>
                <td>
                  <div className="input-group input-group-sm">
                    <span className="input-group-text">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="form-control py-2"
                      value={row.ratePerKm}
                      disabled={!isEditing}
                      placeholder="0"
                      onChange={(e) =>
                        onChange(legKey, idx, "ratePerKm", e.target.value)
                      }
                    />
                    <span className="input-group-text">/km</span>
                  </div>
                </td>
                <td className="pe-3 text-end">
                  {isEditing && tiers.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-link text-danger p-1"
                      onClick={() => onRemove(legKey, idx)}
                      aria-label="Remove band"
                    >
                      <Trash2 size={16} />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isEditing ? (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary rounded-3 mt-2 d-inline-flex align-items-center gap-1"
          onClick={() => onAdd(legKey)}
        >
          <Plus size={16} />
          Add band
        </button>
      ) : null}
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
          <h2 className="fw-bold mb-1">App config</h2>
          <p className="text-muted small mb-2">
            Parcel app pricing — applies to new quotes immediately.
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
            {isEditing ? "Save" : "Edit"}
          </button>
        </div>
      </div>

      {isEditing ? (
        <div
          className="alert border-0 rounded-3 mb-4 py-2 px-3 d-flex align-items-center gap-2 small"
          style={{ background: "#fff8e6" }}
        >
          <Info size={16} className="text-warning flex-shrink-0" />
          <span>
            Editing — save when done. Hub routes and vehicle fares are managed separately.
          </span>
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
          <p className="text-muted small mb-0">Loading…</p>
        </div>
      ) : (
        <>
          <Section id="section-tax" icon={Percent} title="Tax">
            <div className="row g-3">
              <div className="col-12 col-sm-6 col-lg-4">
                <Field
                  label="GST"
                  hint="Applied to fare subtotal before platform fee"
                  suffix="%"
                  value={form.gstPercent}
                  onChange={handleChange("gstPercent")}
                  disabled={!isEditing}
                  placeholder="18"
                />
              </div>
            </div>
          </Section>

          <Section
            id="section-incity"
            icon={MapPin}
            title="In-city"
            subtitle="Same-zone deliveries"
          >
            <div className="row g-3">
              <div className="col-12 col-md-6">
                <CompactFeeField
                  badge="In-city"
                  label="Platform fee"
                  hint="Flat fee per local order"
                  value={form.incityPlatformFee}
                  onChange={handleChange("incityPlatformFee")}
                  disabled={!isEditing}
                />
              </div>
              <div className="col-12 col-md-6">
                <div className="h-100 p-3 p-md-4 rounded-4 bg-light border border-light-subtle d-flex align-items-center gap-3">
                  <Truck size={20} className="text-muted flex-shrink-0" />
                  <p className="text-muted small mb-0">
                    Vehicle base fare and ₹/km are set on <strong>Vehicles</strong>.
                  </p>
                </div>
              </div>
            </div>
          </Section>

          <Section
            id="section-outstation"
            icon={Route}
            title="Outstation"
            subtitle="Pickup + hub route + drop + weight + GST + platform fee"
          >
            <div className="row g-3 mb-3">
              <div className="col-12 col-md-6 col-lg-4">
                <CompactFeeField
                  badge="Outstation"
                  label="Platform fee"
                  hint="Flat fee per outstation order"
                  value={form.outstationPlatformFee}
                  onChange={handleChange("outstationPlatformFee")}
                  disabled={!isEditing}
                />
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <Field
                  label="Weight rate"
                  hint="Per kg surcharge on outstation orders"
                  prefix="₹"
                  suffix="/kg"
                  value={form.perKgRate}
                  onChange={handleChange("perKgRate")}
                  disabled={!isEditing}
                  placeholder="5"
                />
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <Field
                  label="Default hub route"
                  hint="Used when no custom Hub routes rate exists"
                  prefix="₹"
                  suffix="/km"
                  value={form.defaultRouteRatePerKm}
                  onChange={handleChange("defaultRouteRatePerKm")}
                  disabled={!isEditing}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="row g-3">
              <div className="col-12 col-md-6">
                <Field
                  label="Pickup fallback"
                  hint="₹/km when weight is outside all pickup bands"
                  prefix="₹"
                  suffix="/km"
                  value={form.pickupRatePerKm}
                  onChange={handleChange("pickupRatePerKm")}
                  disabled={!isEditing}
                  placeholder="10"
                />
              </div>
              <div className="col-12 col-md-6">
                <Field
                  label="Drop fallback"
                  hint="₹/km when weight is outside all drop bands"
                  prefix="₹"
                  suffix="/km"
                  value={form.dropRatePerKm}
                  onChange={handleChange("dropRatePerKm")}
                  disabled={!isEditing}
                  placeholder="10"
                />
              </div>
            </div>
          </Section>

          <Section
            id="section-bands"
            icon={Weight}
            title="Weight bands"
            subtitle="₹/km by parcel weight — min inclusive, max exclusive"
          >
            <div className="d-flex flex-wrap align-items-center gap-2 mb-4">
              <span className="small fw-semibold text-muted">Preview weight</span>
              <div className="input-group input-group-sm" style={{ width: 120 }}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control py-2"
                  value={previewWeight}
                  onChange={(e) => setPreviewWeight(e.target.value)}
                />
                <span className="input-group-text">kg</span>
              </div>
            </div>

            <div className="row g-4">
              <div className="col-12 col-lg-6">
                <WeightBandsEditor
                  title="Pickup leg"
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
        </>
      )}
    </div>
  );
};

export default AppConfig;

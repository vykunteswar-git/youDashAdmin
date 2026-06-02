import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Trash2, Package, Truck, ArrowUpDown, Weight } from "lucide-react";

const TABS = [
  { id: "general",  label: "General",      icon: Package },
  { id: "pickup",   label: "Pickup Leg",   icon: Truck },
  { id: "drop",     label: "Drop Leg",     icon: Truck },
  { id: "weight",   label: "Weight Slabs", icon: Weight },
];

const EMPTY_CONFIG = {
  gstPercent: 0,
  incityPlatformFee: 0,
  outstationPlatformFee: 0,
  pickupRatePerKm: 0,
  dropRatePerKm: 0,
  perKgRate: 0,
  defaultRouteRatePerKm: 0,
  pickupLegTiers: [],
  dropLegTiers: [],
  weightCostSlabs: [],
};

export default function AppConfig() {
  const [cfg, setCfg]         = useState(EMPTY_CONFIG);
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [tab, setTab]         = useState("general");

  async function load() {
    const [configRes, vehiclesRes] = await Promise.all([
      api.get("/config/app"),
      api.get("/vehicles"),
    ]);
    setCfg({ ...EMPTY_CONFIG, ...configRes.data });
    setVehicles(vehiclesRes.data?.vehicles ?? []);
  }

  useEffect(() => { load(); }, []);

  function set(key, value) {
    setCfg(current => ({ ...current, [key]: value }));
  }

  function tierErrors(tiers) {
    return tiers
      .filter(t => t.isActive !== false)
      .filter(t => !t.vehicleId).length;
  }

  function validateBeforeSave() {
    const activeTiers = (tiers, label) => tiers
      .filter(t => t.isActive !== false)
      .map((t, i) => (!t.vehicleId ? `${label} tier ${i + 1}: vehicle must be selected` : null))
      .filter(Boolean);
    return [
      ...activeTiers(cfg.pickupLegTiers ?? [], "Pickup"),
      ...activeTiers(cfg.dropLegTiers ?? [], "Drop"),
    ];
  }

  async function save() {
    const errors = validateBeforeSave();
    if (errors.length) {
      errors.forEach(e => toast.error(e));
      return;
    }
    setSaving(true);
    try {
      await api.put("/config/app", cfg);
      toast.success("App config saved");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Failed to save app config");
    } finally {
      setSaving(false);
    }
  }

  const pickupErrors = tierErrors(cfg.pickupLegTiers ?? []);
  const dropErrors   = tierErrors(cfg.dropLegTiers ?? []);

  return (
    <div data-testid="app-config-page">
      <PageHeader title="App Config" subtitle="Global pricing and outstation leg rates" />

      {/* Tab Bar */}
      <div className="flex items-center gap-1 border-b border-[var(--border-default)] mb-5">
        {TABS.map(t => {
          const errCount = t.id === "pickup" ? pickupErrors : t.id === "drop" ? dropErrors : 0;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 transition -mb-px ${
                tab === t.id
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Icon size={14} />
              {t.label}
              {errCount > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {errCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {tab === "general" && (
        <div className="grid grid-cols-2 gap-4">
          <section className="surface p-5">
            <SectionHead title="Checkout Pricing" subtitle="Applied to every order at checkout" />
            <div className="space-y-3 mt-4">
              <Field label="GST %" value={cfg.gstPercent} onChange={v => set("gstPercent", v)} />
              <Field label="Incity Platform Fee (₹)" value={cfg.incityPlatformFee} onChange={v => set("incityPlatformFee", v)} />
              <Field label="Outstation Platform Fee (₹)" value={cfg.outstationPlatformFee} onChange={v => set("outstationPlatformFee", v)} />
              <Field label="Per KG Rate (₹)" value={cfg.perKgRate} onChange={v => set("perKgRate", v)} />
              <Field label="Default Route Rate / KM (₹)" value={cfg.defaultRouteRatePerKm} onChange={v => set("defaultRouteRatePerKm", v)} />
            </div>
          </section>

          <section className="surface p-5">
            <SectionHead title="Leg Fallback Rates" subtitle="Used when no pickup/drop weight tier matches" />
            <div className="space-y-3 mt-4">
              <Field label="Pickup Rate / KM (₹)" value={cfg.pickupRatePerKm} onChange={v => set("pickupRatePerKm", v)} />
              <Field label="Drop Rate / KM (₹)" value={cfg.dropRatePerKm} onChange={v => set("dropRatePerKm", v)} />
            </div>
            <div className="mt-4 p-3 rounded-sm bg-[var(--slate-50)] border border-[var(--border-default)] text-[12px] text-zinc-500">
              These rates are applied as a flat ₹/km charge when no tier matches the parcel weight. Configure Pickup / Drop Leg Tiers for precise pricing.
            </div>
          </section>
        </div>
      )}

      {tab === "pickup" && (
        <TierEditor
          tiers={cfg.pickupLegTiers}
          vehicles={vehicles}
          onChange={tiers => set("pickupLegTiers", tiers)}
          legLabel="Pickup"
          fallbackRate={cfg.pickupRatePerKm}
        />
      )}

      {tab === "drop" && (
        <TierEditor
          tiers={cfg.dropLegTiers}
          vehicles={vehicles}
          onChange={tiers => set("dropLegTiers", tiers)}
          legLabel="Drop"
          fallbackRate={cfg.dropRatePerKm}
        />
      )}

      {tab === "weight" && (
        <WeightSlabEditor slabs={cfg.weightCostSlabs} perKgRate={cfg.perKgRate} onChange={slabs => set("weightCostSlabs", slabs)} />
      )}

      {/* Validation errors */}
      {validateBeforeSave().length > 0 && (
        <div className="mt-5 p-3 rounded-sm bg-rose-50 border border-rose-300 text-[12px] text-rose-700 space-y-1">
          {validateBeforeSave().map((e, i) => <div key={i}>⚠ {e}</div>)}
        </div>
      )}

      <button onClick={save} disabled={saving} className="btn-primary mt-4" data-testid="save-app-config">
        {saving ? "Saving..." : "Save App Config"}
      </button>
    </div>
  );
}

function SectionHead({ title, subtitle }) {
  return (
    <div>
      <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>{title}</h3>
      {subtitle && <p className="text-[12px] text-zinc-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function WeightSlabEditor({ slabs, perKgRate, onChange }) {
  function setSlab(index, key, value) {
    onChange(slabs.map((s, i) => i === index ? { ...s, [key]: value } : s));
  }
  function addSlab() {
    onChange([...slabs, { minWeightKg: 0, maxWeightKg: 10, flatCost: 0, sortOrder: slabs.length, isActive: true }]);
  }
  function removeSlab(index) {
    onChange(slabs.filter((_, i) => i !== index));
  }

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <SectionHead title="Weight Cost Slabs" subtitle="Flat charge based on parcel weight range." />
          <p className="text-[12px] text-zinc-400 mt-1">
            Falls back to <span className="mono font-semibold">Per KG Rate × weight</span> (currently ₹{perKgRate}/kg) if no slab matches.
          </p>
        </div>
        <button type="button" onClick={addSlab} className="chip flex-shrink-0">+ Add slab</button>
      </div>

      {slabs.length > 0 && (
        <div className="grid grid-cols-[60px_60px_1fr_1fr_1fr_auto_auto] gap-2 px-3 mb-1">
          <span className="text-[10px] uppercase tracking-wider text-zinc-400">Min KG</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400">Max KG</span>
          <span className="text-[10px] uppercase tracking-wider text-zinc-400 col-span-2">Flat Cost (₹)</span>
          <span />
          <span />
          <span />
        </div>
      )}

      <div className="space-y-2">
        {slabs.map((slab, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end rounded-sm border border-[var(--border-default)] p-3">
            <Field label="Min KG" value={slab.minWeightKg} onChange={v => setSlab(index, "minWeightKg", v)} />
            <Field label="Max KG" value={slab.maxWeightKg} onChange={v => setSlab(index, "maxWeightKg", v)} />
            <Field label="Flat Cost (₹)" value={slab.flatCost} onChange={v => setSlab(index, "flatCost", v)} />
            <button type="button" onClick={() => setSlab(index, "isActive", !slab.isActive)}
              className={`chip h-9 ${slab.isActive ? "chip-active" : ""}`}>
              {slab.isActive ? "ON" : "OFF"}
            </button>
            <button type="button" onClick={() => removeSlab(index)}
              className="h-9 w-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-sm">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {slabs.length === 0 && (
          <div className="empty">No slabs configured — Per KG Rate fallback will be used for all parcels.</div>
        )}
      </div>
    </section>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} className="input mono" />
    </div>
  );
}

function TierEditor({ tiers, vehicles, onChange, legLabel, fallbackRate }) {
  function setTier(index, key, value) {
    onChange(tiers.map((tier, i) => i === index ? { ...tier, [key]: value } : tier));
  }
  function addTier() {
    onChange([...tiers, { minWeightKg: 0, maxWeightKg: 5, vehicleId: null, baseFare: 0, minimumKm: 3, ratePerKm: 0, sortOrder: tiers.length, isActive: true }]);
  }
  function removeTier(index) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <section className="surface p-5">
      <div className="flex items-start justify-between mb-1">
        <div>
          <SectionHead
            title={`${legLabel} Leg Tiers`}
            subtitle={`Weight-based pricing for the ${legLabel.toLowerCase()} leg. Each tier maps a weight range to a vehicle and fare structure.`}
          />
        </div>
        <button type="button" onClick={addTier} className="chip flex-shrink-0">+ Add tier</button>
      </div>

      <div className="mt-1 mb-4 p-3 rounded-sm bg-[var(--slate-50)] border border-[var(--border-default)] text-[12px] text-zinc-500">
        Fallback if no tier matches: <span className="mono font-semibold">₹{fallbackRate}/km</span> flat rate (set in General → Leg Fallback Rates)
      </div>

      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <div
            key={index}
            className={`rounded-sm border p-4 space-y-3 ${!tier.vehicleId && tier.isActive !== false ? "border-rose-300 bg-rose-50/30" : "border-[var(--border-default)]"}`}
          >
            {/* Row 1: weight range + vehicle */}
            <div className="grid grid-cols-[1fr_1fr_2fr] gap-3">
              <Field label="Min KG" value={tier.minWeightKg} onChange={v => setTier(index, "minWeightKg", v)} />
              <Field label="Max KG" value={tier.maxWeightKg} onChange={v => setTier(index, "maxWeightKg", v)} />
              <div>
                <label className="label flex items-center gap-1">
                  Vehicle
                  {!tier.vehicleId && tier.isActive !== false && (
                    <span className="text-rose-500 font-semibold">*required</span>
                  )}
                </label>
                <select
                  value={tier.vehicleId ?? ""}
                  onChange={e => setTier(index, "vehicleId", e.target.value ? Number(e.target.value) : null)}
                  className={`input ${!tier.vehicleId && tier.isActive !== false ? "border-rose-400 ring-1 ring-rose-300" : ""}`}
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: fare structure + controls */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
              <Field label="Base Fare (₹)" value={tier.baseFare} onChange={v => setTier(index, "baseFare", v)} />
              <Field label="Min KM" value={tier.minimumKm} onChange={v => setTier(index, "minimumKm", v)} />
              <Field label="Rate / KM (₹)" value={tier.ratePerKm} onChange={v => setTier(index, "ratePerKm", v)} />
              <button type="button" onClick={() => setTier(index, "isActive", !tier.isActive)}
                className={`chip h-9 ${tier.isActive ? "chip-active" : ""}`}>
                {tier.isActive ? "ON" : "OFF"}
              </button>
              <button type="button" onClick={() => removeTier(index)}
                className="h-9 w-9 flex items-center justify-center text-rose-600 hover:bg-rose-50 rounded-sm">
                <Trash2 size={14} />
              </button>
            </div>

            {/* Live formula preview */}
            {tier.vehicleId && (
              <div className="text-[11px] text-zinc-400 mono bg-zinc-50 rounded-sm px-3 py-2 border border-[var(--border-default)]">
                {Number(tier.minimumKm) > 0
                  ? <>
                      {tier.minWeightKg}–{tier.maxWeightKg} kg ·{" "}
                      &lt;{tier.minimumKm} km → ₹{tier.baseFare} flat ·{" "}
                      ≥{tier.minimumKm} km → ₹{tier.baseFare} + dist × ₹{tier.ratePerKm}/km
                    </>
                  : <>{tier.minWeightKg}–{tier.maxWeightKg} kg · ₹{tier.baseFare} + dist × ₹{tier.ratePerKm}/km</>
                }
              </div>
            )}
          </div>
        ))}
        {tiers.length === 0 && (
          <div className="empty">No tiers configured — fallback rate will apply to all parcels.</div>
        )}
      </div>
    </section>
  );
}

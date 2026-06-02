import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

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
  const [cfg, setCfg] = useState(EMPTY_CONFIG);
  const [vehicles, setVehicles] = useState([]);
  const [saving, setSaving] = useState(false);

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

  async function save() {
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

  return (
    <div data-testid="app-config-page">
      <PageHeader title="App Config" subtitle="Global pricing and outstation leg rates" />

      <div className="grid grid-cols-2 gap-4">
        <section className="surface p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Outfit" }}>Checkout Pricing</h3>
          <div className="space-y-3">
            <Field label="GST %" value={cfg.gstPercent} onChange={v => set("gstPercent", v)} />
            <Field label="Incity Platform Fee" value={cfg.incityPlatformFee} onChange={v => set("incityPlatformFee", v)} />
            <Field label="Outstation Platform Fee" value={cfg.outstationPlatformFee} onChange={v => set("outstationPlatformFee", v)} />
            <Field label="Per KG Rate" value={cfg.perKgRate} onChange={v => set("perKgRate", v)} />
            <Field label="Default Route Rate / KM" value={cfg.defaultRouteRatePerKm} onChange={v => set("defaultRouteRatePerKm", v)} />
          </div>
        </section>

        <section className="surface p-5">
          <h3 className="text-sm font-semibold mb-4" style={{ fontFamily: "Outfit" }}>Legacy Leg Fallbacks</h3>
          <div className="space-y-3">
            <Field label="Pickup Rate / KM" value={cfg.pickupRatePerKm} onChange={v => set("pickupRatePerKm", v)} />
            <Field label="Drop Rate / KM" value={cfg.dropRatePerKm} onChange={v => set("dropRatePerKm", v)} />
          </div>
          <p className="text-[12px] text-[var(--slate-500)] mt-4">
            Used only when no pickup/drop weight tier matches.
          </p>
        </section>

      </div>

      <div className="grid grid-cols-2 gap-4 mt-4">
        <TierEditor title="Pickup Leg Tiers" tiers={cfg.pickupLegTiers} vehicles={vehicles} onChange={tiers => set("pickupLegTiers", tiers)} />
        <TierEditor title="Drop Leg Tiers" tiers={cfg.dropLegTiers} vehicles={vehicles} onChange={tiers => set("dropLegTiers", tiers)} />
      </div>

      <div className="mt-4">
        <WeightSlabEditor slabs={cfg.weightCostSlabs} onChange={slabs => set("weightCostSlabs", slabs)} />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary mt-4" data-testid="save-app-config">
        {saving ? "Saving..." : "Save App Config"}
      </button>
    </div>
  );
}

function WeightSlabEditor({ slabs, onChange }) {
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
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Weight Cost Slabs</h3>
          <p className="text-[12px] text-zinc-400 mt-0.5">Flat charge based on parcel weight. Falls back to Per KG Rate if no slab matches.</p>
        </div>
        <button type="button" onClick={addSlab} className="chip">+ Add slab</button>
      </div>
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
        {slabs.length === 0 && <div className="empty">No slabs configured — Per KG Rate fallback will be used.</div>}
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

function TierEditor({ title, tiers, vehicles, onChange }) {
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
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>{title}</h3>
        <button type="button" onClick={addTier} className="chip">+ Add tier</button>
      </div>
      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <div key={index} className="rounded-sm border border-[var(--border-default)] p-3 space-y-2">
            <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
              <Field label="Min KG" value={tier.minWeightKg} onChange={v => setTier(index, "minWeightKg", v)} />
              <Field label="Max KG" value={tier.maxWeightKg} onChange={v => setTier(index, "maxWeightKg", v)} />
              <div>
                <label className="label">Vehicle</label>
                <select
                  value={tier.vehicleId ?? ""}
                  onChange={e => setTier(index, "vehicleId", e.target.value ? Number(e.target.value) : null)}
                  className="input"
                >
                  <option value="">Select vehicle</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end">
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
            {tier.vehicleId && tier.minimumKm > 0 && (
              <p className="text-[11px] text-zinc-400">
                &lt; {tier.minimumKm} km → ₹{tier.baseFare} flat · ≥ {tier.minimumKm} km → ₹{tier.baseFare} + dist × ₹{tier.ratePerKm}/km
              </p>
            )}
          </div>
        ))}
        {tiers.length === 0 && <div className="empty">No tiers configured.</div>}
      </div>
    </section>
  );
}

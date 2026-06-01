import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

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
};

export default function AppConfig() {
  const [cfg, setCfg] = useState(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);

  async function load() {
    const response = await api.get("/config/app");
    setCfg({ ...EMPTY_CONFIG, ...response.data });
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
        <TierEditor title="Pickup Leg Weight Tiers" tiers={cfg.pickupLegTiers} onChange={tiers => set("pickupLegTiers", tiers)} />
        <TierEditor title="Drop Leg Weight Tiers" tiers={cfg.dropLegTiers} onChange={tiers => set("dropLegTiers", tiers)} />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary mt-4" data-testid="save-app-config">
        {saving ? "Saving..." : "Save App Config"}
      </button>
    </div>
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

function TierEditor({ title, tiers, onChange }) {
  function setTier(index, key, value) {
    onChange(tiers.map((tier, i) => i === index ? { ...tier, [key]: value } : tier));
  }
  function addTier() {
    onChange([...tiers, { minWeightKg: 0, maxWeightKg: 5, ratePerKm: 0, sortOrder: tiers.length, isActive: true }]);
  }
  function removeTier(index) {
    onChange(tiers.filter((_, i) => i !== index));
  }

  return (
    <section className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>{title}</h3>
        <button type="button" onClick={addTier} className="chip">Add tier</button>
      </div>
      <div className="space-y-3">
        {tiers.map((tier, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-2 items-end rounded-sm border border-[var(--border-default)] p-3">
            <Field label="Min KG" value={tier.minWeightKg} onChange={v => setTier(index, "minWeightKg", v)} />
            <Field label="Max KG" value={tier.maxWeightKg} onChange={v => setTier(index, "maxWeightKg", v)} />
            <Field label="Rate / KM" value={tier.ratePerKm} onChange={v => setTier(index, "ratePerKm", v)} />
            <button type="button" onClick={() => setTier(index, "isActive", !tier.isActive)} className={`chip h-9 ${tier.isActive ? "chip-active" : ""}`}>
              {tier.isActive ? "ON" : "OFF"}
            </button>
            <button type="button" onClick={() => removeTier(index)} className="h-9 text-[12px] text-rose-700">Remove</button>
          </div>
        ))}
        {tiers.length === 0 && <div className="empty">No tiers configured.</div>}
      </div>
    </section>
  );
}

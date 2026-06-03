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
  weightCostSlabs: [],
};

export default function AppConfig() {
  const [cfg, setCfg]       = useState(EMPTY_CONFIG);
  const [saving, setSaving] = useState(false);

  async function load() {
    const configRes = await api.get("/config/app");
    setCfg({ ...EMPTY_CONFIG, ...configRes.data });
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
            Flat ₹/km rates used when no weight tier matches the parcel.
          </div>
        </section>
      </div>

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

function Field({ label, value, onChange }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" value={value ?? ""} onChange={e => onChange(e.target.value)} className="input mono" />
    </div>
  );
}


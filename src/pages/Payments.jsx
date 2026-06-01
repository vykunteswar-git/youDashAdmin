import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Payments() {
  const [cfg, setCfg] = useState({ cod_enabled: true, online_enabled: true, default_method: "ONLINE" });
  async function load() { const r = await api.get("/config/payments"); setCfg({ ...cfg, ...r.data }); }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);
  async function save() {
    await api.put("/config/payments", cfg);
    toast.success("Payment config saved");
  }
  return (
    <div data-testid="payments-page">
      <PageHeader title="Payments" subtitle="Master toggles for payment methods" />
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div className="surface p-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Cash on Delivery</div>
              <div className="text-[12px] text-zinc-500">Allow customers to pay on delivery</div>
            </div>
            <label className="inline-flex items-center cursor-pointer" data-testid="toggle-cod">
              <input type="checkbox" checked={cfg.cod_enabled} onChange={e => setCfg({ ...cfg, cod_enabled: e.target.checked })} />
            </label>
          </div>
        </div>
        <div className="surface p-5">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Online (UPI/Cards)</div>
              <div className="text-[12px] text-zinc-500">Razorpay / payment gateway</div>
            </div>
            <label className="inline-flex items-center cursor-pointer" data-testid="toggle-online">
              <input type="checkbox" checked={cfg.online_enabled} onChange={e => setCfg({ ...cfg, online_enabled: e.target.checked })} />
            </label>
          </div>
        </div>
      </div>
      <div className="surface p-5 mt-4 max-w-2xl">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Default payment method</div>
        <select value={cfg.default_method} onChange={e => setCfg({ ...cfg, default_method: e.target.value })}
          className="h-9 text-sm border border-[var(--border-default)] rounded-sm px-2 w-full" data-testid="default-method">
          <option value="ONLINE">Online</option><option value="COD">COD</option>
        </select>
      </div>
      <button onClick={save} className="mt-4 bg-zinc-900 text-white text-[13px] px-4 py-2 rounded-sm" data-testid="save-payments">Publish config</button>
    </div>
  );
}

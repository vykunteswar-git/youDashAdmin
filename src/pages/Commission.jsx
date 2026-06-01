import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";

export default function Commission() {
  const [c, setC] = useState({ online_pct: 15, cod_cash_pct: 12, cod_qr_pct: 10 });
  const [amount, setAmount] = useState(500);
  async function load() { const r = await api.get("/config/commission"); setC({ online_pct: r.data.online_pct, cod_cash_pct: r.data.cod_cash_pct, cod_qr_pct: r.data.cod_qr_pct }); }
  useEffect(() => { load(); }, []);
  async function save() { await api.put("/config/commission", c); toast.success("Commission updated"); }
  function preview(pct) { return { app: (amount * pct / 100).toFixed(2), rider: (amount * (100 - pct) / 100).toFixed(2) }; }
  return (
    <div data-testid="commission-page">
      <PageHeader title="Rider Commission" subtitle="Platform commission per payment mode" />
      <div className="grid grid-cols-3 gap-4 max-w-4xl">
        <Card label="Online" pct={c.online_pct} onChange={v => setC({ ...c, online_pct: v })} testid="online" />
        <Card label="COD Cash" pct={c.cod_cash_pct} onChange={v => setC({ ...c, cod_cash_pct: v })} testid="cash" />
        <Card label="COD QR" pct={c.cod_qr_pct} onChange={v => setC({ ...c, cod_qr_pct: v })} testid="qr" />
      </div>
      <div className="surface p-5 mt-4 max-w-4xl">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Payout preview</h3>
        <input type="number" value={amount} onChange={e => setAmount(parseFloat(e.target.value || 0))} className="h-9 text-sm border border-[var(--border-default)] rounded-sm px-2 w-40 mono mb-3" data-testid="preview-amount" />
        <div className="grid grid-cols-3 gap-3 text-[13px]">
          {[["Online", c.online_pct], ["COD Cash", c.cod_cash_pct], ["COD QR", c.cod_qr_pct]].map(([n, p]) => {
            const x = preview(p);
            return <div key={n} className="surface p-3"><div className="text-[10px] uppercase tracking-wider text-zinc-500">{n}</div>
              <div className="mt-1 mono text-[12px]">App: ₹{x.app}</div>
              <div className="mono text-[12px]">Rider: ₹{x.rider}</div>
            </div>;
          })}
        </div>
      </div>
      <button onClick={save} className="mt-4 bg-zinc-900 text-white text-[13px] px-4 py-2 rounded-sm" data-testid="save-commission">Save</button>
    </div>
  );
}
function Card({ label, pct, onChange, testid }) {
  return (
    <div className="surface p-5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-3 flex items-center gap-2">
        <input type="number" value={pct} onChange={e => onChange(parseFloat(e.target.value || 0))} className="h-10 w-20 mono text-xl border border-[var(--border-default)] rounded-sm px-2" data-testid={`commission-${testid}`} />
        <span className="text-lg mono">%</span>
      </div>
      <div className="text-[11px] text-zinc-500 mt-2">Rider keeps {100 - pct}%</div>
    </div>
  );
}

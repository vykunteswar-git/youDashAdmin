import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

export default function CodHandover() {
  const [riders, setRiders] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [sel, setSel] = useState(null);
  const [amt, setAmt] = useState("");
  const [hubId, setHubId] = useState("");
  const [note, setNote] = useState("");
  async function load() {
    const [r, h] = await Promise.all([api.get("/riders"), api.get("/hubs")]);
    setRiders(r.data.riders); setHubs(h.data.hubs);
  }
  useEffect(() => { load(); }, []);
  async function deposit() {
    if (!sel || !amt || !hubId) return toast.error("Fill all fields");
    await api.post(`/riders/${sel.id}/cod-deposit`, { rider_id: sel.id, amount: parseFloat(amt), hub_id: hubId, note });
    toast.success(`₹${amt} deposited from ${sel.name}`);
    setAmt(""); setHubId(""); setNote(""); setSel(null);
    load();
  }
  const blocked = riders.filter(r => r.blocked);
  return (
    <div data-testid="cod-handover-page">
      <PageHeader title="COD Handover" subtitle="Rider cash deposits at the hub" />
      {blocked.length > 0 && (
        <div className="surface p-3 mb-4 border-l-4 border-rose-500 flex items-center gap-2 bg-rose-50/50" data-testid="blocked-banner">
          <ShieldAlert size={16} className="text-rose-600" />
          <span className="text-[13px]"><strong>{blocked.length}</strong> rider{blocked.length > 1 ? "s" : ""} blocked — over COD limit</span>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Rider</th><th>City</th><th>COD Pending</th><th>Limit</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {riders.map(r => {
                const pct = Math.min(100, Math.round((r.cod_pending / r.cod_limit) * 100));
                return (
                  <tr key={r.id} data-testid={`cod-rider-${r.id}`}>
                    <td className="font-medium">{r.name}</td>
                    <td>{r.city}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="mono">₹{r.cod_pending}</span>
                        <div className="w-24 h-1 bg-zinc-100 rounded-sm overflow-hidden"><div className={`h-1 ${r.blocked ? "bg-rose-500" : "bg-zinc-900"}`} style={{ width: `${pct}%` }} /></div>
                      </div>
                    </td>
                    <td className="mono">₹{r.cod_limit}</td>
                    <td>{r.blocked ? <span className="pill bg-rose-50 text-rose-800 border-rose-300">BLOCKED</span> : <span className="pill bg-emerald-50 text-emerald-800 border-emerald-300">OK</span>}</td>
                    <td><button onClick={() => setSel(r)} className="chip" data-testid={`select-cod-${r.id}`}>Record deposit</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="surface p-4">
          <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Record COD deposit</h3>
          {!sel ? <div className="text-[12px] text-zinc-500">Click a rider to begin.</div> : (
            <>
              <div className="mb-3 p-2 bg-zinc-50 rounded-sm text-[12px]">
                <div className="font-medium">{sel.name}</div>
                <div className="text-zinc-500 mono">Pending: ₹{sel.cod_pending}</div>
              </div>
              <input value={amt} onChange={e => setAmt(e.target.value)} placeholder="Amount" className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2 mono" data-testid="cod-amt" />
              <select value={hubId} onChange={e => setHubId(e.target.value)} className="h-9 text-sm w-full mb-2 border border-[var(--border-default)] rounded-sm px-2" data-testid="cod-hub">
                <option value="">Select hub</option>
                {hubs.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
              </select>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" className="h-9 text-sm w-full mb-3 border border-[var(--border-default)] rounded-sm px-2" data-testid="cod-note" />
              <button onClick={deposit} className="w-full bg-zinc-900 text-white text-[13px] py-2 rounded-sm" data-testid="cod-submit">Record deposit</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

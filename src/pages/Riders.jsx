import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";

export default function Riders() {
  const nav = useNavigate();
  const [tab, setTab] = useState("ALL");
  const [riders, setRiders] = useState([]);

  async function load() {
    const params = {};
    if (tab === "PENDING") params.status = "PENDING";
    if (tab === "AVAILABLE") params.availability = "ONLINE";
    const r = await api.get("/riders", { params });
    setRiders(r.data.riders);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab]);

  async function approve(e, id) { e.stopPropagation(); await api.post(`/riders/${id}/approve`); toast.success("Rider approved"); load(); }
  async function reject(e, id) { e.stopPropagation(); await api.post(`/riders/${id}/reject`); toast.success("Rider rejected"); load(); }

  return (
    <div data-testid="riders-page">
      <PageHeader title="Riders" subtitle="Onboard and manage the fleet" />
      <div className="tabbar mb-4">
        {["ALL", "PENDING", "AVAILABLE"].map(t => (
          <button key={t} className={tab === t ? "active" : ""} onClick={() => setTab(t)} data-testid={`rider-tab-${t}`}>{t}</button>
        ))}
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th></th><th>Name</th><th>Phone</th><th>Vehicle</th><th>City</th><th>Rating</th><th>Status</th><th>Avail</th><th>Wallet</th><th>COD</th><th></th><th></th></tr></thead>
          <tbody>
            {riders.map(r => (
              <tr key={r.id} onClick={() => nav(`/riders/${r.id}`)} className="row-link" data-testid={`rider-row-${r.id}`}>
                <td><img src={r.avatar} className="w-7 h-7 rounded-full" alt="" /></td>
                <td className="font-medium">{r.name}</td>
                <td className="mono text-[12px]">{r.phone}</td>
                <td>{r.vehicle_type}</td>
                <td>{r.city}</td>
                <td className="mono">{r.rating}</td>
                <td><span className={`pill ${r.status === "APPROVED" ? "pill-green" : r.status === "PENDING" ? "pill-amber" : "pill-red"}`}>{r.status}</span></td>
                <td><span className={`pill ${r.availability === "ONLINE" ? "pill-green" : "pill-slate"}`}>{r.availability}</span></td>
                <td className="mono text-[12px]">₹{r.wallet_balance}</td>
                <td className="mono text-[12px]" style={{ color: r.blocked ? "var(--brand-red)" : "var(--slate-600)" }}>₹{r.cod_pending}/{r.cod_limit}</td>
                <td>
                  {r.blocked && <span className="pill pill-red">Blocked</span>}
                  {r.status === "PENDING" && (
                    <div className="flex gap-1">
                      <button onClick={(e) => approve(e, r.id)} className="chip" data-testid={`approve-${r.id}`}>Approve</button>
                      <button onClick={(e) => reject(e, r.id)} className="chip" style={{ color: "var(--brand-red)" }} data-testid={`reject-${r.id}`}>Reject</button>
                    </div>
                  )}
                </td>
                <td><ChevronRight size={14} className="text-[var(--slate-400)]" /></td>
              </tr>
            ))}
            {riders.length === 0 && <tr><td colSpan={12} className="empty">No riders found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

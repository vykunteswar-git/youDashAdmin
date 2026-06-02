import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { toast } from "sonner";
import { ChevronRight, Search, X } from "lucide-react";

const TABS = [
  ["ALL", "All"],
  ["PENDING", "Pending"],
  ["AVAILABLE", "Available"],
  ["BUSY", "Busy"],
  ["BLOCKED", "Blocked"],
  ["OFFLINE", "Offline"],
];

function RiderStatusPill({ status, blocked }) {
  if (blocked || status === "BLOCKED") return <span className="pill pill-red">BLOCKED</span>;
  if (status === "ORDER_ASSIGNED") return <span className="pill pill-amber">BUSY</span>;
  if (status === "ONLINE") return <span className="pill pill-green">ONLINE</span>;
  return <span className="pill pill-slate">{status || "OFFLINE"}</span>;
}

const STATUS_FILTERS = [
  ["ALL", "All statuses"],
  ["APPROVED", "Approved"],
  ["PENDING", "Pending"],
  ["REJECTED", "Rejected"],
];

export default function Riders() {
  const nav = useNavigate();
  const [tab, setTab] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [q, setQ] = useState("");
  const [riders, setRiders] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get("/riders", {
        params: { tab, status_filter: statusFilter },
      });
      setRiders(r.data.riders || []);
    } catch (e) {
      toast.error(e.response?.data?.message || "Failed to load riders");
      setRiders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [statusFilter]);

  const filtered = useMemo(() => {
    let list = riders;
    if (tab === "PENDING") list = list.filter((r) => r.status === "PENDING");
    else if (tab === "AVAILABLE") list = list.filter((r) => r.availability === "ONLINE");
    else if (tab === "BUSY") list = list.filter((r) => r.availability === "ORDER_ASSIGNED");
    else if (tab === "BLOCKED") list = list.filter((r) => r.blocked || r.availability === "BLOCKED");
    else if (tab === "OFFLINE") list = list.filter((r) => r.availability === "OFFLINE");
    if (statusFilter !== "ALL") list = list.filter((r) => r.status === statusFilter);
    const query = q.trim().toLowerCase();
    if (query) list = list.filter((r) =>
      [r.name, r.phone, String(r.id), r.vehicle_type, r.city]
        .some((v) => String(v || "").toLowerCase().includes(query)),
    );
    return list;
  }, [riders, q, tab, statusFilter]);

  async function approve(e, id) {
    e.stopPropagation();
    await api.post(`/riders/${id}/approve`);
    toast.success("Rider approved");
    load();
  }
  async function reject(e, id) {
    e.stopPropagation();
    await api.post(`/riders/${id}/reject`);
    toast.success("Rider rejected");
    load();
  }

  const onlineCount = riders.filter((r) => r.availability === "ONLINE").length;
  const busyCount = riders.filter((r) => r.availability === "ORDER_ASSIGNED").length;
  const blockedCount = riders.filter((r) => r.blocked || r.availability === "BLOCKED").length;
  const offlineCount = riders.filter((r) => r.availability === "OFFLINE").length;

  return (
    <div data-testid="riders-page">
      <PageHeader title="Rider Management" subtitle="All riders with live availability status" />

      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="kpi"><div className="label">Online</div><div className="value" style={{ color: "var(--brand-green)" }}>{onlineCount}</div></div>
        <div className="kpi"><div className="label">Busy</div><div className="value" style={{ color: "var(--brand-amber, #d97706)" }}>{busyCount}</div></div>
        <div className="kpi"><div className="label">Blocked</div><div className="value" style={{ color: "var(--brand-red)" }}>{blockedCount}</div></div>
        <div className="kpi"><div className="label">Offline</div><div className="value">{offlineCount}</div></div>
      </div>

      <div className="tabbar mb-3">
        {TABS.map(([key, label]) => (
          <button key={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); setStatusFilter("ALL"); }}
            data-testid={`rider-tab-${key}`}>{label}</button>
        ))}
      </div>

      <div className="surface p-3 mb-4 flex items-center gap-2 flex-wrap" data-testid="rider-filters">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone, vehicle…"
            className="pl-7 h-8 w-64 text-[13px] border border-[var(--border-default)] rounded-sm" data-testid="rider-search" />
        </div>
        <label className="flex items-center gap-2 text-[12px] text-zinc-600">
          <span className="text-zinc-500">Approval</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={tab !== "ALL"}
            data-testid="rider-status-filter" className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2 bg-white">
            {STATUS_FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        <button onClick={() => { setQ(""); setStatusFilter("ALL"); setTab("ALL"); }} className="chip"><X size={12} /> Reset</button>
      </div>

      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead>
            <tr>
              <th></th><th>Name</th><th>Phone</th><th>Vehicle</th><th>City</th><th>Rating</th>
              <th>Approval</th><th>Status</th><th>Wallet</th><th>COD</th><th>Actions</th><th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={12} className="empty">Loading riders…</td></tr>}
            {!loading && filtered.length === 0 && <tr><td colSpan={12} className="empty">No riders in this view.</td></tr>}
            {!loading && filtered.map(r => (
              <tr key={r.id} onClick={() => nav(`/riders/${r.id}`)} className="row-link" data-testid={`rider-row-${r.id}`}>
                <td><img src={r.avatar} className="w-7 h-7 rounded-full object-cover" alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} /></td>
                <td className="font-medium">{r.name}</td>
                <td className="mono text-[12px]">{r.phone}</td>
                <td>{r.vehicle_type}</td>
                <td>{r.city}</td>
                <td className="mono">{r.rating ?? "—"}</td>
                <td><span className={`pill ${r.status === "APPROVED" ? "pill-green" : r.status === "PENDING" ? "pill-amber" : "pill-red"}`}>{r.status}</span></td>
                <td><RiderStatusPill status={r.availability} blocked={r.blocked} /></td>
                <td className="mono text-[12px]">₹{r.wallet_balance}</td>
                <td className="mono text-[12px]" style={{ color: r.blocked ? "var(--brand-red)" : "var(--slate-600)" }}>₹{r.cod_pending}/{r.cod_limit}</td>
                <td onClick={(e) => e.stopPropagation()}>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}

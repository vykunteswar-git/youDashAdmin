import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const ACTION_TYPES = ["ALL", "CONFIG_CHANGED", "USER_BANNED", "COUPON_CREATED", "RIDER_APPROVED", "RIDER_REJECTED",
  "WITHDRAWAL_APPROVED", "WITHDRAWAL_REJECTED", "BULK_STATUS_UPDATE", "EMERGENCY_OVERRIDE", "COD_DEPOSIT_RECORDED",
  "APP_VERSION_UPDATED", "USER_DELETED"];

const TYPE_COLORS = {
  USER_BANNED: "bg-rose-50 text-rose-800 border-rose-300",
  USER_DELETED: "bg-rose-50 text-rose-800 border-rose-300",
  CONFIG_CHANGED: "bg-indigo-50 text-indigo-800 border-indigo-300",
  COUPON_CREATED: "bg-emerald-50 text-emerald-800 border-emerald-300",
  EMERGENCY_OVERRIDE: "bg-amber-50 text-amber-800 border-amber-300",
};

export default function AuditLogs() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [logs, setLogs] = useState([]);
  async function load() {
    const params = {};
    if (q) params.q = q;
    if (type !== "ALL") params.action_type = type;
    const r = await api.get("/audit-logs", { params });
    setLogs(r.data.logs);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, type]);
  return (
    <div data-testid="audit-page">
      <PageHeader title="Audit Logs" subtitle="Tamper-proof record of admin actions" />
      <div className="surface p-3 mb-4 flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search actor, target, detail…" className="h-8 text-[12px] px-2 border border-[var(--border-default)] rounded-sm w-72" data-testid="audit-search" />
        <select value={type} onChange={e => setType(e.target.value)} className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" data-testid="audit-type">
          {ACTION_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Log ID</th><th>Actor</th><th>Action</th><th>Target</th><th>Detail</th><th>Time</th></tr></thead>
          <tbody>
            {logs.map(l => (
              <tr key={l.id} data-testid={`audit-row-${l.id}`}>
                <td className="mono text-[11px] text-zinc-500">{l.id.slice(0, 8)}</td>
                <td>{l.actor}</td>
                <td><span className={`pill ${TYPE_COLORS[l.action_type] || "bg-zinc-100 text-zinc-700 border-zinc-300"}`}>{l.action_type}</span></td>
                <td className="text-[12px]">{l.target}</td>
                <td className="text-[12px] text-zinc-600">{l.detail}</td>
                <td className="text-[11px] text-zinc-500">{new Date(l.ts).toLocaleString()}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={6} className="empty">No logs.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";

export default function Transactions() {
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [data, setData] = useState({ transactions: [], summary: { total: 0, payouts: 0, pg: 0 } });
  async function load() {
    const params = {};
    if (type !== "ALL") params.type = type;
    if (status !== "ALL") params.status = status;
    if (q) params.q = q;
    const r = await api.get("/transactions", { params });
    setData({
      transactions: r.data?.transactions ?? [],
      summary: {
        total: r.data?.summary?.total ?? 0,
        payouts: r.data?.summary?.payouts ?? 0,
        pg: r.data?.summary?.pg ?? 0,
      },
    });
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [type, status, q]);
  return (
    <div data-testid="transactions-page">
      <PageHeader title="Transactions" subtitle="Financial audit trail" />
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="kpi"><div className="label">Total Volume</div><div className="value mono">₹{data.summary.total.toLocaleString()}</div></div>
        <div className="kpi"><div className="label">Active Payouts</div><div className="value mono">₹{data.summary.payouts.toLocaleString()}</div></div>
        <div className="kpi"><div className="label">PG Volume</div><div className="value mono">₹{data.summary.pg.toLocaleString()}</div></div>
      </div>
      <div className="surface p-3 mb-4 flex gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search TXN ID" className="h-8 text-[12px] px-2 border border-[var(--border-default)] rounded-sm w-60" data-testid="txn-search" />
        <select value={type} onChange={e => setType(e.target.value)} className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" data-testid="txn-type">
          <option value="ALL">All types</option><option value="ORDER_PAY">Order Pay</option><option value="PAYOUT">Payouts</option>
        </select>
        <select value={status} onChange={e => setStatus(e.target.value)} className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" data-testid="txn-status">
          <option value="ALL">All status</option><option value="SUCCESS">Success</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option>
        </select>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>TXN ID</th><th>Party</th><th>Type</th><th>Method</th><th>Status</th><th>Amount</th><th>Source</th><th>Time</th></tr></thead>
          <tbody>
            {data.transactions.map(t => (
              <tr key={t.id}>
                <td className="mono text-[12px]">{t.txn_id}</td>
                <td>{t.party}</td>
                <td>{t.type}</td>
                <td>{t.method}</td>
                <td><span className={`pill ${t.status === "SUCCESS" ? "bg-emerald-50 text-emerald-800 border-emerald-300" : t.status === "PENDING" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-rose-50 text-rose-800 border-rose-300"}`}>{t.status}</span></td>
                <td className="mono">₹{t.amount}</td>
                <td>{t.source}</td>
                <td className="text-[11px] text-zinc-500">{new Date(t.ts).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

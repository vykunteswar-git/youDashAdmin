import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowUpRight, Clock, AlertTriangle, CheckCircle2, IndianRupee } from "lucide-react";

export default function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/dashboard/summary").then(r => setData({
      kpis: {
        total_orders: r.data?.kpis?.total_orders ?? 0,
        gross_revenue: r.data?.kpis?.gross_revenue ?? 0,
        online_riders: r.data?.kpis?.online_riders ?? 0,
        active_users: r.data?.kpis?.active_users ?? 0,
      },
      health: {
        avg_assignment_eta: r.data?.health?.avg_assignment_eta ?? "0 min",
        cancellation_rate: r.data?.health?.cancellation_rate ?? 0,
        completion_rate: r.data?.health?.completion_rate ?? 0,
        avg_order_value: r.data?.health?.avg_order_value ?? 0,
      },
      chart: r.data?.chart ?? [],
      feed: r.data?.feed ?? [],
    }));
  }, []);
  if (!data) return <div data-testid="dashboard-loading" className="p-10 text-zinc-500">Loading…</div>;
  const { kpis, health, chart, feed } = data;

  return (
    <div data-testid="dashboard-page">
      <PageHeader title="Dashboard" subtitle="Real-time operational snapshot · India ops" />

      <div className="grid grid-cols-4 gap-3 mb-3">
        <KPI label="Total Orders" value={kpis.total_orders} icon={<ArrowUpRight size={14} />} testid="kpi-orders" />
        <KPI label="Gross Revenue" value={`₹${kpis.gross_revenue.toLocaleString()}`} icon={<IndianRupee size={14} />} testid="kpi-revenue" />
        <KPI label="Online Riders" value={kpis.online_riders} icon={<CheckCircle2 size={14} />} testid="kpi-riders" />
        <KPI label="Active Users" value={kpis.active_users} icon={<ArrowUpRight size={14} />} testid="kpi-users" />
      </div>

      <div className="grid grid-cols-4 gap-3 mb-5">
        <KPI label="Avg Assignment ETA" value={health.avg_assignment_eta} icon={<Clock size={14} />} testid="kpi-eta" />
        <KPI label="Cancellation Rate" value={`${health.cancellation_rate}%`} icon={<AlertTriangle size={14} />} testid="kpi-cancel" />
        <KPI label="Completion Rate" value={`${health.completion_rate}%`} icon={<CheckCircle2 size={14} />} testid="kpi-complete" />
        <KPI label="Avg Order Value" value={`₹${health.avg_order_value}`} icon={<IndianRupee size={14} />} testid="kpi-aov" />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 surface p-4" data-testid="chart-volume">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-semibold">Order volume — today (2h buckets)</h3>
            <div className="flex gap-1">
              {["Today", "Week", "Month"].map(t => (
                <button key={t} className={`chip ${t === "Today" ? "chip-active" : ""}`} data-testid={`range-${t.toLowerCase()}`}>{t}</button>
              ))}
            </div>
          </div>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
                <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
                <YAxis stroke="#71717a" fontSize={11} />
                <Tooltip cursor={{ fill: "#f4f4f5" }} contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 4, fontSize: 12 }} />
                <Bar dataKey="value" fill="#09090b" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="surface p-4" data-testid="live-feed">
          <h3 className="text-sm font-semibold mb-3">Live Activity</h3>
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {feed.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px]">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5" />
                <div className="flex-1">
                  <div className="font-mono text-[11px] text-zinc-400">{new Date(f.ts).toLocaleTimeString()}</div>
                  <div>{f.detail}</div>
                  <div className="text-zinc-500 text-[11px]">by {f.actor}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, icon, testid }) {
  return (
    <div className="kpi" data-testid={testid}>
      <div className="flex justify-between items-center">
        <span className="label">{label}</span>
        <span className="text-zinc-400">{icon}</span>
      </div>
      <div className="value mono">{value}</div>
    </div>
  );
}

import { useEffect, useState } from "react";
import api, { BACKEND_URL } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";
import { Download } from "lucide-react";
import { toast } from "sonner";

export default function Reports() {
  const [range, setRange] = useState("today");
  const [data, setData] = useState(null);
  useEffect(() => { api.get("/reports", { params: { range } }).then(r => setData(r.data)); }, [range]);

  function exportCsv() {
    const a = document.createElement("a");
    a.href = `${BACKEND_URL}/api/exports/reports.csv?range=${encodeURIComponent(range)}`;
    a.download = `report_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success(`Exporting ${range} report…`);
  }

  if (!data) return <div className="p-10 text-[var(--slate-500)]">Loading…</div>;
  return (
    <div data-testid="reports-page">
      <PageHeader
        title="Reports & Analytics"
        subtitle="Revenue trends and conversion"
        actions={
          <button onClick={exportCsv} className="btn-secondary" data-testid="export-reports-btn">
            <Download size={14} /> Export CSV
          </button>
        }
      />
      <div className="tabbar mb-4">
        {[["today", "Today"], ["week", "This Week"], ["month", "This Month"]].map(([k, l]) => (
          <button key={k} className={range === k ? "active" : ""} onClick={() => setRange(k)} data-testid={`range-${k}`}>{l}</button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-3 mb-4">
        <div className="kpi"><div className="label">Total Revenue</div><div className="value mono">₹{data.kpis.total_revenue.toLocaleString()}</div></div>
        <div className="kpi"><div className="label">Rush Multiplier</div><div className="value mono">{data.kpis.rush_multiplier}</div></div>
        <div className="kpi"><div className="label">Completion Rate</div><div className="value mono">{data.kpis.completion_rate}</div></div>
        <div className="kpi"><div className="label">Avg Assignment ETA</div><div className="value mono">{data.kpis.avg_assignment_eta}</div></div>
      </div>
      <div className="surface p-4 mb-4">
        <h3 className="text-sm font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Revenue trend</h3>
        <div style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={data.chart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="label" stroke="#71717a" fontSize={11} />
              <YAxis stroke="#71717a" fontSize={11} />
              <Tooltip contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 4, fontSize: 12 }} />
              <Bar dataKey="value" fill="var(--brand-red)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Source</th><th>Volume</th><th>Revenue</th><th>Conversion</th></tr></thead>
          <tbody>
            {data.top_sources.map(s => (
              <tr key={s.source}>
                <td className="font-medium">{s.source}</td>
                <td className="mono">{s.volume}</td>
                <td className="mono">₹{s.revenue.toLocaleString()}</td>
                <td className="mono">{s.conversion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

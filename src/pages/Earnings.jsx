import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";

const RANGES = [["today", "Today"], ["week", "This Week"], ["month", "This Month"]];

function fmt(v) {
  return `₹${Number(v ?? 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default function Earnings() {
  const [range, setRange] = useState("week");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get("/earnings", { params: { range } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <div data-testid="earnings-page">
      <PageHeader
        title="Platform Earnings"
        subtitle="Revenue, commission and rider payout breakdown"
      />

      <div className="tabbar mb-4">
        {RANGES.map(([k, l]) => (
          <button key={k} className={range === k ? "active" : ""} onClick={() => setRange(k)} data-testid={`range-${k}`}>
            {l}
          </button>
        ))}
      </div>

      {loading && <div className="p-10 text-[var(--slate-500)]">Loading…</div>}

      {!loading && data && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4 xl:grid-cols-6">
            <div className="kpi">
              <div className="label">Total Revenue</div>
              <div className="value mono">{fmt(data.totalRevenue)}</div>
              <div className="sub">{data.orderCount} orders</div>
            </div>
            <div className="kpi">
              <div className="label">Commission Earned</div>
              <div className="value mono">{fmt(data.totalCommission)}</div>
            </div>
            <div className="kpi">
              <div className="label">GST Collected</div>
              <div className="value mono">{fmt(data.totalGst)}</div>
            </div>
            <div className="kpi">
              <div className="label">Platform Fee</div>
              <div className="value mono">{fmt(data.totalPlatformFee)}</div>
            </div>
            <div className="kpi" style={{ borderColor: "var(--brand-red)" }}>
              <div className="label">Platform Net</div>
              <div className="value mono" style={{ color: "var(--brand-red)" }}>{fmt(data.totalPlatformNet)}</div>
              <div className="sub">Comm + GST + Fee</div>
            </div>
            <div className="kpi">
              <div className="label">Rider Payouts</div>
              <div className="value mono">{fmt(data.totalRiderPayouts)}</div>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
              <span className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Order-level breakdown</span>
              <span className="text-xs text-[var(--slate-500)]">{data.orders?.length ?? 0} rows</span>
            </div>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Payment</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Subtotal</th>
                    <th className="text-right">Comm%</th>
                    <th className="text-right">Commission</th>
                    <th className="text-right">Rider Earned</th>
                    <th className="text-right">Platform Net</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.orders ?? []).map(row => (
                    <tr key={row.orderId}>
                      <td className="font-medium mono">{row.displayOrderId}</td>
                      <td className="text-xs text-[var(--slate-500)]">{fmtDate(row.createdAt)}</td>
                      <td>
                        <span className="badge">{row.serviceMode ?? "—"}</span>
                      </td>
                      <td>
                        <span className={`badge ${row.paymentType === "COD_CASH" || row.paymentType === "COD_QR" ? "badge-warn" : "badge-ok"}`}>
                          {row.paymentType ?? "—"}
                        </span>
                      </td>
                      <td className="text-right mono">{fmt(row.totalAmount)}</td>
                      <td className="text-right mono">{fmt(row.subtotal)}</td>
                      <td className="text-right mono">{row.commissionPercent?.toFixed(1) ?? "—"}%</td>
                      <td className="text-right mono">{fmt(row.commissionAmount)}</td>
                      <td className="text-right mono">{fmt(row.riderEarning)}</td>
                      <td className="text-right mono font-semibold">{fmt(row.platformNet)}</td>
                    </tr>
                  ))}
                  {(data.orders ?? []).length === 0 && (
                    <tr><td colSpan={10} className="text-center py-10 text-[var(--slate-500)]">No delivered orders in this period.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

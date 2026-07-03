import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { X } from "lucide-react";

const RANGES = [["today", "Today"], ["week", "This Week"], ["month", "This Month"]];
const PAY_FILTERS = [["all", "All"], ["to_pay", "To Pay"], ["paid", "Paid"]];

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

function isToPayRow(row) {
  const ps = String(row.paymentStatus ?? "").toUpperCase();
  if (ps === "TO_PAY" || ps === "TOPAY") return true;
  if (ps === "PAID") return false;
  /* fallback for legacy rows without paymentStatus */
  const pt = String(row.paymentType ?? "").toUpperCase();
  return pt === "TO_PAY" || pt === "TOPAY";
}

function isPaidRow(row) {
  return !isToPayRow(row);
}

export default function Earnings() {
  const [range, setRange] = useState("week");
  const [payFilter, setPayFilter] = useState("all");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [collectDialog, setCollectDialog] = useState(null); // { orderId, displayOrderId, amount }
  const [collecting, setCollecting] = useState(false);

  function loadData() {
    setLoading(true);
    api.get("/earnings", { params: { range } })
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadData(); }, [range]);

  const allOrders = data?.orders ?? [];

  const filteredOrders = allOrders.filter(row => {
    if (payFilter === "to_pay") return isToPayRow(row);
    if (payFilter === "paid")   return isPaidRow(row);
    return true;
  });

  /* Sum of all To Pay orders in current range */
  const toCollectTotal = allOrders
    .filter(row => isToPayRow(row))
    .reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);

  async function handleCollect() {
    if (!collectDialog) return;
    setCollecting(true);
    try {
      await api.patch(`/orders/${collectDialog.orderId}/collect`);
      setCollectDialog(null);
      loadData();
    } catch (err) {
      alert(err?.response?.data?.message || "Failed to mark as collected");
    } finally {
      setCollecting(false);
    }
  }

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

      {loading && <AppLoadingScreen message="Loading earnings…" testId="earnings-loading" />}

      {!loading && data && (
        <>
          {/* KPI grid — includes To Collect card */}
          <div className="grid grid-cols-3 gap-3 mb-4 xl:grid-cols-7">
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
            {/* To Collect — H2H To Pay orders outstanding */}
            <div className="kpi" style={{ borderColor: "#F59E0B", background: toCollectTotal > 0 ? "#FFFBEB" : undefined }}>
              <div className="label" style={{ color: "#92400E" }}>To Collect</div>
              <div className="value mono" style={{ color: "#D97706" }}>{fmt(toCollectTotal)}</div>
              <div className="sub">Unpaid (To Pay orders)</div>
            </div>
          </div>

          <div className="surface overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)] flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-semibold" style={{ fontFamily: "Outfit" }}>Order-level breakdown</span>
              <div className="flex items-center gap-2">
                {/* Pay filter pills */}
                <div className="flex rounded border border-[var(--border-default)] overflow-hidden text-xs">
                  {PAY_FILTERS.map(([k, l]) => (
                    <button
                      key={k}
                      onClick={() => setPayFilter(k)}
                      className={`px-3 py-1.5 transition ${payFilter === k ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"} ${k !== "all" ? "border-l border-[var(--border-default)]" : ""}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
                <span className="text-xs text-[var(--slate-500)]">{filteredOrders.length} rows</span>
              </div>
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
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map(row => (
                    <tr key={row.orderId}>
                      <td className="font-medium mono">{row.displayOrderId}</td>
                      <td className="text-xs text-[var(--slate-500)]">{fmtDate(row.createdAt)}</td>
                      <td>
                        <span className="badge">{row.serviceMode ?? "—"}</span>
                      </td>
                      <td>
                        <span className={`badge ${isToPayRow(row) ? "badge-warn" : "badge-ok"}`}>
                          {isToPayRow(row) ? "To Pay" : "Paid"}
                        </span>
                      </td>
                      <td className="text-right mono">{fmt(row.totalAmount)}</td>
                      <td className="text-right mono">{row.serviceMode === "HUB_TO_HUB" ? "—" : fmt(row.subtotal)}</td>
                      <td className="text-right mono">{row.serviceMode === "HUB_TO_HUB" ? "—" : (row.commissionPercent?.toFixed(1) ?? "—") + "%"}</td>
                      <td className="text-right mono">{row.serviceMode === "HUB_TO_HUB" ? fmt(row.subtotal) : fmt(row.commissionAmount)}</td>
                      <td className="text-right mono">{fmt(row.riderEarning)}</td>
                      <td className="text-right mono font-semibold">{fmt(row.platformNet)}</td>
                      <td>
                        {isToPayRow(row) && (
                          <button
                            onClick={() => setCollectDialog({ orderId: row.orderId, displayOrderId: row.displayOrderId, amount: row.totalAmount })}
                            className="px-3 py-1 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded transition whitespace-nowrap"
                          >
                            Collected
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-10 text-[var(--slate-500)]">
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Collect confirmation dialog */}
      {collectDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
              <h2 className="text-[15px] font-semibold">Confirm Amount Collected</h2>
              <button onClick={() => setCollectDialog(null)} className="text-zinc-400 hover:text-zinc-700 transition">
                <X size={18} />
              </button>
            </div>
            <div className="px-5 py-5 text-[13px] space-y-3">
              <p className="text-zinc-600">
                Order <span className="font-semibold font-mono">{collectDialog.displayOrderId}</span>
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded px-4 py-3 text-center">
                <p className="text-xs text-amber-700 mb-1">Amount to confirm</p>
                <p className="text-2xl font-black text-amber-600 font-mono">{fmt(collectDialog.amount)}</p>
              </div>
              <p className="text-xs text-zinc-400">
                This will mark the order as Paid. This action cannot be undone.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-3">
              <button
                onClick={() => setCollectDialog(null)}
                className="flex-1 py-2 text-[13px] border border-zinc-300 rounded-sm hover:bg-zinc-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCollect}
                disabled={collecting}
                className="flex-1 py-2 text-[13px] font-semibold bg-amber-500 hover:bg-amber-600 text-white rounded-sm disabled:opacity-50 transition"
              >
                {collecting ? "Marking…" : "Yes, Collected"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

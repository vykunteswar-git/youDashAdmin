import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import { X, CalendarDays } from "lucide-react";

const RANGES = [["today", "Today"], ["week", "This Week"], ["month", "This Month"], ["custom", "Custom"]];
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
  const [collectDialog, setCollectDialog] = useState(null); // { orderId, displayOrderId, amount }
  const [collecting, setCollecting] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [appliedFromDate, setAppliedFromDate] = useState("");
  const [appliedToDate, setAppliedToDate] = useState("");

  const [page, setPage] = useState(0);
  const [size] = useState(15);

  const { data, isLoading: queryLoading, refetch: refetchEarningsData } = useQuery({
    queryKey: ["earnings", range, range === "custom" ? appliedFromDate : "", range === "custom" ? appliedToDate : "", page, size],
    queryFn: async () => {
      const params = range === "custom"
        ? { from: appliedFromDate, ...(appliedToDate ? { to: appliedToDate } : {}) }
        : { range };

      params.page = page;
      params.size = size;

      const res = await api.get("/earnings", { params });
      return res.data;
    },
    enabled: range !== "custom" || Boolean(appliedFromDate),
  });

  const loading = queryLoading && !data;

  function handleCustomApply() {
    if (!fromDate) return;
    setAppliedFromDate(fromDate);
    setAppliedToDate(toDate);
  }

  function handleRangeChange(r) {
    setRange(r);
    if (r !== "custom") {
      setFromDate("");
      setToDate("");
      setAppliedFromDate("");
      setAppliedToDate("");
    }
  }

  const allOrders = data?.orders ?? [];

  const filteredOrders = allOrders.filter(row => {
    if (payFilter === "to_pay") return isToPayRow(row);
    if (payFilter === "paid")   return isPaidRow(row);
    return true;
  });

  const isServerPaginated = data && (data.totalElements !== undefined || data.totalPages !== undefined);

  const paginatedOrders = useMemo(() => {
    if (isServerPaginated) {
      return filteredOrders;
    }
    const start = page * size;
    return filteredOrders.slice(start, start + size);
  }, [filteredOrders, page, size, isServerPaginated]);

  const totalPages = useMemo(() => {
    if (isServerPaginated) {
      return data.totalPages ?? 1;
    }
    return Math.ceil(filteredOrders.length / size);
  }, [filteredOrders.length, size, isServerPaginated, data]);

  useEffect(() => {
    setPage(0);
  }, [range, payFilter, appliedFromDate, appliedToDate]);

  /* Sum of all To Pay orders in current range */
  const toCollectTotal = allOrders
    .filter(row => isToPayRow(row))
    .reduce((sum, row) => sum + Number(row.totalAmount ?? 0), 0);

  async function handleCollect() {
    if (!collectDialog) return;
    setCollecting(true);
    try {
      await api.patch(`/admin/orders/${collectDialog.orderId}/collect`);
      setCollectDialog(null);
      refetchEarningsData();
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

      {/* Range selector row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Preset pills */}
        <div className="flex bg-zinc-100 rounded-lg p-1 gap-0.5">
          {RANGES.map(([k, l]) => (
            <button
              key={k}
              onClick={() => handleRangeChange(k)}
              data-testid={`range-${k}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                range === k
                  ? "bg-white shadow text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              {k === "custom" && <CalendarDays size={12} />}
              {l}
            </button>
          ))}
        </div>

        {/* Custom date inputs — slide in when Custom is active */}
        {range === "custom" && (
          <div className="flex items-center gap-2 bg-zinc-100 rounded-lg p-1">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="bg-white border border-zinc-200 rounded-md text-xs px-2.5 py-1.5 text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-300"
              placeholder="From"
            />
            <span className="text-zinc-400 text-xs font-medium">→</span>
            <input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={e => setToDate(e.target.value)}
              className="bg-white border border-zinc-200 rounded-md text-xs px-2.5 py-1.5 text-zinc-800 outline-none focus:ring-2 focus:ring-zinc-300"
              placeholder="To"
            />
            <button
              onClick={handleCustomApply}
              disabled={!fromDate}
              className="px-3 py-1.5 rounded-md bg-zinc-900 text-white text-xs font-semibold disabled:opacity-40 hover:bg-zinc-700 transition"
            >
              Apply
            </button>
          </div>
        )}

        {/* Active custom range label */}
        {range === "custom" && data && fromDate && (
          <span className="text-xs text-zinc-400">
            {fromDate}{toDate ? ` – ${toDate}` : " onwards"} · {data.orderCount} orders
          </span>
        )}
      </div>

      {loading && <AppLoadingScreen message="Loading earnings…" testId="earnings-loading" />}

      {!loading && range === "custom" && !data && (
        <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
          <CalendarDays size={32} className="text-zinc-300" />
          <p className="text-sm font-medium">Select a date range and click Apply</p>
        </div>
      )}

      {!loading && data && (
        <>
          {/* KPI grid — includes To Collect card */}
          <div className="grid grid-cols-3 gap-3 mb-4 xl:grid-cols-7">
            <div className="kpi">
              <div className="label">Total Revenue</div>
              <div className="value mono">{fmt(data.totalRevenue - toCollectTotal)}</div>
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
                    <th>Destination</th>
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
                  {paginatedOrders.map(row => (
                    <tr key={row.orderId}>
                      <td className="font-medium mono">{row.displayOrderId}</td>
                      <td className="text-xs text-[var(--slate-500)]">{fmtDate(row.createdAt)}</td>
                      <td className="text-xs text-[var(--slate-500)] max-w-[180px] truncate" title={row.destinationAddress || "—"}>
                        {row.destinationAddress || "—"}
                      </td>
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
                      <td colSpan={12} className="text-center py-10 text-[var(--slate-500)]">
                        No orders found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-[var(--border-default)] px-4 py-3 bg-white text-xs">
                  <div className="text-zinc-500">
                    Showing <span className="font-medium text-zinc-700">{page * size + 1}</span> to{" "}
                    <span className="font-medium text-zinc-700">
                      {Math.min((page + 1) * size, filteredOrders.length)}
                    </span>{" "}
                    of <span className="font-medium text-zinc-700">{filteredOrders.length}</span> orders
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setPage(prev => Math.max(0, prev - 1))}
                      disabled={page === 0}
                      className="px-3 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      data-testid="pagination-prev"
                    >
                      Previous
                    </button>
                    <span className="text-zinc-600 font-medium">
                      Page {page + 1} of {totalPages}
                    </span>
                    <button
                      onClick={() => setPage(prev => Math.min(totalPages - 1, prev + 1))}
                      disabled={page === totalPages - 1}
                      className="px-3 py-1 text-xs border border-zinc-300 rounded hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      data-testid="pagination-next"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
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

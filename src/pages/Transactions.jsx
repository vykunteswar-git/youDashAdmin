import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  CalendarRange,
  CreditCard,
  DollarSign,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  getAxiosErrorMessage,
  isApiFailureBody,
  readApiMessage,
  transactionAdminService,
  unwrapList,
} from "../services/apiService";

const TYPE_TABS = [
  { label: "All", value: "ALL" },
  { label: "Payouts", value: "PAYOUT" },
  { label: "Order Pay", value: "ORDER_PAY" },
];

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0";
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function toIsoInstant(value) {
  const s = String(value || "").trim();
  if (!s) return "";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s.includes("success") || s === "completed") return "active";
  if (s.includes("pending") || s.includes("processing")) return "info";
  return "cancelled";
}

function sourceTypeLabel(sourceType) {
  if (sourceType === "PAYOUT") return "Payout";
  if (sourceType === "ORDER_PAY") return "Order Pay";
  return sourceType || "—";
}

function extractTotalCount(res, rows) {
  const body = res?.data;
  const candidates = [
    body?.totalCount,
    body?.count,
    body?.total,
    body?.data?.totalCount,
    body?.meta?.totalCount,
    body?.pagination?.totalCount,
  ];
  for (const c of candidates) {
    const n = Number(c);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return rows.length;
}

function SummaryCards({ loading, summary }) {
  const cards = [
    {
      label: "Total Volume",
      icon: TrendingUp,
      iconWrapClass: "bg-success bg-opacity-10 text-success",
      value: summary.totalVolume,
      hint: "Total settlement volume for selected range",
    },
    {
      label: "Active Payouts",
      icon: DollarSign,
      iconWrapClass: "bg-danger bg-opacity-10 text-danger",
      value: summary.activePayoutAmount,
      hint: "Rider payouts currently pending",
    },
    {
      label: "Payment Gateway",
      icon: CreditCard,
      iconWrapClass: "bg-info bg-opacity-10 text-info",
      value: summary.paymentGatewayVolume,
      hint: "Volume routed through gateway",
    },
  ];

  return (
    <div className="row g-4 mb-4">
      {cards.map((card) => (
        <div key={card.label} className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10 h-100">
            <div className="d-flex justify-content-between mb-2">
              <div className="d-flex align-items-center gap-2">
                <div className={`p-2 rounded-3 ${card.iconWrapClass}`}>
                  <card.icon size={20} />
                </div>
                <span className="small text-muted fw-bold">{card.label}</span>
              </div>
            </div>
            {loading ? (
              <>
                <div className="placeholder-glow mb-2">
                  <span className="placeholder col-6 rounded-2" />
                </div>
                <div className="placeholder-glow">
                  <span className="placeholder col-9 rounded-2" />
                </div>
              </>
            ) : (
              <>
                <h4 className="fw-bold mb-0">{formatCurrency(card.value)}</h4>
                <small className="text-muted" style={{ fontSize: "10px" }}>
                  {card.hint}
                </small>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionFilters({
  activeType,
  onTypeChange,
  search,
  onSearchChange,
  status,
  onStatusChange,
  statuses,
  from,
  to,
  onFromChange,
  onToChange,
}) {
  return (
    <div className="p-4 border-bottom d-flex flex-column gap-3">
      <div className="d-flex flex-wrap gap-2 overflow-auto custom-scrollbar">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTypeChange(tab.value)}
            className={`btn p-0 px-3 py-2 rounded-3 small fw-bold transition-all border ${
              activeType === tab.value ? "bg-primary-red text-white" : "bg-light text-muted"
            }`}
            style={{
              minWidth: "100px",
              backgroundColor: activeType === tab.value ? "#E51818" : "",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-5">
          <div className="search-container">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search by TXN ID, reference, or party..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2 small"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </div>

        <div className="col-12 col-md-4 col-xl-2">
          <select
            className="form-select bg-light border-0 py-2 small"
            value={status}
            onChange={(e) => onStatusChange(e.target.value)}
            style={{ borderRadius: "10px" }}
          >
            <option value="">All Statuses</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>

        <div className="col-12 col-md-4 col-xl-2">
          <div className="input-group">
            <span className="input-group-text bg-light border-0">
              <CalendarRange size={14} />
            </span>
            <input
              type="datetime-local"
              className="form-control bg-light border-0 py-2 small"
              value={from}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>
        </div>

        <div className="col-12 col-md-4 col-xl-2">
          <div className="input-group">
            <span className="input-group-text bg-light border-0">
              <CalendarRange size={14} />
            </span>
            <input
              type="datetime-local"
              className="form-control bg-light border-0 py-2 small"
              value={to}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <tbody>
      {Array.from({ length: 6 }).map((_, idx) => (
        <tr key={idx}>
          <td colSpan={7} className="px-4 py-3 border-0">
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded-2" style={{ height: "16px" }} />
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
}

function TransactionTable({ loading, error, rows, onRetry }) {
  if (loading) return <TableSkeleton />;

  if (error) {
    return (
      <tbody>
        <tr>
          <td colSpan={7} className="text-center py-5">
            <p className="text-muted small mb-2">{error}</p>
            <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
              Retry
            </button>
          </td>
        </tr>
      </tbody>
    );
  }

  if (rows.length === 0) {
    return (
      <tbody>
        <tr>
          <td colSpan={7} className="text-center py-5 text-muted small">
            No transactions found for current filters.
          </td>
        </tr>
      </tbody>
    );
  }

  return (
    <tbody>
      {rows.map((txn) => (
        <tr key={`${txn.txnId}-${txn.reference || ""}`} className="align-middle">
          <td className="px-4 py-3 border-0 small fw-bold">
            {txn.txnId || "—"}
            <small className="text-muted d-block" style={{ fontSize: "10px" }}>
              {formatDate(txn.createdAt)}
            </small>
          </td>
          <td className="px-3 py-3 border-0 small text-muted">
            {txn.partyName || "—"}
            <span className="p-1 px-2 bg-light border rounded-pill ms-2" style={{ fontSize: "8px" }}>
              {txn.partyType || "—"}
            </span>
            {txn.reference ? (
              <small className="d-block text-muted mt-1" style={{ fontSize: "10px" }}>
                Ref: {txn.reference}
              </small>
            ) : null}
          </td>
          <td className="px-3 py-3 border-0 small">
            <div
              className={`d-flex align-items-center gap-1 ${
                txn.sourceType === "PAYOUT" ? "text-danger" : "text-success"
              }`}
            >
              {txn.sourceType === "PAYOUT" ? (
                <ArrowDownRight size={14} />
              ) : (
                <ArrowUpRight size={14} />
              )}
              <span>{sourceTypeLabel(txn.sourceType)}</span>
            </div>
          </td>
          <td className="px-3 py-3 border-0 small text-muted">
            <div className="d-flex align-items-center gap-2">
              <Wallet size={12} /> {txn.method || "—"}
            </div>
          </td>
          <td className="px-3 py-3 border-0">
            <span
              className={`status-badge status-${statusBadgeClass(txn.status)} p-1 px-3`}
              style={{ fontSize: "11px" }}
            >
              {txn.status || "UNKNOWN"}
            </span>
          </td>
          <td className="px-3 py-3 border-0 text-end fw-bold small">{formatCurrency(txn.amount)}</td>
          <td className="px-4 py-3 border-0 text-end small text-muted">{txn.sourceId || "—"}</td>
        </tr>
      ))}
    </tbody>
  );
}

const Transactions = () => {
  const [activeType, setActiveType] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromInput, setFromInput] = useState("");
  const [toInput, setToInput] = useState("");

  const [summary, setSummary] = useState({
    totalVolume: 0,
    activePayoutAmount: 0,
    paymentGatewayVolume: 0,
    totalTransactions: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [rows, setRows] = useState([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [tableError, setTableError] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fromIso = useMemo(() => toIsoInstant(fromInput), [fromInput]);
  const toIso = useMemo(() => toIsoInstant(toInput), [toInput]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await transactionAdminService.getSummary({
        ...(fromIso ? { from: fromIso } : {}),
        ...(toIso ? { to: toIso } : {}),
      });
      if (isApiFailureBody(res?.data)) {
        throw new Error(readApiMessage(res.data) || "Failed to load summary.");
      }
      const payload =
        res?.data && typeof res.data === "object" && "data" in res.data
          ? res.data.data
          : res?.data || {};
      setSummary({
        totalVolume: Number(payload?.totalVolume) || 0,
        activePayoutAmount: Number(payload?.activePayoutAmount) || 0,
        paymentGatewayVolume: Number(payload?.paymentGatewayVolume) || 0,
        totalTransactions: Number(payload?.totalTransactions) || 0,
      });
    } catch {
      setSummary({
        totalVolume: 0,
        activePayoutAmount: 0,
        paymentGatewayVolume: 0,
        totalTransactions: 0,
      });
    } finally {
      setSummaryLoading(false);
    }
  }, [fromIso, toIso]);

  const loadTable = useCallback(async () => {
    setTableLoading(true);
    setTableError("");
    try {
      const res = await transactionAdminService.list({
        type: activeType,
        ...(status ? { status } : {}),
        ...(debouncedSearch ? { q: debouncedSearch } : {}),
        ...(fromIso ? { from: fromIso } : {}),
        ...(toIso ? { to: toIso } : {}),
        page,
        size,
      });
      if (isApiFailureBody(res?.data)) {
        throw new Error(readApiMessage(res.data) || "Failed to load transactions.");
      }
      const list = unwrapList(res);
      setRows(list);
      setTotalCount(extractTotalCount(res, list));
    } catch (e) {
      setTableError(getAxiosErrorMessage(e, "Failed to load transactions."));
      setRows([]);
      setTotalCount(0);
    } finally {
      setTableLoading(false);
    }
  }, [activeType, status, debouncedSearch, fromIso, toIso, page, size]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadTable();
  }, [loadTable]);

  useEffect(() => {
    setPage(0);
  }, [activeType, status, debouncedSearch, fromIso, toIso]);

  const statuses = useMemo(() => {
    const set = new Set();
    rows.forEach((r) => {
      const s = String(r?.status || "").trim();
      if (s) set.add(s);
    });
    return Array.from(set).sort();
  }, [rows]);

  const totalPages = Math.max(1, Math.ceil(totalCount / size));
  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Financial Transactions</h2>
          <p className="text-muted small mb-0">
            Live record of order payments and rider payouts.
          </p>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 small"
            style={{ borderRadius: "10px" }}
            disabled
            title="Export API not available yet"
          >
            <ArrowDownToLine size={18} /> <span>Download Report</span>
          </button>
          <button
            className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
            style={{ backgroundColor: "#E51818", color: "white", borderRadius: "10px" }}
            disabled
            title="Create payout API not available on this screen"
          >
            <Briefcase size={18} /> <span>Create Payout</span>
          </button>
        </div>
      </div>

      <SummaryCards loading={summaryLoading} summary={summary} />

      <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white">
        <TransactionFilters
          activeType={activeType}
          onTypeChange={setActiveType}
          search={searchInput}
          onSearchChange={setSearchInput}
          status={status}
          onStatusChange={setStatus}
          statuses={statuses}
          from={fromInput}
          to={toInput}
          onFromChange={setFromInput}
          onToChange={setToInput}
        />

        <div className="table-responsive">
          <table className="table mb-0 table-hover">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 text-muted small border-0">TRANSACTION</th>
                <th className="px-3 py-3 text-muted small border-0">PARTY</th>
                <th className="px-3 py-3 text-muted small border-0">TYPE</th>
                <th className="px-3 py-3 text-muted small border-0">METHOD</th>
                <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                <th className="px-3 py-3 text-muted small border-0 text-end">AMOUNT</th>
                <th className="px-4 py-3 text-muted small border-0 text-end">SOURCE</th>
              </tr>
            </thead>
            <TransactionTable loading={tableLoading} error={tableError} rows={rows} onRetry={loadTable} />
          </table>
        </div>

        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 p-3 border-top">
          <div className="small text-muted">
            {tableLoading ? "Loading..." : `${totalCount} total transactions`}
          </div>
          <div className="d-flex align-items-center gap-2">
            <select
              className="form-select form-select-sm"
              style={{ width: 90 }}
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value) || 50);
                setPage(0);
              }}
            >
              {[25, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-sm btn-light"
              disabled={!canPrev || tableLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Prev
            </button>
            <span className="small text-muted">
              Page {Math.min(page + 1, totalPages)} / {totalPages}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-light"
              disabled={!canNext || tableLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
            <button
              type="button"
              className="btn btn-sm btn-light d-flex align-items-center gap-1"
              onClick={() => {
                loadSummary();
                loadTable();
              }}
              disabled={tableLoading}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transactions;

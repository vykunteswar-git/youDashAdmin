import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from "lucide-react";
import {
  walletAdminService,
  readApiMessage,
  isApiFailureBody,
  getAdminHttpErrorMessage,
} from "../services/apiService";

const STATUS_TABS = [
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "All", value: "" },
];

const APPROVE_CONFIRM =
  "Approve this withdrawal? The amount will leave the rider's wallet in the ledger. You must complete the bank transfer manually offline — this action only updates the system balance.";

const REJECT_CONFIRM =
  "Reject this withdrawal? The pending hold will be released and the rider's wallet balance will be restored.";

function maskAccountNumber(value) {
  const s = String(value ?? "").trim();
  if (!s) return "—";
  if (s.includes("*")) return s;
  const digits = s.replace(/\D/g, "");
  if (digits.length <= 4) return digits || "—";
  const last4 = digits.slice(-4);
  return `${"*".repeat(Math.max(0, digits.length - 4))}${last4}`;
}

function normalizeWithdrawal(row) {
  if (!row || typeof row !== "object") return null;
  const id = Number(row.id ?? row.withdrawalId);
  if (!Number.isFinite(id)) return null;
  return {
    id,
    riderId: row.riderId,
    amount: Number(row.amount) || 0,
    status: String(row.status || "PENDING").toUpperCase(),
    accountHolderName: row.accountHolderName ?? "",
    accountNumber: row.accountNumber ?? "",
    ifsc: row.ifsc ?? "",
    createdAt: row.createdAt ?? null,
  };
}

function parseWithdrawalsResponse(res, fallbackPage, fallbackSize) {
  const raw = res?.data;
  if (isApiFailureBody(raw)) {
    throw new Error(readApiMessage(raw) || "Failed to load withdrawal requests.");
  }
  const data = raw?.data ?? raw;
  let content = [];
  if (Array.isArray(data)) {
    content = data;
  } else if (Array.isArray(data?.content)) {
    content = data.content;
  } else if (Array.isArray(data?.items)) {
    content = data.items;
  }
  const items = content.map(normalizeWithdrawal).filter(Boolean);
  const totalCount = Number.isFinite(Number(raw?.totalCount))
    ? Number(raw.totalCount)
    : Number.isFinite(Number(data?.totalElements))
      ? Number(data.totalElements)
      : items.length;
  const totalPages = Number.isFinite(Number(data?.totalPages))
    ? Math.max(1, Number(data.totalPages))
    : Math.max(1, Math.ceil(totalCount / fallbackSize));
  const pageNumber = Number.isFinite(Number(data?.number))
    ? Number(data.number)
    : fallbackPage;
  return { items, totalCount, totalPages, pageNumber };
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "active";
  if (s === "pending") return "pending";
  if (s === "rejected") return "cancelled";
  return "info";
}

const WithdrawalRequests = () => {
  const [statusTab, setStatusTab] = useState("PENDING");
  const [page, setPage] = useState(0);
  const [size] = useState(50);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [toasts, setToasts] = useState([]);

  const pushToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const loadWithdrawals = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await walletAdminService.listWithdrawals(
        statusTab || undefined,
        page,
        size
      );
      const parsed = parseWithdrawalsResponse(res, page, size);
      setRows(parsed.items);
      setTotalCount(parsed.totalCount);
      setTotalPages(parsed.totalPages);
      if (parsed.pageNumber !== page) {
        setPage(parsed.pageNumber);
      }
    } catch (e) {
      setListError(
        getAdminHttpErrorMessage(e, "Failed to load withdrawal requests.")
      );
      setRows([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      setListLoading(false);
    }
  }, [page, size, statusTab]);

  useEffect(() => {
    loadWithdrawals();
  }, [loadWithdrawals]);

  const canPrev = page > 0;
  const canNext = page + 1 < totalPages;

  const pendingCountHint = useMemo(() => {
    if (statusTab !== "PENDING") return null;
    return totalCount;
  }, [statusTab, totalCount]);

  const runAction = async (row, action) => {
    const id = Number(row?.id);
    if (!Number.isInteger(id) || id <= 0) return;
    const approve = action === "approve";
    if (!window.confirm(approve ? APPROVE_CONFIRM : REJECT_CONFIRM)) return;

    setActionBusyId(id);
    try {
      const res = approve
        ? await walletAdminService.approveWithdrawal(id)
        : await walletAdminService.rejectWithdrawal(id);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        pushToast("danger", readApiMessage(raw) || "Withdrawal action failed.");
        return;
      }
      pushToast(
        "success",
        readApiMessage(raw) ||
          (approve ? "Withdrawal approved." : "Withdrawal rejected.")
      );
      await loadWithdrawals();
    } catch (e) {
      pushToast(
        "danger",
        getAdminHttpErrorMessage(e, "Withdrawal action failed.")
      );
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 1100 }}>
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">Withdrawal requests</h2>
          <p className="text-muted small mb-0">
            Review rider payout requests, approve ledger debits, or reject to
            release held balance.
            {pendingCountHint != null && statusTab === "PENDING" && !listLoading
              ? ` · ${pendingCountHint} pending`
              : null}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary rounded-3 d-flex align-items-center gap-2"
          disabled={listLoading}
          onClick={loadWithdrawals}
          title="Refresh list"
        >
          <RefreshCw size={16} className={listLoading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {toasts.length > 0 ? (
        <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} border-0 shadow-sm mb-2`}
              role="alert"
            >
              {toast.text}
            </div>
          ))}
        </div>
      ) : null}

      <ul className="nav nav-pills gap-2 mb-4 flex-wrap">
        {STATUS_TABS.map((tab) => (
          <li className="nav-item" key={tab.label}>
            <button
              type="button"
              className={`nav-link rounded-pill px-3 py-2 small fw-semibold ${
                statusTab === tab.value
                  ? "active text-white"
                  : "text-muted bg-light"
              }`}
              style={
                statusTab === tab.value
                  ? { backgroundColor: "#E51818", border: "none" }
                  : { border: "none" }
              }
              onClick={() => {
                setPage(0);
                setStatusTab(tab.value);
              }}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {listError ? (
        <div className="alert alert-danger rounded-4 border-0 mb-3">{listError}</div>
      ) : null}

      {listLoading ? (
        <div className="d-flex align-items-center justify-content-center py-5">
          <span className="spinner-border text-danger" role="status" />
        </div>
      ) : rows.length === 0 ? (
        <div className="dashboard-card border-0 shadow-sm text-center py-5 text-muted small">
          No withdrawal requests for this filter.
        </div>
      ) : (
        <div className="row g-3">
          {rows.map((row) => {
            const busy = actionBusyId === row.id;
            const isPending = row.status === "PENDING";
            return (
              <div className="col-12" key={row.id}>
                <div className="dashboard-card border-0 shadow-sm h-100">
                  <div className="d-flex flex-column flex-md-row justify-content-between gap-3">
                    <div className="flex-grow-1 min-w-0">
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                        <span className="fw-bold fs-5">
                          ₹{row.amount.toLocaleString("en-IN")}
                        </span>
                        <span
                          className={`status-badge status-${statusBadgeClass(row.status)} px-2 py-1`}
                        >
                          {row.status}
                        </span>
                        <span className="small text-muted">#{row.id}</span>
                      </div>
                      <div className="small mb-2">
                        <span className="text-muted">Rider </span>
                        {row.riderId != null ? (
                          <Link
                            to="/riders"
                            state={{ highlightRiderId: row.riderId }}
                            className="fw-semibold text-decoration-none d-inline-flex align-items-center gap-1"
                            style={{ color: "#E51818" }}
                          >
                            ID {row.riderId}
                            <ExternalLink size={12} />
                          </Link>
                        ) : (
                          "—"
                        )}
                      </div>
                      <div className="small text-muted">
                        <div className="fw-semibold text-dark">
                          {row.accountHolderName || "—"}
                        </div>
                        <div>
                          {maskAccountNumber(row.accountNumber)}
                          {row.ifsc ? ` · ${row.ifsc}` : ""}
                        </div>
                      </div>
                      <div className="small text-muted mt-2">
                        Requested{" "}
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString()
                          : "—"}
                      </div>
                    </div>
                    {isPending ? (
                      <div className="d-flex flex-shrink-0 align-items-start gap-2">
                        <button
                          type="button"
                          className="btn btn-success rounded-3 d-flex align-items-center gap-2"
                          disabled={busy}
                          onClick={() => runAction(row, "approve")}
                        >
                          <CheckCircle2 size={16} />
                          {busy ? "…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline-danger rounded-3 d-flex align-items-center gap-2"
                          disabled={busy}
                          onClick={() => runAction(row, "reject")}
                        >
                          <XCircle size={16} />
                          Reject
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!listLoading && rows.length > 0 ? (
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-4">
          <div className="small text-muted">
            Page {page + 1} of {Math.max(1, totalPages)} · {totalCount} total
          </div>
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-light btn-sm rounded-3"
              disabled={!canPrev || listLoading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="btn btn-light btn-sm rounded-3"
              disabled={!canNext || listLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : null}

      <div className="d-flex align-items-start gap-2 mt-4 small text-muted">
        <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
        <span>
          Approving only updates the wallet ledger. Rejecting releases the hold
          back to the rider. Bank payouts are done outside this app.
        </span>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
        .status-badge.active { background-color: #D1FAE5; color: #059669; }
        .status-badge.pending { background-color: #FEF3C7; color: #D97706; }
        .status-badge.cancelled { background-color: #FEE2E2; color: #DC2626; }
        .status-badge.info { background-color: #DBEAFE; color: #2563EB; }
      `}</style>
    </div>
  );
};

export default WithdrawalRequests;

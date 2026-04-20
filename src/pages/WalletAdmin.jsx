import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wallet,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  walletAdminService,
  readApiMessage,
  isApiFailureBody,
  getAxiosErrorMessage,
} from "../services/apiService";

const WalletAdmin = () => {
  const [codOrderId, setCodOrderId] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [codBusy, setCodBusy] = useState(false);
  const [codMsg, setCodMsg] = useState({ type: "", text: "" });

  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [rows, setRows] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [actionBusyId, setActionBusyId] = useState(null);
  const [wdMsg, setWdMsg] = useState({ type: "", text: "" });

  const clearCodMsg = () => setCodMsg({ type: "", text: "" });
  const clearWdMsg = () => setWdMsg({ type: "", text: "" });

  const maskAccountNumber = (value) => {
    const s = String(value ?? "").trim();
    if (!s) return "—";
    if (s.includes("*")) return s;
    const digits = s.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    const last4 = digits.slice(-4);
    return `${"*".repeat(Math.max(0, digits.length - 4))}${last4}`;
  };

  const parseWithdrawalPage = (res, fallbackPage, fallbackSize) => {
    const raw = res?.data;
    if (isApiFailureBody(raw)) {
      throw new Error(readApiMessage(raw) || "Failed to load withdrawal requests.");
    }
    const data = raw?.data ?? raw;
    if (Array.isArray(data)) {
      return {
        content: data,
        pageNumber: fallbackPage,
        pageSize: fallbackSize,
        totalElements: data.length,
        totalPages: 1,
      };
    }
    const content = Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data?.rows)
          ? data.rows
          : [];
    const pageNumber = Number.isFinite(Number(data?.number))
      ? Number(data.number)
      : fallbackPage;
    const pageSize = Number.isFinite(Number(data?.size))
      ? Number(data.size)
      : fallbackSize;
    const totalElements = Number.isFinite(Number(data?.totalElements))
      ? Number(data.totalElements)
      : content.length;
    const totalPages = Number.isFinite(Number(data?.totalPages))
      ? Number(data.totalPages)
      : 1;
    return { content, pageNumber, pageSize, totalElements, totalPages };
  };

  const loadWithdrawalRequests = useCallback(async () => {
    setListLoading(true);
    setListError("");
    try {
      const res = await walletAdminService.listWithdrawalRequests({
        status: statusFilter || undefined,
        page,
        size,
      });
      const parsed = parseWithdrawalPage(res, page, size);
      setRows(parsed.content);
      setTotalElements(parsed.totalElements);
      setTotalPages(Math.max(1, parsed.totalPages));
      if (parsed.pageNumber !== page) {
        setPage(parsed.pageNumber);
      }
      if (parsed.pageSize !== size && parsed.pageSize > 0) {
        setSize(parsed.pageSize);
      }
    } catch (e) {
      setListError(getAxiosErrorMessage(e, "Failed to load withdrawal requests."));
      setRows([]);
      setTotalElements(0);
      setTotalPages(1);
    } finally {
      setListLoading(false);
    }
  }, [page, size, statusFilter]);

  useEffect(() => {
    loadWithdrawalRequests();
  }, [loadWithdrawalRequests]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const fromMs = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toMs = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null;

    return rows.filter((r) => {
      const createdMs = r?.createdAt ? new Date(r.createdAt).getTime() : null;
      if (Number.isFinite(fromMs) && Number.isFinite(createdMs) && createdMs < fromMs)
        return false;
      if (Number.isFinite(toMs) && Number.isFinite(createdMs) && createdMs > toMs)
        return false;
      if (!q) return true;
      const byId = String(r?.withdrawalId ?? "").toLowerCase();
      const byRiderId = String(r?.riderId ?? "").toLowerCase();
      const byRiderName = String(r?.riderName ?? "").toLowerCase();
      return byId.includes(q) || byRiderId.includes(q) || byRiderName.includes(q);
    });
  }, [dateFrom, dateTo, rows, search]);

  const submitCodSettle = async () => {
    clearCodMsg();
    const orderId = codOrderId.trim();
    const amount = Number(String(codAmount).trim());
    if (!orderId) {
      setCodMsg({ type: "danger", text: "Order id is required." });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setCodMsg({ type: "danger", text: "Enter a valid settlement amount." });
      return;
    }
    if (
      !window.confirm(
        `Record COD settlement for order "${orderId}" amount ₹${amount}? Confirm only after verifying cash/QR reconciliation.`
      )
    ) {
      return;
    }
    setCodBusy(true);
    try {
      const res = await walletAdminService.codSettle({
        orderId,
        amount,
      });
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setCodMsg({
          type: "danger",
          text: readApiMessage(raw) || "Settlement failed.",
        });
        return;
      }
      setCodMsg({
        type: "success",
        text: readApiMessage(raw) || "COD settlement recorded.",
      });
      setCodOrderId("");
      setCodAmount("");
    } catch (e) {
      setCodMsg({
        type: "danger",
        text: getAxiosErrorMessage(e, "Settlement failed."),
      });
    } finally {
      setCodBusy(false);
    }
  };

  const submitWithdrawal = async (row, approve) => {
    clearWdMsg();
    const n = Number(row?.withdrawalId);
    if (!Number.isInteger(n) || n <= 0) return;
    if (
      !window.confirm(
        approve
          ? `Approve withdrawal #${n}? Funds will proceed per your payout rules.`
          : `Reject withdrawal #${n}? This may notify the rider.`
      )
    ) {
      return;
    }
    setActionBusyId(n);
    const prevRows = rows;
    setRows((curr) =>
      curr.map((r) =>
        Number(r.withdrawalId) === n
          ? { ...r, status: approve ? "APPROVED" : "REJECTED" }
          : r
      )
    );
    try {
      const res = await walletAdminService.approveWithdrawal({
        withdrawalId: n,
        approve,
      });
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setWdMsg({
          type: "danger",
          text: readApiMessage(raw) || "Withdrawal action failed.",
        });
        return;
      }
      setWdMsg({
        type: "success",
        text: readApiMessage(raw) || (approve ? "Withdrawal approved." : "Withdrawal rejected."),
      });
      loadWithdrawalRequests();
    } catch (e) {
      setRows(prevRows);
      setWdMsg({
        type: "danger",
        text: getAxiosErrorMessage(e, "Withdrawal action failed."),
      });
    } finally {
      setActionBusyId(null);
    }
  };

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Wallet & settlements</h2>
        <p className="text-muted small mb-0">
          Admin COD settlement and withdrawal request operations with list,
          filters, and approval actions.
        </p>
      </div>

      <div className="row g-3 g-md-4">
        <div className="col-12">
          <div className="dashboard-card border-0 shadow-sm">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div
                className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ background: "rgba(229, 24, 24, 0.08)" }}
              >
                <Banknote size={22} style={{ color: "#E51818" }} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h5 className="fw-bold mb-1">COD settlement</h5>
                <p className="text-muted small mb-0">
                  <code className="small">POST /admin/cod/settle</code> —{" "}
                  <code className="small">AdminCodSettleRequestDTO</code> (
                  <code className="small">orderId</code>,{" "}
                  <code className="small">amount</code>)
                </p>
              </div>
            </div>
            {codMsg.text ? (
              <div
                className={`alert ${codMsg.type === "success" ? "alert-success" : "alert-danger"} rounded-4 border-0 mb-3`}
              >
                {codMsg.text}
              </div>
            ) : null}
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small">Order id</label>
                <input
                  type="text"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  placeholder="e.g. ORD-… or UUID from ops"
                  value={codOrderId}
                  onChange={(e) => {
                    clearCodMsg();
                    setCodOrderId(e.target.value);
                  }}
                  disabled={codBusy}
                />
              </div>
              <div className="col-12 col-md-4">
                <label className="form-label fw-semibold small">Amount (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  placeholder="0.00"
                  value={codAmount}
                  onChange={(e) => {
                    clearCodMsg();
                    setCodAmount(e.target.value);
                  }}
                  disabled={codBusy}
                />
              </div>
              <div className="col-12 col-md-2">
                <button
                  type="button"
                  className="btn w-100 text-white border-0 rounded-3 shadow-sm"
                  style={{ backgroundColor: "#E51818" }}
                  disabled={codBusy}
                  onClick={submitCodSettle}
                >
                  {codBusy ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    "Settle"
                  )}
                </button>
              </div>
            </div>
            <div className="d-flex align-items-start gap-2 mt-3 small text-muted">
              <AlertTriangle size={16} className="flex-shrink-0 mt-1" />
              <span>
                Settlement is irreversible from this UI. Double-check order id
                and amount against rider cash collection before confirming.
              </span>
            </div>
          </div>
        </div>

        <div className="col-12">
          <div className="dashboard-card border-0 shadow-sm">
            <div className="d-flex align-items-start gap-3 mb-3">
              <div
                className="rounded-3 p-2 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ background: "rgba(229, 24, 24, 0.08)" }}
              >
                <Wallet size={22} style={{ color: "#E51818" }} />
              </div>
              <div className="flex-grow-1 min-w-0">
                <h5 className="fw-bold mb-1">Withdrawal requests</h5>
                <p className="text-muted small mb-0">
                  <code className="small">GET /admin/withdraw/requests</code> —{" "}
                  list and filter requests.
                </p>
                <p className="text-muted small mb-0">
                  <code className="small">POST /admin/withdraw/approve</code> —{" "}
                  action by id.
                </p>
              </div>
            </div>
            {wdMsg.text ? (
              <div
                className={`alert ${wdMsg.type === "success" ? "alert-success" : "alert-danger"} rounded-4 border-0 mb-3`}
              >
                {wdMsg.text}
              </div>
            ) : null}
            <div className="row g-3 align-items-end mb-3">
              <div className="col-12 col-md-3">
                <label className="form-label fw-semibold small">Status</label>
                <select
                  className="form-select border-0 bg-light rounded-3 py-2"
                  value={statusFilter}
                  onChange={(e) => {
                    setPage(0);
                    setStatusFilter(e.target.value);
                  }}
                  disabled={listLoading}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="">ALL</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-semibold small">Search</label>
                <div className="position-relative">
                  <Search
                    size={14}
                    className="position-absolute text-muted"
                    style={{ left: 10, top: "50%", transform: "translateY(-50%)" }}
                  />
                  <input
                    className="form-control border-0 bg-light rounded-3 py-2 ps-4"
                    placeholder="Withdrawal / Rider id"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold small">From</label>
                <input
                  type="date"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div className="col-6 col-md-2">
                <label className="form-label fw-semibold small">To</label>
                <input
                  type="date"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-2">
                <label className="form-label fw-semibold small"> </label>
                <button
                  type="button"
                  className="btn w-100 btn-outline-secondary rounded-3 d-flex align-items-center justify-content-center gap-2"
                  disabled={listLoading}
                  onClick={loadWithdrawalRequests}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
              </div>
            </div>

            {listError ? (
              <div className="alert alert-danger rounded-3 border-0 mb-3">{listError}</div>
            ) : null}

            {listLoading ? (
              <div className="d-flex align-items-center justify-content-center py-5">
                <span className="spinner-border text-danger" role="status" />
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="text-center py-5 text-muted small">
                No withdrawal requests found for current filters.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="small text-muted border-0">Withdrawal</th>
                      <th className="small text-muted border-0">Rider</th>
                      <th className="small text-muted border-0">Amount</th>
                      <th className="small text-muted border-0">Bank details</th>
                      <th className="small text-muted border-0">Status</th>
                      <th className="small text-muted border-0">Created</th>
                      <th className="small text-muted border-0 text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRows.map((row) => {
                      const id = Number(row?.withdrawalId);
                      const busy = actionBusyId === id;
                      const status = String(row?.status || "").toUpperCase() || "PENDING";
                      return (
                        <tr key={id || `${row?.riderId}-${row?.createdAt}`}>
                          <td className="small fw-semibold">#{row?.withdrawalId ?? "—"}</td>
                          <td className="small">
                            <div className="fw-semibold">{row?.riderName || "Rider"}</div>
                            <div className="text-muted">
                              ID: {row?.riderId ?? "—"} · {row?.phone || row?.riderPhone || "—"}
                            </div>
                          </td>
                          <td className="small fw-semibold">
                            ₹{Number(row?.amount || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="small">
                            <div>{row?.accountHolderName || "—"}</div>
                            <div className="text-muted">
                              {maskAccountNumber(row?.accountNumber)} · {row?.ifsc || "—"}
                            </div>
                          </td>
                          <td className="small">
                            <span className={`status-badge status-${status.toLowerCase()} px-2 py-1`}>
                              {status}
                            </span>
                          </td>
                          <td className="small text-muted">
                            {row?.createdAt
                              ? new Date(row.createdAt).toLocaleString()
                              : "—"}
                          </td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <button
                                type="button"
                                className="btn btn-success btn-sm rounded-3"
                                disabled={busy || status !== "PENDING"}
                                onClick={() => submitWithdrawal(row, true)}
                              >
                                {busy ? "..." : "Approve"}
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm rounded-3"
                                disabled={busy || status !== "PENDING"}
                                onClick={() => submitWithdrawal(row, false)}
                              >
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 mt-3">
              <div className="small text-muted">
                Showing page {page + 1} of {Math.max(1, totalPages)} · Total {totalElements}
              </div>
              <div className="d-flex align-items-center gap-2">
                <select
                  className="form-select form-select-sm"
                  value={size}
                  onChange={(e) => {
                    setPage(0);
                    setSize(Number(e.target.value));
                  }}
                  style={{ width: 90 }}
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}/page
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  disabled={page <= 0 || listLoading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  type="button"
                  className="btn btn-light btn-sm"
                  disabled={page + 1 >= totalPages || listLoading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletAdmin;

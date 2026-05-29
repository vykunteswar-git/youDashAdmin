import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  codHandoverService,
  hubService,
  readApiMessage,
  isApiFailureBody,
  getAxiosErrorMessage,
  unwrapEntity,
} from "../services/apiService";

const LIMIT_PRESETS = [500, 1000, 1200, 1500, 2000];

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(n) || 0);

function statusMeta(status) {
  const s = String(status || "OK").toUpperCase();
  if (s === "BLOCKED") {
    return {
      label: "Blocked",
      className: "bg-danger-subtle text-danger border-danger-subtle",
      Icon: ShieldAlert,
    };
  }
  if (s === "WARNING") {
    return {
      label: "Warning",
      className: "bg-warning-subtle text-warning border-warning-subtle",
      Icon: AlertTriangle,
    };
  }
  return {
    label: "OK",
    className: "bg-success-subtle text-success border-success-subtle",
    Icon: CheckCircle2,
  };
}

function limitPercent(owed, limit) {
  const l = Number(limit) || 1;
  const o = Number(owed) || 0;
  return Math.min(100, Math.round((o / l) * 100));
}

const CodHandover = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [depositAmount, setDepositAmount] = useState("");
  const [depositHubId, setDepositHubId] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMsg, setDepositMsg] = useState({ type: "", text: "" });
  const [limitEdit, setLimitEdit] = useState("");
  const [limitBusy, setLimitBusy] = useState(false);
  const [hubs, setHubs] = useState([]);

  useEffect(() => {
    const t = window.setTimeout(() => setSearchQuery(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await codHandoverService.listRiders({
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        throw new Error(readApiMessage(raw) || "Failed to load riders.");
      }
      const data = unwrapEntity(res);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load COD handover list."));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    hubService
      .list?.()
      .then((res) => {
        const raw = res?.data;
        const data = raw?.data ?? raw;
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.content)
            ? data.content
            : [];
        setHubs(list);
      })
      .catch(() => setHubs([]));
  }, []);

  const summary = useMemo(() => {
    const totalOwed = rows.reduce((s, r) => s + (Number(r.commissionPending) || 0), 0);
    const blocked = rows.filter((r) => r.handoverStatus === "BLOCKED").length;
    const warning = rows.filter((r) => r.handoverStatus === "WARNING").length;
    return { count: rows.length, totalOwed, blocked, warning };
  }, [rows]);

  const closeDialog = () => {
    if (depositBusy || limitBusy) return;
    setDialogOpen(false);
    setSelected(null);
    setDetail(null);
    setDepositMsg({ type: "", text: "" });
  };

  const openRiderDialog = async (row) => {
    setSelected(row);
    setDialogOpen(true);
    setDetail(null);
    setDepositMsg({ type: "", text: "" });
    setDepositAmount(String(row.commissionPending ?? ""));
    setLimitEdit(String(row.handoverLimit ?? 1000));
    setDepositHubId("");
    setDepositNote("");
    setDetailLoading(true);
    try {
      const res = await codHandoverService.getRiderDetail(row.riderId);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        throw new Error(readApiMessage(raw));
      }
      const d = unwrapEntity(res);
      setDetail(d);
      if (d?.summary) {
        setSelected(d.summary);
        setDepositAmount(String(d.summary.commissionPending ?? ""));
        setLimitEdit(String(d.summary.handoverLimit ?? 1000));
      }
    } catch (e) {
      setDepositMsg({ type: "danger", text: getAxiosErrorMessage(e) });
    } finally {
      setDetailLoading(false);
    }
  };

  const submitDeposit = async () => {
    if (!selected) return;
    const amount = Number(String(depositAmount).trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setDepositMsg({ type: "danger", text: "Enter a valid deposit amount." });
      return;
    }
    const pending = Number(selected.commissionPending) || 0;
    if (amount - pending > 0.01) {
      setDepositMsg({
        type: "danger",
        text: `Amount cannot exceed pending commission (${fmt(pending)}).`,
      });
      return;
    }
    if (
      !window.confirm(
        `Record commission deposit of ${fmt(amount)} from ${selected.riderName || `rider #${selected.riderId}`}?`
      )
    ) {
      return;
    }
    setDepositBusy(true);
    setDepositMsg({ type: "", text: "" });
    try {
      const res = await codHandoverService.confirmDeposit({
        riderId: selected.riderId,
        amount,
        hubId: depositHubId ? Number(depositHubId) : null,
        note: depositNote.trim() || undefined,
      });
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setDepositMsg({ type: "danger", text: readApiMessage(raw) });
        return;
      }
      setDepositMsg({ type: "success", text: readApiMessage(raw) || "Deposit recorded." });
      await loadList();
      const remaining = Math.max(0, pending - amount);
      if (remaining <= 0.01) {
        closeDialog();
        return;
      }
      const updatedRow = { ...selected, commissionPending: remaining };
      await openRiderDialog(updatedRow);
    } catch (e) {
      setDepositMsg({ type: "danger", text: getAxiosErrorMessage(e) });
    } finally {
      setDepositBusy(false);
    }
  };

  const saveLimit = async () => {
    if (!selected) return;
    const limit = Number(String(limitEdit).trim());
    if (!Number.isFinite(limit) || limit <= 0) {
      setDepositMsg({ type: "danger", text: "Invalid handover limit." });
      return;
    }
    setLimitBusy(true);
    setDepositMsg({ type: "", text: "" });
    try {
      const res = await codHandoverService.updateHandoverLimit(selected.riderId, limit);
      if (isApiFailureBody(res?.data)) {
        setDepositMsg({ type: "danger", text: readApiMessage(res.data) });
        return;
      }
      setDepositMsg({ type: "success", text: "Handover limit updated." });
      await loadList();
      await openRiderDialog({ ...selected, handoverLimit: limit });
    } catch (e) {
      setDepositMsg({ type: "danger", text: getAxiosErrorMessage(e) });
    } finally {
      setLimitBusy(false);
    }
  };

  const dialogSummary = detail?.summary ?? selected;
  const pct = dialogSummary
    ? limitPercent(dialogSummary.commissionPending, dialogSummary.handoverLimit)
    : 0;

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1 d-flex align-items-center gap-2">
            <Banknote size={26} style={{ color: "#E51818" }} />
            COD handover
          </h2>
          <p className="text-muted small mb-0">
            Riders with cash COD commission pending. Click a row to record hub deposit or update limit.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary rounded-3 d-inline-flex align-items-center gap-2"
          onClick={loadList}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "cod-handover-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="dashboard-card border-0 shadow-sm p-3 h-100">
            <div className="text-muted small">Riders pending</div>
            <div className="fs-4 fw-bold">{summary.count}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="dashboard-card border-0 shadow-sm p-3 h-100">
            <div className="text-muted small">Total owed</div>
            <div className="fs-4 fw-bold">{fmt(summary.totalOwed)}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="dashboard-card border-0 shadow-sm p-3 h-100">
            <div className="text-muted small">Warning</div>
            <div className="fs-4 fw-bold text-warning">{summary.warning}</div>
          </div>
        </div>
        <div className="col-6 col-md-3">
          <div className="dashboard-card border-0 shadow-sm p-3 h-100">
            <div className="text-muted small">Blocked</div>
            <div className="fs-4 fw-bold text-danger">{summary.blocked}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-card border-0 shadow-sm p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-5">
            <label className="form-label small fw-semibold mb-1">Search rider</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-0">
                <Search size={16} className="text-muted" />
              </span>
              <input
                type="search"
                className="form-control border-0 bg-light"
                placeholder="Name, phone, or rider ID"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold mb-1">Status</label>
            <select
              className="form-select border-0 bg-light"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All pending</option>
              <option value="OK">OK</option>
              <option value="WARNING">Warning</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {error ? (
        <div className="alert alert-danger rounded-4 border-0">{error}</div>
      ) : null}

      <div className="dashboard-card border-0 shadow-sm overflow-hidden">
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 cod-handover-table">
            <thead>
              <tr className="bg-light">
                <th className="ps-4">Name</th>
                <th className="text-end">Owed</th>
                <th className="text-end">Limit</th>
                <th>Status</th>
                <th className="pe-4 text-end" style={{ width: 48 }} aria-hidden />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    <RefreshCw size={20} className="cod-handover-spin me-2" />
                    Loading riders…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-5 text-muted">
                    No riders with commission pending.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const meta = statusMeta(r.handoverStatus);
                  const StatusIcon = meta.Icon;
                  return (
                    <tr
                      key={r.riderId}
                      role="button"
                      tabIndex={0}
                      className="cod-handover-row"
                      onClick={() => openRiderDialog(r)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRiderDialog(r);
                        }
                      }}
                    >
                      <td className="ps-4">
                        <div className="fw-semibold text-dark">
                          {r.riderName || "Unnamed rider"}
                        </div>
                        <div className="small text-muted">
                          {r.riderPhone || "—"}
                          {r.riderPublicId ? ` · ${r.riderPublicId}` : ""}
                        </div>
                      </td>
                      <td className="text-end fw-bold">{fmt(r.commissionPending)}</td>
                      <td className="text-end text-muted">{fmt(r.handoverLimit)}</td>
                      <td>
                        <span
                          className={`badge rounded-pill border d-inline-flex align-items-center gap-1 ${meta.className}`}
                        >
                          <StatusIcon size={12} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="pe-4 text-end text-muted">
                        <ChevronRight size={18} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {dialogOpen && selected ? (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.55)", zIndex: 1200 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cod-handover-dialog-title"
          onClick={closeDialog}
        >
          <div
            className="bg-white rounded-4 shadow-lg w-100 d-flex flex-column"
            style={{ maxWidth: 560, maxHeight: "min(90vh, 720px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-start justify-content-between gap-3 p-4 border-bottom">
              <div className="min-w-0">
                <h5 id="cod-handover-dialog-title" className="fw-bold mb-1 text-truncate">
                  {dialogSummary?.riderName || selected.riderName || "Rider"}
                </h5>
                <p className="text-muted small mb-0">
                  ID #{selected.riderId}
                  {selected.riderPhone ? ` · ${selected.riderPhone}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-light btn-sm rounded-circle flex-shrink-0"
                style={{ width: 36, height: 36 }}
                onClick={closeDialog}
                disabled={depositBusy || limitBusy}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-auto flex-grow-1 p-4">
              {dialogSummary?.dispatchBlocked ? (
                <div className="alert alert-danger border-0 rounded-3 py-2 small d-flex gap-2 align-items-start mb-3">
                  <ShieldAlert size={18} className="flex-shrink-0 mt-1" />
                  <span>
                    Orders paused (COD and online) until commission is deposited at hub.
                  </span>
                </div>
              ) : dialogSummary?.handoverStatus === "WARNING" ? (
                <div className="alert alert-warning border-0 rounded-3 py-2 small d-flex gap-2 align-items-start mb-3">
                  <AlertTriangle size={18} className="flex-shrink-0 mt-1" />
                  <span>Approaching handover limit — plan a deposit soon.</span>
                </div>
              ) : null}

              {depositMsg.text ? (
                <div
                  className={`alert ${depositMsg.type === "success" ? "alert-success" : "alert-danger"} border-0 rounded-3 small`}
                >
                  {depositMsg.text}
                </div>
              ) : null}

              <div className="rounded-3 bg-light p-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-muted">Commission owed</span>
                  <span className="fw-bold fs-5">{fmt(dialogSummary?.commissionPending)}</span>
                </div>
                <div className="d-flex justify-content-between small text-muted mb-2">
                  <span>Handover limit</span>
                  <span>{fmt(dialogSummary?.handoverLimit)}</span>
                </div>
                <div className="progress rounded-pill" style={{ height: 8 }}>
                  <div
                    className={`progress-bar ${pct >= 100 ? "bg-danger" : pct >= 80 ? "bg-warning" : "bg-success"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="small text-muted mt-1">{pct}% of limit used</div>
              </div>

              <h6 className="fw-bold small text-uppercase text-muted mb-3">Record deposit</h6>
              <div className="row g-2 mb-2">
                <div className="col-12">
                  <label className="form-label small">Cash received (₹)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-control"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={depositBusy}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Hub (optional)</label>
                  <select
                    className="form-select"
                    value={depositHubId}
                    onChange={(e) => setDepositHubId(e.target.value)}
                    disabled={depositBusy}
                  >
                    <option value="">— Select —</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name || h.hubName || `Hub ${h.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-6">
                  <label className="form-label small">Note</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Receipt / reference"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    disabled={depositBusy}
                  />
                </div>
              </div>
              <button
                type="button"
                className="btn w-100 text-white border-0 rounded-3 mb-4"
                style={{ backgroundColor: "#E51818" }}
                disabled={depositBusy || detailLoading}
                onClick={submitDeposit}
              >
                {depositBusy ? "Saving…" : (
                  <>
                    <CheckCircle2 size={16} className="me-1" />
                    Confirm deposit
                  </>
                )}
              </button>

              <h6 className="fw-bold small text-uppercase text-muted mb-2">Handover limit</h6>
              <div className="d-flex flex-wrap gap-1 mb-2">
                {LIMIT_PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`btn btn-sm rounded-pill ${Number(limitEdit) === p ? "btn-dark" : "btn-outline-secondary"}`}
                    onClick={() => setLimitEdit(String(p))}
                    disabled={limitBusy}
                  >
                    ₹{p.toLocaleString("en-IN")}
                  </button>
                ))}
              </div>
              <div className="input-group mb-4">
                <input
                  type="number"
                  className="form-control"
                  value={limitEdit}
                  onChange={(e) => setLimitEdit(e.target.value)}
                  disabled={limitBusy}
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={saveLimit}
                  disabled={limitBusy}
                >
                  {limitBusy ? "…" : "Save limit"}
                </button>
              </div>

              {detailLoading ? (
                <p className="small text-muted mb-0">Loading order lines…</p>
              ) : (
                <>
                  {detail?.openLines?.length > 0 ? (
                    <div className="mb-3">
                      <h6 className="fw-bold small text-uppercase text-muted mb-2">
                        Open orders ({detail.openLines.length})
                      </h6>
                      <div
                        className="border rounded-3 overflow-hidden"
                        style={{ maxHeight: 140, overflowY: "auto" }}
                      >
                        <table className="table table-sm mb-0">
                          <thead className="bg-light sticky-top">
                            <tr>
                              <th className="small">Order</th>
                              <th className="small text-end">Commission</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detail.openLines.map((l) => (
                              <tr key={l.orderId}>
                                <td className="small">
                                  {l.displayOrderId || `#${l.orderId}`}
                                </td>
                                <td className="small text-end fw-semibold">
                                  {fmt(l.commissionAmount)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : null}

                  {detail?.recentDeposits?.length > 0 ? (
                    <div>
                      <h6 className="fw-bold small text-uppercase text-muted mb-2">
                        Recent deposits
                      </h6>
                      <ul className="list-group list-group-flush border rounded-3">
                        {detail.recentDeposits.map((d) => (
                          <li
                            key={d.depositId}
                            className="list-group-item d-flex justify-content-between small py-2"
                          >
                            <span>{fmt(d.amount)}</span>
                            <span className="text-muted">
                              {d.createdAt
                                ? new Date(d.createdAt).toLocaleString("en-IN")
                                : "—"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .cod-handover-row { cursor: pointer; }
        .cod-handover-row:hover { background-color: rgba(229, 24, 24, 0.04); }
        .cod-handover-table thead th {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #64748b;
          font-weight: 600;
          border-bottom-width: 1px;
        }
        @keyframes cod-handover-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .cod-handover-spin {
          animation: cod-handover-spin 0.8s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CodHandover;

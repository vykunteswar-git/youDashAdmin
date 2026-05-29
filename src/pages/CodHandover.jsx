import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  RefreshCw,
  Search,
  ShieldAlert,
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
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(
    Number(n) || 0
  );

const statusBadge = (status) => {
  const s = String(status || "OK").toUpperCase();
  if (s === "BLOCKED") return "bg-danger-subtle text-danger";
  if (s === "WARNING") return "bg-warning-subtle text-warning";
  return "bg-success-subtle text-success";
};

const CodHandover = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositHubId, setDepositHubId] = useState("");
  const [depositNote, setDepositNote] = useState("");
  const [depositBusy, setDepositBusy] = useState(false);
  const [depositMsg, setDepositMsg] = useState({ type: "", text: "" });
  const [limitEdit, setLimitEdit] = useState("");
  const [hubs, setHubs] = useState([]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await codHandoverService.listRiders({
        status: statusFilter || undefined,
        search: search.trim() || undefined,
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
  }, [statusFilter, search]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  useEffect(() => {
    hubService.list?.().then((res) => {
      const raw = res?.data;
      const data = raw?.data ?? raw;
      const list = Array.isArray(data) ? data : Array.isArray(data?.content) ? data.content : [];
      setHubs(list);
    }).catch(() => setHubs([]));
  }, []);

  const summary = useMemo(() => {
    const totalOwed = rows.reduce((s, r) => s + (Number(r.commissionPending) || 0), 0);
    const blocked = rows.filter((r) => r.handoverStatus === "BLOCKED").length;
    return { count: rows.length, totalOwed, blocked };
  }, [rows]);

  const openRider = async (row) => {
    setSelected(row);
    setDetail(null);
    setDepositMsg({ type: "", text: "" });
    setDepositAmount(String(row.commissionPending ?? ""));
    setLimitEdit(String(row.handoverLimit ?? 1000));
    setDetailLoading(true);
    try {
      const res = await codHandoverService.getRiderDetail(row.riderId);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        throw new Error(readApiMessage(raw));
      }
      setDetail(unwrapEntity(res));
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
    if (
      !window.confirm(
        `Record commission deposit of ${fmt(amount)} from ${selected.riderName || selected.riderId}?`
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
      await openRider({ ...selected, commissionPending: Math.max(0, (selected.commissionPending || 0) - amount) });
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
    try {
      const res = await codHandoverService.updateHandoverLimit(selected.riderId, limit);
      if (isApiFailureBody(res?.data)) {
        setDepositMsg({ type: "danger", text: readApiMessage(res.data) });
        return;
      }
      setDepositMsg({ type: "success", text: "Handover limit updated." });
      loadList();
    } catch (e) {
      setDepositMsg({ type: "danger", text: getAxiosErrorMessage(e) });
    }
  };

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 1200 }}>
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-start gap-3 mb-4">
        <div>
          <h2 className="fw-bold mb-1">COD handover</h2>
          <p className="text-muted small mb-0">
            Riders owe platform commission (cash COD) at hub. Blocked riders cannot receive COD or online orders until deposit.
          </p>
        </div>
        <button type="button" className="btn btn-outline-secondary rounded-3" onClick={loadList} disabled={loading}>
          <RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh
        </button>
      </div>

      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="dashboard-card border-0 shadow-sm p-3">
            <div className="text-muted small">Riders with pending</div>
            <div className="fs-4 fw-bold">{summary.count}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="dashboard-card border-0 shadow-sm p-3">
            <div className="text-muted small">Total commission owed</div>
            <div className="fs-4 fw-bold">{fmt(summary.totalOwed)}</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="dashboard-card border-0 shadow-sm p-3">
            <div className="text-muted small">Blocked (no orders)</div>
            <div className="fs-4 fw-bold text-danger">{summary.blocked}</div>
          </div>
        </div>
      </div>

      <div className="dashboard-card border-0 shadow-sm p-3 mb-3">
        <div className="row g-2 align-items-end">
          <div className="col-md-4">
            <label className="form-label small fw-semibold">Search</label>
            <div className="input-group">
              <span className="input-group-text bg-light border-0">
                <Search size={16} />
              </span>
              <input
                className="form-control border-0 bg-light"
                placeholder="Name, phone, id"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="col-md-3">
            <label className="form-label small fw-semibold">Status</label>
            <select
              className="form-select border-0 bg-light"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All with pending</option>
              <option value="OK">OK</option>
              <option value="WARNING">Warning</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>
      </div>

      {error ? <div className="alert alert-danger rounded-4">{error}</div> : null}

      <div className="row g-3">
        <div className="col-lg-7">
          <div className="dashboard-card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="bg-light">
                  <tr>
                    <th>Rider</th>
                    <th>Owed</th>
                    <th>Limit</th>
                    <th>Status</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        Loading…
                      </td>
                    </tr>
                  ) : rows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-5 text-muted">
                        No riders with commission pending.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr
                        key={r.riderId}
                        className={selected?.riderId === r.riderId ? "table-active" : ""}
                        style={{ cursor: "pointer" }}
                        onClick={() => openRider(r)}
                      >
                        <td>
                          <div className="fw-semibold">{r.riderName || "—"}</div>
                          <div className="small text-muted">
                            #{r.riderId} · {r.riderPhone || "—"}
                          </div>
                        </td>
                        <td className="fw-bold">{fmt(r.commissionPending)}</td>
                        <td>{fmt(r.handoverLimit)}</td>
                        <td>
                          <span className={`badge rounded-pill ${statusBadge(r.handoverStatus)}`}>
                            {r.handoverStatus}
                          </span>
                        </td>
                        <td className="text-end">
                          <Banknote size={18} className="text-muted" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="col-lg-5">
          <div className="dashboard-card border-0 shadow-sm p-4 sticky-top" style={{ top: 88 }}>
            {!selected ? (
              <p className="text-muted mb-0">Select a rider to record hub deposit or edit limit.</p>
            ) : (
              <>
                <h5 className="fw-bold mb-1">{selected.riderName}</h5>
                <p className="text-muted small">
                  #{selected.riderId} · {selected.riderPublicId || ""}
                </p>
                {selected.dispatchBlocked ? (
                  <div className="alert alert-danger border-0 rounded-3 py-2 small d-flex gap-2 align-items-center">
                    <ShieldAlert size={18} />
                    All orders paused until commission deposited.
                  </div>
                ) : selected.handoverStatus === "WARNING" ? (
                  <div className="alert alert-warning border-0 rounded-3 py-2 small d-flex gap-2 align-items-center">
                    <AlertTriangle size={18} />
                    Near handover limit.
                  </div>
                ) : null}

                {depositMsg.text ? (
                  <div
                    className={`alert ${depositMsg.type === "success" ? "alert-success" : "alert-danger"} border-0 rounded-3`}
                  >
                    {depositMsg.text}
                  </div>
                ) : null}

                <div className="mb-3">
                  <div className="d-flex justify-content-between small text-muted mb-1">
                    <span>Commission owed</span>
                    <span className="fw-bold text-dark">{fmt(selected.commissionPending)}</span>
                  </div>
                  <div className="progress rounded-pill" style={{ height: 8 }}>
                    <div
                      className={`progress-bar ${selected.handoverStatus === "BLOCKED" ? "bg-danger" : "bg-warning"}`}
                      style={{
                        width: `${Math.min(100, ((selected.commissionPending || 0) / (selected.handoverLimit || 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <h6 className="fw-bold mt-3">Record deposit</h6>
                <div className="mb-2">
                  <label className="form-label small">Cash received (₹)</label>
                  <input
                    type="number"
                    className="form-control bg-light border-0"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                  />
                </div>
                <div className="mb-2">
                  <label className="form-label small">Hub</label>
                  <select
                    className="form-select bg-light border-0"
                    value={depositHubId}
                    onChange={(e) => setDepositHubId(e.target.value)}
                  >
                    <option value="">— Optional —</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name || h.hubName || `Hub ${h.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small">Note</label>
                  <input
                    className="form-control bg-light border-0"
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn w-100 text-white border-0 rounded-3 mb-4"
                  style={{ backgroundColor: "#E51818" }}
                  disabled={depositBusy}
                  onClick={submitDeposit}
                >
                  {depositBusy ? "Saving…" : (
                    <>
                      <CheckCircle2 size={16} className="me-1" /> Confirm deposit
                    </>
                  )}
                </button>

                <h6 className="fw-bold">Handover limit</h6>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {LIMIT_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className="btn btn-sm btn-outline-secondary rounded-pill"
                      onClick={() => setLimitEdit(String(p))}
                    >
                      ₹{p}
                    </button>
                  ))}
                </div>
                <div className="input-group mb-2">
                  <input
                    type="number"
                    className="form-control bg-light border-0"
                    value={limitEdit}
                    onChange={(e) => setLimitEdit(e.target.value)}
                  />
                  <button type="button" className="btn btn-outline-secondary" onClick={saveLimit}>
                    Save
                  </button>
                </div>

                {detailLoading ? (
                  <p className="small text-muted">Loading open lines…</p>
                ) : detail?.openLines?.length ? (
                  <>
                    <h6 className="fw-bold mt-3 small text-muted">Open orders ({detail.openLines.length})</h6>
                    <div className="small" style={{ maxHeight: 160, overflow: "auto" }}>
                      {detail.openLines.map((l) => (
                        <div key={l.orderId} className="d-flex justify-content-between border-bottom py-1">
                          <span>#{l.displayOrderId || l.orderId}</span>
                          <span>{fmt(l.commissionAmount)}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CodHandover;

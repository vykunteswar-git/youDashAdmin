import { useState } from "react";
import {
  Banknote,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Wallet,
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

  const [withdrawalId, setWithdrawalId] = useState("");
  const [wdBusy, setWdBusy] = useState(false);
  const [wdMsg, setWdMsg] = useState({ type: "", text: "" });

  const clearCodMsg = () => setCodMsg({ type: "", text: "" });
  const clearWdMsg = () => setWdMsg({ type: "", text: "" });

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

  const submitWithdrawal = async (approve) => {
    clearWdMsg();
    const id = String(withdrawalId).trim();
    const n = Number(id);
    if (!id || !Number.isInteger(n) || n <= 0) {
      setWdMsg({
        type: "danger",
        text: "Enter a valid numeric withdrawal id.",
      });
      return;
    }
    if (
      !window.confirm(
        approve
          ? `Approve withdrawal #${n}? Funds will proceed per your payout rules.`
          : `Reject withdrawal #${n}? This may notify the rider.`
      )
    ) {
      return;
    }
    setWdBusy(true);
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
      setWithdrawalId("");
    } catch (e) {
      setWdMsg({
        type: "danger",
        text: getAxiosErrorMessage(e, "Withdrawal action failed."),
      });
    } finally {
      setWdBusy(false);
    }
  };

  return (
    <div className="container-fluid fade-in" style={{ maxWidth: 960 }}>
      <div className="mb-4">
        <h2 className="fw-bold mb-1">Wallet & settlements</h2>
        <p className="text-muted small mb-0">
          Admin COD settlement and rider withdrawal decisions. Pending
          withdrawals are not listed here; use the rider wallet / ops tools to
          obtain a withdrawal id, then approve or reject below.
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
                <h5 className="fw-bold mb-1">Withdrawal approval</h5>
                <p className="text-muted small mb-0">
                  <code className="small">POST /admin/withdraw/approve</code> —{" "}
                  <code className="small">AdminWithdrawalApproveDTO</code> (
                  <code className="small">withdrawalId</code>,{" "}
                  <code className="small">approve</code>)
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
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-6">
                <label className="form-label fw-semibold small">
                  Withdrawal id
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  className="form-control border-0 bg-light rounded-3 py-2"
                  placeholder="Numeric id from wallet / DB"
                  value={withdrawalId}
                  onChange={(e) => {
                    clearWdMsg();
                    setWithdrawalId(e.target.value);
                  }}
                  disabled={wdBusy}
                />
              </div>
              <div className="col-6 col-md-3">
                <button
                  type="button"
                  className="btn w-100 btn-success rounded-3 d-flex align-items-center justify-content-center gap-2"
                  disabled={wdBusy}
                  onClick={() => submitWithdrawal(true)}
                >
                  <CheckCircle2 size={18} />
                  Approve
                </button>
              </div>
              <div className="col-6 col-md-3">
                <button
                  type="button"
                  className="btn w-100 btn-outline-danger rounded-3 d-flex align-items-center justify-content-center gap-2"
                  disabled={wdBusy}
                  onClick={() => submitWithdrawal(false)}
                >
                  <XCircle size={18} />
                  Reject
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

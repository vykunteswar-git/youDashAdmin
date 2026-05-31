import { User } from "lucide-react";
import { formatStatusLabel, outstationStatusRequiresOtp } from "../../utils/orderStatusUtils";
import {
  canConfirmHubDrop,
  canConfirmHubCollect,
  canRecordPickupCod,
  getOutstationNextAdminAction,
  needsDeliveryRiderAssign,
  needsPickupRiderAssign,
} from "./outstationOrderHelpers";

export default function OutstationActionPanel({
  detail,
  selectedId,
  actionBusy,
  availableRiders,
  assignRolePick,
  onAssignRoleChange,
  riderPick,
  onRiderPickChange,
  onAssignRider,
  onReloadRiders,
  statusPick,
  onStatusPickChange,
  nextStatuses,
  primaryNextStatus,
  statusOtp,
  onStatusOtpChange,
  statusAdminOverride,
  onStatusAdminOverrideChange,
  pickupCodMode,
  onPickupCodModeChange,
  onUpdateStatus,
  hubHandoverOtp,
  onHubHandoverOtpChange,
  hubHandoverCodMode,
  onHubHandoverCodModeChange,
  hubHandoverOverride,
  onHubHandoverOverrideChange,
  onVerifyHubHandover,
}) {
  if (!detail || selectedId == null) {
    return (
      <div className="text-center text-muted small py-4">
        Select an order to take action
      </div>
    );
  }

  const nextAction = getOutstationNextAdminAction(detail);

  return (
    <>
      {nextAction ? (
        <div className="os-recommended-box">
          <div className="os-recommended-label">Recommended Next Step</div>
          <div className="small">{nextAction}</div>
          {String(detail?.paymentType || "").toUpperCase() === "COD" ? (
            <span
              className={`badge rounded-pill fw-semibold mt-2 ${
                detail?.codAlreadyCollected
                  ? "bg-success-subtle text-success"
                  : "bg-warning-subtle text-warning"
              }`}
              style={{ fontSize: 10 }}
            >
              COD {detail?.codAlreadyCollected ? "collected" : "pending"}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="os-action-card">
        <h6 className="d-flex align-items-center gap-2">
          <User size={16} /> Assign Rider
        </h6>
        {needsDeliveryRiderAssign(detail) ? (
          <div className="alert alert-info py-2 px-2 mb-2 small">
            Assign a <strong>delivery rider</strong> — status becomes Out for Delivery.
          </div>
        ) : null}
        {needsPickupRiderAssign(detail) ? (
          <div className="alert alert-info py-2 px-2 mb-2 small">
            Assign a <strong>pickup rider</strong> at origin.
          </div>
        ) : null}
        <div className="d-flex flex-column gap-2">
          <select
            className="form-select form-select-sm"
            value={assignRolePick}
            onChange={(e) => onAssignRoleChange(e.target.value)}
            disabled={actionBusy}
          >
            <option value="PICKUP">Pickup</option>
            <option value="DELIVERY">Delivery</option>
            <option value="BOTH">Both</option>
          </select>
          <select
            className="form-select form-select-sm"
            value={riderPick}
            onChange={(e) => onRiderPickChange(e.target.value)}
            disabled={actionBusy || availableRiders.length === 0}
          >
            <option value="">Select rider…</option>
            {availableRiders.map((r) => (
              <option key={r.id} value={String(r.id)}>
                #{r.id} — {r.name ?? "Rider"}
              </option>
            ))}
          </select>
          {availableRiders.length === 0 ? (
            <button
              type="button"
              className="btn btn-sm btn-link p-0"
              onClick={onReloadRiders}
              disabled={actionBusy}
            >
              Retry loading riders
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-sm fw-semibold text-white border-0"
            style={{ backgroundColor: "#1d4ed8", borderRadius: 6 }}
            disabled={
              actionBusy ||
              availableRiders.length === 0 ||
              riderPick === "" ||
              Number.isNaN(parseInt(riderPick, 10))
            }
            onClick={onAssignRider}
          >
            Assign Rider
          </button>
        </div>
      </div>

      {(canConfirmHubDrop(detail) || canConfirmHubCollect(detail)) && (
        <div className="os-action-card">
          <h6>
            {canConfirmHubDrop(detail) ? "Confirm hub drop-off" : "Confirm hub collection"}
          </h6>
          <div className="d-flex flex-column gap-2">
            <input
              aria-label="Hub handover OTP"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="form-control form-control-sm"
              placeholder="6-digit OTP"
              value={hubHandoverOtp}
              onChange={(e) =>
                onHubHandoverOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={actionBusy || hubHandoverOverride}
            />
            {canConfirmHubDrop(detail) &&
            String(detail?.paymentType || "").toUpperCase() === "COD" &&
            !(detail?.codAlreadyCollected === true) ? (
              <select
                className="form-select form-select-sm"
                value={hubHandoverCodMode}
                onChange={(e) => onHubHandoverCodModeChange(e.target.value)}
                disabled={actionBusy || hubHandoverOverride}
              >
                <option value="CASH">COD — Cash</option>
                <option value="QR">COD — UPI QR</option>
              </select>
            ) : null}
            <label className="form-check small text-muted mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                checked={hubHandoverOverride}
                onChange={(e) => onHubHandoverOverrideChange(e.target.checked)}
                disabled={actionBusy}
              />
              Emergency override
            </label>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              disabled={actionBusy}
              onClick={onVerifyHubHandover}
            >
              {canConfirmHubDrop(detail) ? "Confirm drop at hub" : "Confirm collection"}
            </button>
          </div>
        </div>
      )}

      <div className="os-action-card">
        <h6>Update Status</h6>
        <div className="d-flex flex-column gap-2">
          <select
            aria-label="Next status"
            className="form-select form-select-sm"
            value={statusPick}
            onChange={(e) => onStatusPickChange(e.target.value)}
            disabled={actionBusy || nextStatuses.length === 0}
          >
            {nextStatuses.map((s) => (
              <option key={s} value={s}>
                {formatStatusLabel(s)}
                {s === primaryNextStatus ? " (recommended)" : ""}
              </option>
            ))}
          </select>
          <textarea
            className="form-control form-control-sm"
            rows={2}
            placeholder="Add note (optional)"
            disabled={actionBusy}
          />
          {outstationStatusRequiresOtp(statusPick) ? (
            <>
              <input
                aria-label="OTP from customer"
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="form-control form-control-sm"
                placeholder="6-digit OTP"
                value={statusOtp}
                onChange={(e) =>
                  onStatusOtpChange(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={actionBusy || statusAdminOverride}
              />
              <label className="form-check small text-muted mb-0">
                <input
                  type="checkbox"
                  className="form-check-input"
                  checked={statusAdminOverride}
                  onChange={(e) => onStatusAdminOverrideChange(e.target.checked)}
                  disabled={actionBusy}
                />
                Emergency override
              </label>
            </>
          ) : null}
          {canRecordPickupCod(detail, statusPick) && !statusAdminOverride ? (
            <select
              className="form-select form-select-sm"
              value={pickupCodMode}
              onChange={(e) => onPickupCodModeChange(e.target.value)}
              disabled={actionBusy}
            >
              <option value="CASH">COD — Cash</option>
              <option value="QR">COD — UPI QR</option>
            </select>
          ) : null}
          <button
            aria-label="Update status"
            type="button"
            className="btn btn-sm fw-semibold text-white border-0"
            style={{ backgroundColor: "#1d4ed8", borderRadius: 6 }}
            disabled={actionBusy || nextStatuses.length === 0 || !statusPick}
            onClick={onUpdateStatus}
          >
            {nextStatuses.length === 0 ? "No valid next status" : "Update Status"}
          </button>
        </div>
      </div>

      {actionBusy ? (
        <p className="small text-muted d-flex align-items-center gap-2 mb-0">
          <span className="spinner-border spinner-border-sm" />
          Working…
        </p>
      ) : null}
    </>
  );
}

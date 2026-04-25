import { createPortal } from "react-dom";
import { DAY_OPTIONS } from "./incentiveUtils";

function DaySelector({ selectedDays, onToggleDay }) {
  return (
    <div className="d-flex flex-wrap gap-2">
      {DAY_OPTIONS.map((day) => {
        const active = selectedDays.includes(day);
        return (
          <button
            key={day}
            type="button"
            className={`btn btn-sm rounded-pill ${
              active ? "text-white border-0" : "btn-light text-muted"
            }`}
            style={{ backgroundColor: active ? "#E51818" : undefined }}
            onClick={() => onToggleDay(day)}
          >
            {day.slice(0, 3)}
          </button>
        );
      })}
    </div>
  );
}

export default function IncentiveCampaignFormModal({
  open,
  isEdit,
  form,
  formError,
  submitting,
  onFormChange,
  onToggleDay,
  onAddSlab,
  onRemoveSlab,
  onSlabChange,
  onClose,
  onSubmit,
}) {
  if (!open) return null;

  return createPortal(
    <div
      className="yd-admin-modal-layer position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center p-3"
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.55)",
        backdropFilter: "blur(6px)",
        zIndex: 1200,
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="yd-incentive-modal-title"
    >
      <div
        className="bg-white rounded-4 p-4 shadow-lg fade-in w-100 border-0"
        style={{ maxWidth: 680, maxHeight: "92vh", overflowY: "auto" }}
      >
        <h4 id="yd-incentive-modal-title" className="fw-bold mb-3">
          {isEdit ? "Edit Campaign" : "Create Campaign"}
        </h4>

        {formError ? <div className="alert alert-danger small py-2 mb-3">{formError}</div> : null}

        <div className="row g-3">
          <div className="col-12 col-md-6">
            <label className="form-label small text-muted fw-bold">Incentive Type *</label>
            <select
              className="form-select bg-light border-0 py-2"
              value={form.incentiveType}
              onChange={(e) => onFormChange("incentiveType", e.target.value)}
              style={{ borderRadius: "10px" }}
            >
              <option value="DAILY_DELIVERIES_SLOT">Daily Delivery Slot</option>
              <option value="ONLINE_HOURS_DAILY">Online Hours Daily</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small text-muted fw-bold">Name (optional)</label>
            <input
              type="text"
              className="form-control bg-light border-0 py-2"
              value={form.name}
              onChange={(e) => onFormChange("name", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>
          <div className="col-12 col-md-6">
            <label className="form-label small text-muted fw-bold">Service Mode</label>
            <select
              className="form-select bg-light border-0 py-2"
              value={form.serviceMode}
              onChange={(e) => onFormChange("serviceMode", e.target.value)}
              style={{ borderRadius: "10px" }}
            >
              <option value="">All</option>
              <option value="INCITY">INCITY</option>
              <option value="OUTSTATION">OUTSTATION</option>
            </select>
          </div>

          <div className="col-12 col-md-6">
            <label className="form-label small text-muted fw-bold">Incentive Date *</label>
            <input
              type="date"
              className="form-control bg-light border-0 py-2"
              value={form.incentiveDate}
              onChange={(e) => onFormChange("incentiveDate", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="col-12">
            <label className="form-label small text-muted fw-bold">Description</label>
            <textarea
              className="form-control bg-light border-0 small"
              rows={2}
              value={form.description}
              onChange={(e) => onFormChange("description", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>

          {form.incentiveType === "ONLINE_HOURS_DAILY" ? (
            <>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">Target Online Minutes *</label>
                <input
                  type="number"
                  min="1"
                  className="form-control bg-light border-0 py-2"
                  value={form.targetOnlineMinutes}
                  onChange={(e) => onFormChange("targetOnlineMinutes", e.target.value)}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">Bonus Amount *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-control bg-light border-0 py-2"
                  value={form.bonusAmount}
                  onChange={(e) => onFormChange("bonusAmount", e.target.value)}
                  style={{ borderRadius: "10px" }}
                />
              </div>
            </>
          ) : (
            <>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">Start Time (HH:mm) *</label>
                <input
                  type="time"
                  className="form-control bg-light border-0 py-2"
                  value={form.startTimeHhmm}
                  onChange={(e) => onFormChange("startTimeHhmm", e.target.value)}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12 col-md-6">
                <label className="form-label small text-muted fw-bold">End Time (HH:mm) *</label>
                <input
                  type="time"
                  className="form-control bg-light border-0 py-2"
                  value={form.endTimeHhmm}
                  onChange={(e) => onFormChange("endTimeHhmm", e.target.value)}
                  style={{ borderRadius: "10px" }}
                />
              </div>
              <div className="col-12">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <label className="form-label small text-muted fw-bold mb-0">Delivery Slabs *</label>
                  <button type="button" className="btn btn-sm btn-light" onClick={onAddSlab}>
                    + Add slab
                  </button>
                </div>
                <div className="d-flex flex-column gap-2">
                  {(form.slabs || []).map((slab, index) => (
                    <div key={index} className="row g-2 align-items-center">
                      <div className="col-5">
                        <input
                          type="number"
                          min="1"
                          className="form-control bg-light border-0 py-2"
                          placeholder="Deliveries"
                          value={slab.requiredDeliveries}
                          onChange={(e) => onSlabChange(index, "requiredDeliveries", e.target.value)}
                          style={{ borderRadius: "10px" }}
                        />
                      </div>
                      <div className="col-5">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-control bg-light border-0 py-2"
                          placeholder="Bonus amount"
                          value={slab.bonusAmount}
                          onChange={(e) => onSlabChange(index, "bonusAmount", e.target.value)}
                          style={{ borderRadius: "10px" }}
                        />
                      </div>
                      <div className="col-2 text-end">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => onRemoveSlab(index)}
                          title="Delete slab"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <div className="col-12 col-md-6 d-none">
            <label className="form-label small text-muted fw-bold">Valid From *</label>
            <input
              type="datetime-local"
              className="form-control bg-light border-0 py-2"
              value={form.validFrom}
              onChange={(e) => onFormChange("validFrom", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>
          <div className="col-12 col-md-6 d-none">
            <label className="form-label small text-muted fw-bold">Valid To *</label>
            <input
              type="datetime-local"
              className="form-control bg-light border-0 py-2"
              value={form.validTo}
              onChange={(e) => onFormChange("validTo", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="col-12 col-md-6 d-none">
            <label className="form-label small text-muted fw-bold">Start Time (HH:mm) *</label>
            <input
              type="time"
              className="form-control bg-light border-0 py-2"
              value={form.startTimeHhmm}
              onChange={(e) => onFormChange("startTimeHhmm", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>
          <div className="col-12 col-md-6 d-none">
            <label className="form-label small text-muted fw-bold">End Time (HH:mm) *</label>
            <input
              type="time"
              className="form-control bg-light border-0 py-2"
              value={form.endTimeHhmm}
              onChange={(e) => onFormChange("endTimeHhmm", e.target.value)}
              style={{ borderRadius: "10px" }}
            />
          </div>

          <div className="col-12">
            <label className="form-label small text-muted fw-bold">Days Of Week (optional)</label>
            <DaySelector selectedDays={form.daysOfWeek} onToggleDay={onToggleDay} />
            <div className="small text-muted mt-2">
              Leave empty to apply this campaign on all days.
            </div>
          </div>

          <div className="col-12">
            <div className="form-check">
              <input
                id="campaign-active"
                type="checkbox"
                className="form-check-input"
                checked={form.isActive}
                onChange={(e) => onFormChange("isActive", e.target.checked)}
              />
              <label htmlFor="campaign-active" className="form-check-label small fw-bold">
                Active
              </label>
            </div>
          </div>
        </div>

        <div className="d-flex gap-3 mt-4 pt-3 border-top">
          <button
            type="button"
            className="btn btn-light flex-grow-1 py-2 fw-bold rounded-3"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary-red flex-grow-1 py-2 fw-bold text-white shadow-sm rounded-3"
            style={{ backgroundColor: "#E51818" }}
            onClick={onSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <span className="spinner-border spinner-border-sm" />
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Campaign"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

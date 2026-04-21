import { CheckCircle2, Pencil, XCircle } from "lucide-react";
import {
  formatBonus,
  formatCampaignWindow,
  formatTimeSlot,
  getCampaignStatus,
  serviceModeLabel,
} from "./incentiveUtils";

function CampaignRow({ campaign, onEdit, onToggleActive, togglingId }) {
  const status = getCampaignStatus(campaign);
  const isToggling = togglingId === campaign.id;
  return (
    <tr className="align-middle">
      <td className="px-4 py-3 border-0">
        <div className="fw-bold small">{campaign.name}</div>
        <div className="text-muted" style={{ fontSize: "10px" }}>
          {campaign.description || "No description"}
        </div>
      </td>
      <td className="px-3 py-3 border-0 small">{serviceModeLabel(campaign.serviceMode)}</td>
      <td className="px-3 py-3 border-0 small fw-bold">{formatBonus(campaign.bonusAmount)}</td>
      <td className="px-3 py-3 border-0 small">{campaign.minCompletedOrders}</td>
      <td className="px-3 py-3 border-0 small text-muted">{formatCampaignWindow(campaign)}</td>
      <td className="px-3 py-3 border-0 small text-muted">{formatTimeSlot(campaign)}</td>
      <td className="px-3 py-3 border-0">
        <span className={`status-badge status-${status.className} p-1 px-3`} style={{ fontSize: "10px" }}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 border-0 text-end">
        <button
          type="button"
          className="btn btn-light btn-sm me-2"
          onClick={() => onEdit(campaign)}
          title="Edit campaign"
        >
          <Pencil size={14} className="me-1" />
          Edit
        </button>
        <button
          type="button"
          className="btn btn-light btn-sm"
          onClick={() => onToggleActive(campaign)}
          disabled={isToggling}
          title={campaign.isActive ? "Deactivate campaign" : "Activate campaign"}
        >
          {isToggling ? (
            <span className="spinner-border spinner-border-sm" />
          ) : campaign.isActive ? (
            <>
              <XCircle size={14} className="me-1 text-warning" />
              Deactivate
            </>
          ) : (
            <>
              <CheckCircle2 size={14} className="me-1 text-success" />
              Activate
            </>
          )}
        </button>
      </td>
    </tr>
  );
}

export default function IncentiveCampaignTable({
  loading,
  error,
  campaigns,
  onRetry,
  onEdit,
  onToggleActive,
  togglingId,
  onCreate,
}) {
  return (
    <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white">
      <div className="table-responsive">
        <table className="table mb-0 table-hover">
          <thead className="bg-light">
            <tr>
              <th className="px-4 py-3 text-muted small border-0">NAME</th>
              <th className="px-3 py-3 text-muted small border-0">SERVICE MODE</th>
              <th className="px-3 py-3 text-muted small border-0">BONUS AMOUNT</th>
              <th className="px-3 py-3 text-muted small border-0">MIN ORDERS</th>
              <th className="px-3 py-3 text-muted small border-0">ACTIVE WINDOW</th>
              <th className="px-3 py-3 text-muted small border-0">TIME SLOT</th>
              <th className="px-3 py-3 text-muted small border-0">STATUS</th>
              <th className="px-4 py-3 text-muted small border-0 text-end">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan={8} className="px-4 py-3 border-0">
                    <div className="placeholder-glow">
                      <span className="placeholder col-12 rounded-2" style={{ height: "14px" }} />
                    </div>
                  </td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <p className="text-muted small mb-2">{error}</p>
                  <button type="button" className="btn btn-sm btn-outline-danger" onClick={onRetry}>
                    Retry
                  </button>
                </td>
              </tr>
            ) : campaigns.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-5">
                  <p className="text-muted small mb-3">No incentive campaigns found.</p>
                  <button type="button" className="btn btn-sm btn-danger" onClick={onCreate}>
                    Create Campaign
                  </button>
                </td>
              </tr>
            ) : (
              campaigns.map((campaign) => (
                <CampaignRow
                  key={campaign.id}
                  campaign={campaign}
                  onEdit={onEdit}
                  onToggleActive={onToggleActive}
                  togglingId={togglingId}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

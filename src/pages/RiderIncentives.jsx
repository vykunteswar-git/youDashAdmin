import { useCallback, useEffect, useMemo, useState } from "react";
import { Flame, Plus, RefreshCw, Search } from "lucide-react";
import {
  getAxiosErrorMessage,
  incentiveAdminService,
  isApiFailureBody,
  readApiMessage,
  unwrapList,
} from "../services/apiService";
import IncentiveCampaignTable from "../components/incentives/IncentiveCampaignTable";
import IncentiveCampaignFormModal from "../components/incentives/IncentiveCampaignFormModal";
import {
  buildCampaignPayload,
  buildCampaignPayloadFromCampaign,
  campaignToForm,
  emptyCampaignForm,
  normalizeCampaign,
  serviceModeLabel,
  validateCampaignForm,
} from "../components/incentives/incentiveUtils";

const RiderIncentives = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [serviceModeFilter, setServiceModeFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [toasts, setToasts] = useState([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaignId, setEditingCampaignId] = useState(null);
  const [form, setForm] = useState(emptyCampaignForm());
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  const pushToast = useCallback((type, text) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, text }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await incentiveAdminService.listPeakCampaigns();
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setError(readApiMessage(raw) || "Failed to load incentive campaigns.");
        setCampaigns([]);
        return;
      }
      setCampaigns(unwrapList(res).map(normalizeCampaign));
    } catch (e) {
      setError(getAxiosErrorMessage(e, "Failed to load incentive campaigns."));
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter((campaign) => {
      if (serviceModeFilter) {
        const mode = campaign.serviceMode || "";
        if (mode !== serviceModeFilter) return false;
      }
      if (activeFilter === "ACTIVE" && !campaign.isActive) return false;
      if (activeFilter === "INACTIVE" && campaign.isActive) return false;
      if (!q) return true;
      return String(campaign.name || "").toLowerCase().includes(q);
    });
  }, [campaigns, search, serviceModeFilter, activeFilter]);

  const resetFormState = () => {
    setEditingCampaignId(null);
    setForm(emptyCampaignForm());
    setFormError("");
    setModalOpen(false);
  };

  const handleCreateOpen = () => {
    setEditingCampaignId(null);
    setForm(emptyCampaignForm());
    setFormError("");
    setModalOpen(true);
  };

  const handleEditOpen = (campaign) => {
    setEditingCampaignId(campaign.id);
    setForm(campaignToForm(campaign));
    setFormError("");
    setModalOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormError("");
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggleDay = (day) => {
    setForm((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleAddSlab = () => {
    setForm((prev) => ({
      ...prev,
      slabs: [...(Array.isArray(prev.slabs) ? prev.slabs : []), { requiredDeliveries: "", bonusAmount: "" }],
    }));
  };

  const handleRemoveSlab = (index) => {
    setForm((prev) => {
      const slabs = Array.isArray(prev.slabs) ? prev.slabs : [];
      if (slabs.length <= 1) {
        return {
          ...prev,
          slabs: [{ requiredDeliveries: "", bonusAmount: "" }],
        };
      }
      return {
        ...prev,
        slabs: slabs.filter((_, i) => i !== index),
      };
    });
  };

  const handleSlabChange = (index, field, value) => {
    setForm((prev) => {
      const slabs = Array.isArray(prev.slabs) ? [...prev.slabs] : [];
      if (!slabs[index]) return prev;
      slabs[index] = { ...slabs[index], [field]: value };
      return { ...prev, slabs };
    });
  };

  const handleSave = async () => {
    const validationError = validateCampaignForm(form);
    if (validationError) {
      setFormError(validationError);
      return;
    }
    const payload = buildCampaignPayload(form);

    setSubmitting(true);
    try {
      const res = editingCampaignId
        ? await incentiveAdminService.updatePeakCampaign(editingCampaignId, payload)
        : await incentiveAdminService.createPeakCampaign(payload);
      const raw = res?.data;
      if (isApiFailureBody(raw)) {
        setFormError(readApiMessage(raw) || "Failed to save campaign.");
        return;
      }
      resetFormState();
      await loadCampaigns();
      pushToast("success", editingCampaignId ? "Campaign updated." : "Campaign created.");
    } catch (e) {
      setFormError(getAxiosErrorMessage(e, "Failed to save campaign."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (campaign) => {
    if (!campaign?.id) return;
    setTogglingId(campaign.id);
    try {
      await incentiveAdminService.updatePeakCampaign(
        campaign.id,
        buildCampaignPayloadFromCampaign(campaign, { isActive: !campaign.isActive })
      );
      await loadCampaigns();
      pushToast("success", !campaign.isActive ? "Campaign activated." : "Campaign deactivated.");
    } catch (e) {
      pushToast("danger", getAxiosErrorMessage(e, "Failed to update campaign status."));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteCampaign = async (campaign) => {
    if (!campaign?.id) return;
    const ok = window.confirm(`Delete incentive "${campaign.name || campaign.id}"?`);
    if (!ok) return;
    setTogglingId(campaign.id);
    try {
      await incentiveAdminService.deletePeakCampaign(campaign.id);
      await loadCampaigns();
      pushToast("success", "Campaign deleted.");
    } catch (e) {
      pushToast("danger", getAxiosErrorMessage(e, "Failed to delete campaign."));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="container-fluid fade-in position-relative">
      <div className="position-fixed top-0 end-0 p-3" style={{ zIndex: 1080 }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`alert ${toast.type === "success" ? "alert-success" : "alert-danger"} border-0 shadow-sm mb-2`}
          >
            {toast.text}
          </div>
        ))}
      </div>

      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Rider Incentives</h2>
          <p className="text-muted small mb-0">Manage peak-hour bonus campaigns</p>
        </div>
        <button
          type="button"
          className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
          style={{ backgroundColor: "#E51818", color: "white", borderRadius: "10px" }}
          onClick={handleCreateOpen}
        >
          <Plus size={18} />
          <span>Create Campaign</span>
        </button>
      </div>

      <div className="dashboard-card border-0 shadow-sm mb-4">
        <div className="row g-3">
          <div className="col-12 col-lg-5">
            <div className="search-container">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search campaign name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control bg-light border-0 ps-5 py-2 small"
                style={{ borderRadius: "10px" }}
              />
            </div>
          </div>
          <div className="col-12 col-md-6 col-lg-3">
            <select
              className="form-select bg-light border-0 py-2 small"
              style={{ borderRadius: "10px" }}
              value={serviceModeFilter}
              onChange={(e) => setServiceModeFilter(e.target.value)}
            >
              <option value="">All service modes</option>
              <option value="INCITY">{serviceModeLabel("INCITY")}</option>
              <option value="OUTSTATION">{serviceModeLabel("OUTSTATION")}</option>
            </select>
          </div>
          <div className="col-12 col-md-6 col-lg-2">
            <select
              className="form-select bg-light border-0 py-2 small"
              style={{ borderRadius: "10px" }}
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <div className="col-12 col-lg-2 d-flex">
            <button
              type="button"
              className="btn btn-light w-100 d-flex align-items-center justify-content-center gap-2"
              onClick={loadCampaigns}
              disabled={loading}
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {!loading && !error && campaigns.length === 0 ? (
        <div className="dashboard-card border-0 shadow-sm text-center py-5 mb-4">
          <Flame size={34} className="text-muted mb-2" />
          <h5 className="fw-bold mb-1">No campaigns yet</h5>
          <p className="small text-muted mb-3">
            Create your first peak-hour incentive campaign to start rewarding riders.
          </p>
          <button
            type="button"
            className="btn btn-primary-red px-4 text-white"
            style={{ backgroundColor: "#E51818" }}
            onClick={handleCreateOpen}
          >
            Create Campaign
          </button>
        </div>
      ) : (
        <IncentiveCampaignTable
          loading={loading}
          error={error}
          campaigns={filteredCampaigns}
          onRetry={loadCampaigns}
          onEdit={handleEditOpen}
          onToggleActive={handleToggleActive}
          onDelete={handleDeleteCampaign}
          togglingId={togglingId}
          onCreate={handleCreateOpen}
        />
      )}

      <IncentiveCampaignFormModal
        open={modalOpen}
        isEdit={Boolean(editingCampaignId)}
        form={form}
        formError={formError}
        submitting={submitting}
        onFormChange={handleFormChange}
        onToggleDay={handleToggleDay}
        onAddSlab={handleAddSlab}
        onRemoveSlab={handleRemoveSlab}
        onSlabChange={handleSlabChange}
        onClose={resetFormState}
        onSubmit={handleSave}
      />
    </div>
  );
};

export default RiderIncentives;

import { formatINR } from "../../utils/formatters";

export const DAY_OPTIONS = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export function toIsoInstant(value) {
  const s = String(value || "").trim();
  if (!s) return null;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function toDatetimeLocalValue(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function serviceModeLabel(mode) {
  if (mode === "INCITY") return "In-city";
  if (mode === "OUTSTATION") return "Outstation";
  return "All";
}

export function getCampaignStatus(campaign) {
  if (!campaign?.isActive) return { label: "Inactive", className: "cancelled" };
  const now = Date.now();
  const fromMs = new Date(campaign.validFrom).getTime();
  const toMs = new Date(campaign.validTo).getTime();
  if (Number.isFinite(toMs) && toMs < now) {
    return { label: "Expired", className: "cancelled" };
  }
  if (Number.isFinite(fromMs) && fromMs > now) {
    return { label: "Upcoming", className: "info" };
  }
  return { label: "Active", className: "active" };
}

export function normalizeCampaign(raw) {
  const slabs = Array.isArray(raw?.slabs)
    ? raw.slabs
        .map((s) => ({
          requiredDeliveries: Number(s?.requiredDeliveries) || 0,
          bonusAmount: Number(s?.bonusAmount) || 0,
        }))
        .filter((s) => s.requiredDeliveries > 0)
        .sort((a, b) => a.requiredDeliveries - b.requiredDeliveries)
    : [];

  return {
    id: raw?.id,
    incentiveType:
      raw?.incentiveType === "ONLINE_HOURS_DAILY" ? "ONLINE_HOURS_DAILY" : "DAILY_DELIVERIES_SLOT",
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    serviceMode:
      raw?.serviceMode === "INCITY" || raw?.serviceMode === "OUTSTATION"
        ? raw.serviceMode
        : null,
    incentiveDate: raw?.incentiveDate ?? "",
    targetOnlineMinutes: Number(raw?.targetOnlineMinutes) || 0,
    bonusAmount: Number(raw?.bonusAmount) || 0,
    minCompletedOrders: Number(raw?.minCompletedOrders) || 1,
    slabs,
    isActive: Boolean(raw?.isActive),
    validFrom: raw?.validFrom ?? "",
    validTo: raw?.validTo ?? "",
    daysOfWeek: Array.isArray(raw?.daysOfWeek)
      ? raw.daysOfWeek.filter((d) => DAY_OPTIONS.includes(String(d)))
      : [],
    startTimeHhmm: raw?.startTimeHhmm ?? "",
    endTimeHhmm: raw?.endTimeHhmm ?? "",
  };
}

export function campaignToForm(campaign) {
  const slabs = Array.isArray(campaign?.slabs) && campaign.slabs.length > 0
    ? campaign.slabs.map((s) => ({
        requiredDeliveries: String(s.requiredDeliveries ?? ""),
        bonusAmount: String(s.bonusAmount ?? ""),
      }))
    : [{ requiredDeliveries: "10", bonusAmount: "100" }];

  return {
    incentiveType: campaign?.incentiveType ?? "DAILY_DELIVERIES_SLOT",
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    serviceMode: campaign?.serviceMode ?? "",
    incentiveDate: campaign?.incentiveDate ?? "",
    targetOnlineMinutes:
      campaign?.targetOnlineMinutes != null ? String(campaign.targetOnlineMinutes) : "",
    bonusAmount: campaign?.bonusAmount != null ? String(campaign.bonusAmount) : "",
    minCompletedOrders:
      campaign?.minCompletedOrders != null ? String(campaign.minCompletedOrders) : "1",
    validFrom: toDatetimeLocalValue(campaign?.validFrom),
    validTo: toDatetimeLocalValue(campaign?.validTo),
    daysOfWeek: Array.isArray(campaign?.daysOfWeek) ? campaign.daysOfWeek : [],
    startTimeHhmm: campaign?.startTimeHhmm ?? "",
    endTimeHhmm: campaign?.endTimeHhmm ?? "",
    slabs,
    isActive: campaign?.isActive ?? true,
  };
}

export function emptyCampaignForm() {
  return campaignToForm(null);
}

export function validateCampaignForm(form) {
  if (!["ONLINE_HOURS_DAILY", "DAILY_DELIVERIES_SLOT"].includes(form.incentiveType)) {
    return "Select a valid incentive type.";
  }
  if (!String(form.incentiveDate || "").trim()) {
    return "Incentive date is required.";
  }
  if (form.incentiveType === "ONLINE_HOURS_DAILY") {
    const minutes = Number(form.targetOnlineMinutes);
    if (!Number.isInteger(minutes) || minutes < 1) {
      return "Target online minutes must be at least 1.";
    }
    const bonus = Number(form.bonusAmount);
    if (!Number.isFinite(bonus) || bonus < 0) {
      return "Bonus amount must be a non-negative number.";
    }
    return "";
  }

  const hhmmPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!hhmmPattern.test(String(form.startTimeHhmm).trim())) return "Start time must be HH:mm.";
  if (!hhmmPattern.test(String(form.endTimeHhmm).trim())) return "End time must be HH:mm.";
  if (!Array.isArray(form.slabs) || form.slabs.length === 0) return "Add at least one delivery slab.";
  for (const slab of form.slabs) {
    const req = Number(slab?.requiredDeliveries);
    const bonus = Number(slab?.bonusAmount);
    if (!Number.isInteger(req) || req < 1) return "Each slab deliveries value must be at least 1.";
    if (!Number.isFinite(bonus) || bonus < 0) return "Each slab bonus amount must be non-negative.";
  }
  const sortedReq = form.slabs.map((s) => Number(s.requiredDeliveries)).sort((a, b) => a - b);
  for (let i = 1; i < sortedReq.length; i += 1) {
    if (sortedReq[i] === sortedReq[i - 1]) return "Slab deliveries must be unique.";
  }
  return "";
}

export function buildCampaignPayload(form) {
  const slabs = Array.isArray(form.slabs)
    ? form.slabs
        .map((s) => ({
          requiredDeliveries: Number(s.requiredDeliveries),
          bonusAmount: Number(s.bonusAmount),
        }))
        .filter((s) => Number.isInteger(s.requiredDeliveries) && s.requiredDeliveries > 0)
        .sort((a, b) => a.requiredDeliveries - b.requiredDeliveries)
    : [];

  const topSlab = slabs[0] || null;
  const maxBonus = slabs.length > 0 ? Math.max(...slabs.map((s) => s.bonusAmount || 0)) : 0;

  return {
    incentiveType: form.incentiveType,
    name: String(form.name || "").trim() || null,
    description: form.description.trim(),
    serviceMode: form.serviceMode || null,
    incentiveDate: String(form.incentiveDate || "").trim(),
    targetOnlineMinutes:
      form.incentiveType === "ONLINE_HOURS_DAILY" ? Number(form.targetOnlineMinutes) : null,
    bonusAmount:
      form.incentiveType === "ONLINE_HOURS_DAILY" ? Number(form.bonusAmount) : Number(maxBonus || 0),
    minCompletedOrders:
      form.incentiveType === "ONLINE_HOURS_DAILY"
        ? 1
        : Number(topSlab?.requiredDeliveries || form.minCompletedOrders || 1),
    slabs: form.incentiveType === "DAILY_DELIVERIES_SLOT" ? slabs : [],
    isActive: Boolean(form.isActive),
    validFrom: toIsoInstant(form.validFrom) || new Date(`${form.incentiveDate}T00:00:00`).toISOString(),
    validTo: toIsoInstant(form.validTo) || new Date(`${form.incentiveDate}T23:59:59`).toISOString(),
    daysOfWeek: Array.isArray(form.daysOfWeek) ? form.daysOfWeek : [],
    startTimeHhmm:
      form.incentiveType === "DAILY_DELIVERIES_SLOT" ? String(form.startTimeHhmm || "").trim() : "00:00",
    endTimeHhmm:
      form.incentiveType === "DAILY_DELIVERIES_SLOT" ? String(form.endTimeHhmm || "").trim() : "23:59",
  };
}

export function buildCampaignPayloadFromCampaign(campaign, overrides = {}) {
  return {
    name: String(campaign?.name || "").trim(),
    description: String(campaign?.description || "").trim(),
    incentiveType:
      campaign?.incentiveType === "ONLINE_HOURS_DAILY" ? "ONLINE_HOURS_DAILY" : "DAILY_DELIVERIES_SLOT",
    serviceMode: campaign?.serviceMode || null,
    incentiveDate: campaign?.incentiveDate || null,
    targetOnlineMinutes: Number(campaign?.targetOnlineMinutes) || null,
    bonusAmount: Number(campaign?.bonusAmount) || 0,
    minCompletedOrders: Number(campaign?.minCompletedOrders) || 1,
    slabs: Array.isArray(campaign?.slabs) ? campaign.slabs : [],
    isActive: Boolean(campaign?.isActive),
    validFrom: campaign?.validFrom || null,
    validTo: campaign?.validTo || null,
    daysOfWeek: Array.isArray(campaign?.daysOfWeek) ? campaign.daysOfWeek : [],
    startTimeHhmm: String(campaign?.startTimeHhmm || "").trim(),
    endTimeHhmm: String(campaign?.endTimeHhmm || "").trim(),
    ...overrides,
  };
}

export function formatTimeSlot(campaign) {
  const days =
    Array.isArray(campaign?.daysOfWeek) && campaign.daysOfWeek.length > 0
      ? campaign.daysOfWeek.map((d) => d.slice(0, 3)).join(", ")
      : "All days";
  const start = campaign?.startTimeHhmm || "--:--";
  const end = campaign?.endTimeHhmm || "--:--";
  return `${days} • ${start} - ${end}`;
}

export function formatCampaignWindow(campaign) {
  return `${formatDateTime(campaign?.validFrom)} → ${formatDateTime(campaign?.validTo)}`;
}

export function formatBonus(value) {
  return formatINR(value);
}

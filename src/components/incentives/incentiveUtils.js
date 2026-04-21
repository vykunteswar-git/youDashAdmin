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
  return {
    id: raw?.id,
    name: raw?.name ?? "",
    description: raw?.description ?? "",
    serviceMode:
      raw?.serviceMode === "INCITY" || raw?.serviceMode === "OUTSTATION"
        ? raw.serviceMode
        : null,
    bonusAmount: Number(raw?.bonusAmount) || 0,
    minCompletedOrders: Number(raw?.minCompletedOrders) || 1,
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
  return {
    name: campaign?.name ?? "",
    description: campaign?.description ?? "",
    serviceMode: campaign?.serviceMode ?? "",
    bonusAmount: campaign?.bonusAmount != null ? String(campaign.bonusAmount) : "",
    minCompletedOrders:
      campaign?.minCompletedOrders != null ? String(campaign.minCompletedOrders) : "1",
    validFrom: toDatetimeLocalValue(campaign?.validFrom),
    validTo: toDatetimeLocalValue(campaign?.validTo),
    daysOfWeek: Array.isArray(campaign?.daysOfWeek) ? campaign.daysOfWeek : [],
    startTimeHhmm: campaign?.startTimeHhmm ?? "",
    endTimeHhmm: campaign?.endTimeHhmm ?? "",
    isActive: campaign?.isActive ?? true,
  };
}

export function emptyCampaignForm() {
  return campaignToForm(null);
}

export function validateCampaignForm(form) {
  if (!form.name.trim()) return "Name is required.";
  const bonusAmount = Number(form.bonusAmount);
  if (!Number.isFinite(bonusAmount) || bonusAmount < 0) {
    return "Bonus amount must be a non-negative number.";
  }
  const minCompletedOrders = Number(form.minCompletedOrders);
  if (!Number.isInteger(minCompletedOrders) || minCompletedOrders < 1) {
    return "Minimum completed orders must be at least 1.";
  }
  const validFrom = toIsoInstant(form.validFrom);
  const validTo = toIsoInstant(form.validTo);
  if (!validFrom || !validTo) return "Valid from and valid to are required.";
  if (new Date(validTo).getTime() <= new Date(validFrom).getTime()) {
    return "Valid to must be after valid from.";
  }

  const hhmmPattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!hhmmPattern.test(String(form.startTimeHhmm).trim())) {
    return "Start time must be in HH:mm format.";
  }
  if (!hhmmPattern.test(String(form.endTimeHhmm).trim())) {
    return "End time must be in HH:mm format.";
  }
  return "";
}

export function buildCampaignPayload(form) {
  return {
    name: form.name.trim(),
    description: form.description.trim(),
    serviceMode: form.serviceMode || null,
    bonusAmount: Number(form.bonusAmount),
    minCompletedOrders: Number(form.minCompletedOrders),
    isActive: Boolean(form.isActive),
    validFrom: toIsoInstant(form.validFrom),
    validTo: toIsoInstant(form.validTo),
    daysOfWeek: Array.isArray(form.daysOfWeek) ? form.daysOfWeek : [],
    startTimeHhmm: String(form.startTimeHhmm || "").trim(),
    endTimeHhmm: String(form.endTimeHhmm || "").trim(),
  };
}

export function buildCampaignPayloadFromCampaign(campaign, overrides = {}) {
  return {
    name: String(campaign?.name || "").trim(),
    description: String(campaign?.description || "").trim(),
    serviceMode: campaign?.serviceMode || null,
    bonusAmount: Number(campaign?.bonusAmount) || 0,
    minCompletedOrders: Number(campaign?.minCompletedOrders) || 1,
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

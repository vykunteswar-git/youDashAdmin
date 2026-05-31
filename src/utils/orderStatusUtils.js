/** Canonical order statuses (matches backend OrderStatus enum). */
export const CANONICAL_ORDER_STATUSES = [
  "BOOKED",
  "SEARCHING_RIDER",
  "RIDER_ACCEPTED",
  "PAYMENT_PENDING",
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "AT_ORIGIN_HUB",
  "IN_TRANSIT",
  "AT_DESTINATION_HUB",
  "OUT_FOR_DELIVERY",
  "AWAITING_HUB_COLLECTION",
  "DELIVERED",
  "COLLECTED",
  "FAILED_DELIVERY",
  "CANCELLED",
  "RETURN_INITIATED",
  "RETURNED_TO_SENDER",
  "RETURNED",
  "EXPIRED",
  "FAILED",
];

const LEGACY_STATUS_MAP = {
  CREATED: "BOOKED",
  ORDER_CREATED: "BOOKED",
  CONFIRMED: "RIDER_ASSIGNED",
  PICKUP_CONFIRMED: "RIDER_ASSIGNED",
  PARCEL_PICKED_UP: "PICKED_UP",
  ARRIVED_ORIGIN_HUB: "AT_ORIGIN_HUB",
  DISPATCHED_TO_DESTINATION: "IN_TRANSIT",
  DEPARTED_ORIGIN_HUB: "IN_TRANSIT",
  ARRIVED_DESTINATION_HUB: "AT_DESTINATION_HUB",
  SORTED_AT_DESTINATION: "AT_DESTINATION_HUB",
  DELIVERY_RIDER_ASSIGNED: "OUT_FOR_DELIVERY",
  READY_FOR_PICKUP: "AWAITING_HUB_COLLECTION",
  COLLECTED_BY_CUSTOMER: "COLLECTED",
  PENDING: "BOOKED",
  PENDING_ASSIGNMENT: "BOOKED",
  ASSIGNED: "RIDER_ASSIGNED",
  DELIVERY_FAILED: "FAILED_DELIVERY",
};

/** Admin bulk targets — hub milestones only (not Out for Delivery; use assign rider). */
export const OUTSTATION_BULK_STATUSES = [
  "RIDER_ASSIGNED",
  "PICKED_UP",
  "AT_ORIGIN_HUB",
  "IN_TRANSIT",
  "AT_DESTINATION_HUB",
  "AWAITING_HUB_COLLECTION",
  "COLLECTED",
  "DELIVERED",
  "FAILED_DELIVERY",
  "CANCELLED",
];

export const OUTSTATION_EXCEPTION_STATUSES = [
  "FAILED_DELIVERY",
  "RETURN_INITIATED",
  "RETURNED_TO_SENDER",
  "RETURNED",
  "CANCELLED",
  "EXPIRED",
  "FAILED",
];

const STATUS_LABEL_OVERRIDES = {
  BOOKED: "Booked",
  RIDER_ASSIGNED: "Rider Assigned",
  AT_ORIGIN_HUB: "At Origin Hub",
  AT_DESTINATION_HUB: "At Destination Hub",
  OUT_FOR_DELIVERY: "Out For Delivery",
  AWAITING_HUB_COLLECTION: "Awaiting Hub Collection",
  COLLECTED: "Collected At Hub",
  FAILED_DELIVERY: "Failed Delivery",
  RETURN_INITIATED: "Return Initiated",
  RETURNED_TO_SENDER: "Returned To Sender",
};

/** Happy-path next status per service (aligned with backend admin matrices). */
const OUTSTATION_PRIMARY_NEXT = {
  DOOR_TO_DOOR: {
    BOOKED: "RIDER_ASSIGNED",
    RIDER_ASSIGNED: "PICKED_UP",
    PICKED_UP: "AT_ORIGIN_HUB",
    AT_ORIGIN_HUB: "IN_TRANSIT",
    IN_TRANSIT: "AT_DESTINATION_HUB",
    OUT_FOR_DELIVERY: "DELIVERED",
  },
  DOOR_TO_HUB: {
    BOOKED: "RIDER_ASSIGNED",
    RIDER_ASSIGNED: "PICKED_UP",
    PICKED_UP: "AT_ORIGIN_HUB",
    AT_ORIGIN_HUB: "IN_TRANSIT",
    IN_TRANSIT: "AT_DESTINATION_HUB",
    AT_DESTINATION_HUB: "AWAITING_HUB_COLLECTION",
    AWAITING_HUB_COLLECTION: "COLLECTED",
  },
  HUB_TO_DOOR: {
    AT_ORIGIN_HUB: "IN_TRANSIT",
    IN_TRANSIT: "AT_DESTINATION_HUB",
    OUT_FOR_DELIVERY: "DELIVERED",
  },
};

const OUTSTATION_FLOW_STEPS = {
  DOOR_TO_DOOR: [
    "BOOKED",
    "RIDER_ASSIGNED",
    "PICKED_UP",
    "AT_ORIGIN_HUB",
    "IN_TRANSIT",
    "AT_DESTINATION_HUB",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ],
  DOOR_TO_HUB: [
    "BOOKED",
    "RIDER_ASSIGNED",
    "PICKED_UP",
    "AT_ORIGIN_HUB",
    "IN_TRANSIT",
    "AT_DESTINATION_HUB",
    "AWAITING_HUB_COLLECTION",
    "COLLECTED",
  ],
  HUB_TO_DOOR: [
    "BOOKED",
    "AT_ORIGIN_HUB",
    "IN_TRANSIT",
    "AT_DESTINATION_HUB",
    "OUT_FOR_DELIVERY",
    "DELIVERED",
  ],
};

const OUTSTATION_MILESTONE_LABELS = {
  DOOR_TO_DOOR: [
    "Booked",
    "Rider Assigned",
    "Picked Up",
    "At Origin Hub",
    "In Transit",
    "At Destination Hub",
    "Out For Delivery",
    "Delivered",
  ],
  DOOR_TO_HUB: [
    "Booked",
    "Rider Assigned",
    "Picked Up",
    "At Origin Hub",
    "In Transit",
    "At Destination Hub",
    "Awaiting Collection",
    "Collected At Hub",
  ],
  HUB_TO_DOOR: [
    "Booked",
    "At Origin Hub",
    "In Transit",
    "At Destination Hub",
    "Out For Delivery",
    "Delivered",
  ],
};

export function canonicalOrderStatus(status) {
  const s = String(status || "").toUpperCase().trim().replace(/-/g, "_");
  if (!s) return "";
  return LEGACY_STATUS_MAP[s] ?? s;
}

export function toApiOrderStatus(status) {
  return canonicalOrderStatus(status);
}

export function formatStatusLabel(status) {
  const normalized = canonicalOrderStatus(status);
  if (!normalized) return "—";
  if (STATUS_LABEL_OVERRIDES[normalized]) return STATUS_LABEL_OVERRIDES[normalized];
  return normalized
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");
}

export function isOutstationExceptionStatus(status) {
  return OUTSTATION_EXCEPTION_STATUSES.includes(canonicalOrderStatus(status));
}

export function outstationStatusRequiresOtp(status) {
  const s = canonicalOrderStatus(status);
  return s === "PICKED_UP" || s === "DELIVERED" || s === "COLLECTED";
}

function resolveDeliveryType(deliveryType) {
  const type = String(deliveryType || "DOOR_TO_DOOR").toUpperCase();
  if (type === "DOOR_TO_HUB" || type === "HUB_TO_DOOR") return type;
  return "DOOR_TO_DOOR";
}

export function getOutstationPrimaryNextStatus(order) {
  const cur = canonicalOrderStatus(order?.status);
  const type = resolveDeliveryType(order?.deliveryType);
  return OUTSTATION_PRIMARY_NEXT[type]?.[cur] ?? null;
}

export function getOutstationFlowSteps(deliveryType) {
  return OUTSTATION_FLOW_STEPS[resolveDeliveryType(deliveryType)] ?? OUTSTATION_FLOW_STEPS.DOOR_TO_DOOR;
}

export function getOutstationMilestoneLabels(deliveryType) {
  return (
    OUTSTATION_MILESTONE_LABELS[resolveDeliveryType(deliveryType)] ??
    OUTSTATION_MILESTONE_LABELS.DOOR_TO_DOOR
  );
}

export function getOutstationProgressIndex(status, deliveryType) {
  const normalized = canonicalOrderStatus(status);
  const flow = getOutstationFlowSteps(deliveryType);
  if (normalized === "DELIVERED" || normalized === "COLLECTED") return flow.length;
  const idx = flow.indexOf(normalized);
  return idx >= 0 ? idx : -1;
}

/**
 * Next statuses for admin dropdown — prefer backend curated list, normalized & sorted.
 */
export function resolveAdminNextStatuses(detail) {
  const curated = Array.isArray(detail?.adminSelectableNextStatuses)
    ? detail.adminSelectableNextStatuses
    : [];
  const allowed = Array.isArray(detail?.allowedNextStatuses)
    ? detail.allowedNextStatuses
    : [];
  const raw = curated.length > 0 ? curated : allowed;
  const normalized = [
    ...new Set(
      raw
        .map((s) => canonicalOrderStatus(s))
        .filter(Boolean),
    ),
  ];
  if (normalized.length === 0) return [];

  const primary = getOutstationPrimaryNextStatus(detail);
  const exceptions = normalized.filter((s) => isOutstationExceptionStatus(s));
  const operational = normalized.filter((s) => !isOutstationExceptionStatus(s));

  operational.sort((a, b) => {
    if (primary) {
      if (a === primary) return -1;
      if (b === primary) return 1;
    }
    const ai = getOutstationProgressIndex(a, detail?.deliveryType);
    const bi = getOutstationProgressIndex(b, detail?.deliveryType);
    if (ai === -1 && bi === -1) return a.localeCompare(b);
    if (ai === -1) return 1;
    if (bi === -1) return -1;
    return ai - bi;
  });

  exceptions.sort((a, b) => a.localeCompare(b));
  return [...operational, ...exceptions];
}

export function countOrdersByCanonicalStatus(orders) {
  const counts = { All: orders.length };
  for (const s of CANONICAL_ORDER_STATUSES) counts[s] = 0;
  for (const o of orders) {
    const c = canonicalOrderStatus(o?.status);
    if (!c) continue;
    counts[c] = (counts[c] ?? 0) + 1;
  }
  return counts;
}

export function orderMatchesStatusTab(order, statusTab) {
  if (!statusTab || statusTab === "All") return true;
  return canonicalOrderStatus(order?.status) === canonicalOrderStatus(statusTab);
}

export function statusBadgeClass(status) {
  const s = canonicalOrderStatus(status);
  if (s === "DELIVERED" || s === "COLLECTED") return "active";
  if (OUTSTATION_EXCEPTION_STATUSES.includes(s)) return "cancelled";
  if (s === "RIDER_ASSIGNED") return "active";
  if (s === "BOOKED") return "pending";
  return "info";
}

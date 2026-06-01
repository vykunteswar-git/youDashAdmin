/** Outstation bulk targets — hub milestones (Out for Delivery via assign rider only). */
export const OUTSTATION_BULK_STATUSES = [
  "PICKUP_ASSIGNED",
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

export function canonicalOrderStatus(status) {
  const s = String(status || "").toUpperCase().trim().replace(/-/g, "_");
  const legacy = {
    CREATED: "BOOKED",
    ORDER_CREATED: "BOOKED",
    PARCEL_PICKED_UP: "PICKED_UP",
    ARRIVED_ORIGIN_HUB: "AT_ORIGIN_HUB",
    ARRIVED_DESTINATION_HUB: "AT_DESTINATION_HUB",
    DELIVERY_RIDER_ASSIGNED: "OUT_FOR_DELIVERY",
    COLLECTED_BY_CUSTOMER: "COLLECTED",
  };
  return legacy[s] ?? s;
}

export function formatStatusLabel(status) {
  const s = canonicalOrderStatus(status);
  if (!s) return "—";
  return s.split("_").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" ");
}

function resolveDeliveryType(deliveryType) {
  const type = String(deliveryType || "DOOR_TO_DOOR").toUpperCase();
  if (type === "DOOR_TO_HUB" || type === "HUB_TO_DOOR") return type;
  return "DOOR_TO_DOOR";
}

export function getOutstationPrimaryNextStatus(order) {
  const cur = canonicalOrderStatus(order?.status);
  const type = resolveDeliveryType(order?.deliveryType || order?.delivery_type);
  return OUTSTATION_PRIMARY_NEXT[type]?.[cur] ?? null;
}

/** Same hub-step advance rules as zone_setup grouped view. */
export function canBulkAdvanceGroupStatus(status) {
  const next = getOutstationPrimaryNextStatus({ status, deliveryType: "DOOR_TO_DOOR" });
  if (!next) return false;
  return !["BOOKED", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY", "AWAITING_HUB_COLLECTION"].includes(
    canonicalOrderStatus(status),
  );
}

export function getBulkRecommendedAction(selectedOrders) {
  if (!selectedOrders.length) return null;
  const booked = selectedOrders.filter((o) => canonicalOrderStatus(o.status) === "BOOKED");
  if (booked.length === selectedOrders.length) return "Assign Pickup Rider";
  const primary = getOutstationPrimaryNextStatus(selectedOrders[0]);
  if (primary) return formatStatusLabel(primary);
  return "Update Status";
}

export function getDefaultBulkStatus(selectedOrders) {
  if (!selectedOrders.length) return OUTSTATION_BULK_STATUSES[0];
  const primary = getOutstationPrimaryNextStatus(selectedOrders[0]);
  if (primary && OUTSTATION_BULK_STATUSES.includes(primary)) return primary;
  const cur = canonicalOrderStatus(selectedOrders[0]?.status);
  const idx = OUTSTATION_BULK_STATUSES.indexOf(cur);
  if (idx >= 0 && idx < OUTSTATION_BULK_STATUSES.length - 1) {
    return OUTSTATION_BULK_STATUSES[idx + 1];
  }
  return OUTSTATION_BULK_STATUSES[0];
}

/** Client-side date filter for bulk ops (today / yesterday / pick a day). */
export function orderMatchesDateFilter(order, dateFilter, customDate) {
  if (!dateFilter || dateFilter === "ALL") return true;
  const raw = order.created_at || order.createdAt;
  if (!raw) return false;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return false;

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endToday = new Date(startToday);
  endToday.setDate(endToday.getDate() + 1);

  if (dateFilter === "TODAY") {
    return d >= startToday && d < endToday;
  }
  if (dateFilter === "YESTERDAY") {
    const startYesterday = new Date(startToday);
    startYesterday.setDate(startYesterday.getDate() - 1);
    return d >= startYesterday && d < startToday;
  }
  if (dateFilter === "CUSTOM" && customDate) {
    const [y, m, day] = customDate.split("-").map(Number);
    const start = new Date(y, m - 1, day);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return d >= start && d < end;
  }
  return true;
}

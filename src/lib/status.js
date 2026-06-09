export const STATUS_COLORS = {
  BOOKED: "pill-slate",
  RIDER_ASSIGNED: "pill-amber",
  PICKED_UP: "pill-amber",
  AT_ORIGIN_HUB: "pill-blue",
  IN_TRANSIT: "pill-blue",
  AT_DESTINATION_HUB: "pill-blue",
  OUT_FOR_DELIVERY: "pill-blue",
  DELIVERED: "pill-green",
  AWAITING_HUB_COLLECTION: "pill-amber",
  COLLECTED: "pill-green",
  CANCELLED: "pill-red",
  FAILED_DELIVERY: "pill-red",
  RETURN_INITIATED: "pill-red",
  RETURNED_TO_SENDER: "pill-red",
  RETURNED: "pill-red",
};

export const ALL_STATUSES = [
  "BOOKED", "RIDER_ASSIGNED", "PICKED_UP", "AT_ORIGIN_HUB", "IN_TRANSIT",
  "AT_DESTINATION_HUB", "OUT_FOR_DELIVERY", "DELIVERED",
  "AWAITING_HUB_COLLECTION", "COLLECTED",
];

export const EXCEPTION_STATUSES = [
  "CANCELLED", "FAILED_DELIVERY", "RETURN_INITIATED", "RETURNED_TO_SENDER", "RETURNED",
];

export const MILESTONE_ORDER = [
  "BOOKED", "RIDER_ASSIGNED", "PICKED_UP", "AT_ORIGIN_HUB", "IN_TRANSIT",
  "AT_DESTINATION_HUB", "OUT_FOR_DELIVERY", "DELIVERED",
];

export const HUB_TO_DOOR_MILESTONES = [
  "BOOKED", "AT_ORIGIN_HUB", "IN_TRANSIT", "AT_DESTINATION_HUB", "OUT_FOR_DELIVERY", "DELIVERED",
];

export const DOOR_TO_HUB_MILESTONES = [
  "BOOKED", "RIDER_ASSIGNED", "PICKED_UP", "AT_ORIGIN_HUB", "IN_TRANSIT", "AT_DESTINATION_HUB", "AWAITING_HUB_COLLECTION", "COLLECTED",
];

export const HUB_TO_HUB_MILESTONES = ["BOOKED"];

export function milestonesFor(delivery_type) {
  if (delivery_type === "HUB_TO_HUB") return HUB_TO_HUB_MILESTONES;
  if (delivery_type === "HUB_TO_DOOR") return HUB_TO_DOOR_MILESTONES;
  if (delivery_type === "DOOR_TO_HUB") return DOOR_TO_HUB_MILESTONES;
  return MILESTONE_ORDER;
}

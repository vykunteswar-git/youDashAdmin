import { canonicalOrderStatus } from "../../utils/orderStatusUtils";

export function canConfirmHubDrop(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    String(order?.deliveryType || "").toUpperCase() === "HUB_TO_DOOR" &&
    canonicalOrderStatus(order?.status) === "BOOKED"
  );
}

export function canConfirmHubCollect(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    String(order?.deliveryType || "").toUpperCase() === "DOOR_TO_HUB" &&
    canonicalOrderStatus(order?.status) === "AWAITING_HUB_COLLECTION"
  );
}

export function isOutstationDoorDeliveryType(deliveryType) {
  const type = String(deliveryType || "").toUpperCase();
  return type === "DOOR_TO_DOOR" || type === "HUB_TO_DOOR";
}

export function needsDeliveryRiderAssign(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    isOutstationDoorDeliveryType(order?.deliveryType) &&
    canonicalOrderStatus(order?.status) === "AT_DESTINATION_HUB"
  );
}

export function needsPickupRiderAssign(order) {
  const type = String(order?.deliveryType || "").toUpperCase();
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    (type === "DOOR_TO_DOOR" || type === "DOOR_TO_HUB") &&
    canonicalOrderStatus(order?.status) === "BOOKED"
  );
}

export function resolveSuggestedAssignRole(order) {
  if (needsDeliveryRiderAssign(order)) return "DELIVERY";
  if (needsPickupRiderAssign(order)) return "PICKUP";
  const type = String(order?.deliveryType || "").toUpperCase();
  if (type === "DOOR_TO_HUB") return "PICKUP";
  return "DELIVERY";
}

export function canRecordPickupCod(order, targetStatus) {
  const type = String(order?.deliveryType || "").toUpperCase();
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    (type === "DOOR_TO_DOOR" || type === "DOOR_TO_HUB") &&
    String(canonicalOrderStatus(targetStatus)) === "PICKED_UP" &&
    String(order?.paymentType || "").toUpperCase() === "COD" &&
    !(order?.codAlreadyCollected === true)
  );
}

export function getOutstationNextAdminAction(order) {
  if (!order || String(order?.serviceMode || "").toUpperCase() !== "OUTSTATION") {
    return null;
  }
  const status = canonicalOrderStatus(order?.status);
  const type = String(order?.deliveryType || "DOOR_TO_DOOR").toUpperCase();
  if (needsPickupRiderAssign(order)) {
    return "Assign pickup rider — order is booked and waiting for pickup.";
  }
  if (canConfirmHubDrop(order)) {
    return "Confirm hub drop-off — sender drops at origin hub (COD + drop OTP if COD).";
  }
  if (status === "RIDER_ASSIGNED" && (type === "DOOR_TO_DOOR" || type === "DOOR_TO_HUB")) {
    return "Confirm picked up — pickup OTP from sender; record COD from sender if applicable.";
  }
  if (status === "PICKED_UP") return "Mark at origin hub — parcel received at origin hub.";
  if (status === "AT_ORIGIN_HUB") return "Mark in transit — parcel dispatched on route.";
  if (status === "IN_TRANSIT") return "Mark at destination hub — parcel arrived at destination city.";
  if (needsDeliveryRiderAssign(order)) {
    return "Assign delivery rider — status becomes Out for Delivery automatically.";
  }
  if (status === "AT_DESTINATION_HUB" && type === "DOOR_TO_HUB") {
    return "Mark awaiting hub collection — receiver collects at destination hub.";
  }
  if (canConfirmHubCollect(order)) {
    return "Confirm hub collection — receiver OTP at destination hub.";
  }
  if (status === "OUT_FOR_DELIVERY") {
    return "Mark delivered — delivery OTP from receiver (COD already collected from sender).";
  }
  return null;
}

export function orderMatchesAssignedFilter(order, filter) {
  if (filter === "All") return true;
  const hasRider =
    order?.riderId != null ||
    order?.pickupRiderId != null ||
    order?.deliveryRiderId != null;
  if (filter === "Unassigned") return !hasRider;
  if (filter === "Assigned") return hasRider;
  return true;
}

export function orderMatchesPaymentFilter(order, filter) {
  if (filter === "All") return true;
  return String(order?.paymentType || "").toUpperCase() === filter;
}

export function getBulkRecommendedAction(selectedOrders) {
  if (!selectedOrders.length) return null;
  const booked = selectedOrders.filter(
    (o) => canonicalOrderStatus(o.status) === "BOOKED",
  );
  if (booked.length === selectedOrders.length) {
    return "Assign Pickup Rider";
  }
  return "Update Status";
}

/** Field mapping aligned with live GET /admin/riders/* API responses. */

export function validRiderMediaUrl(url) {
  if (url == null || typeof url !== "string") return null;
  const s = url.trim();
  if (!s || s === "string" || s === "null" || s === "undefined") return null;
  if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:image")) return s;
  return null;
}

/** KYC / onboarding images — only dedicated document URL fields (never reuse avatar as license/aadhaar). */
export function buildRiderKycDocuments(rider = {}) {
  const candidates = [
    { key: "selfie", label: "Selfie", url: rider.selfieUrl },
    { key: "license", label: "Driving License", url: rider.licenseImageUrl || rider.licenseImage },
    {
      key: "aadhaar",
      label: "Aadhaar Card",
      url: rider.aadhaarImageUrl || rider.aadharImageUrl || rider.aadharCardImage,
    },
    { key: "pan", label: "PAN Card", url: rider.panImageUrl || rider.panCardImage },
    { key: "vehicle_reg", label: "Vehicle Registration", url: rider.vehicleRegistrationImage },
  ];
  return candidates
    .map((doc) => ({ ...doc, url: validRiderMediaUrl(doc.url) }))
    .filter((doc) => doc.url);
}

export function riderAvatarUrl(rider = {}) {
  return (
    validRiderMediaUrl(rider.profileImageUrl) ||
    validRiderMediaUrl(rider.profileImage) ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rider.name || "Rider")}`
  );
}

export function mapRecentOrders(orders = []) {
  if (!Array.isArray(orders)) return [];
  return orders.map((o) => ({
    id: o.id,
    tracking_id: o.displayOrderId || o.tracking_id || `YD-${o.id}`,
    status: o.status || "—",
    payment_mode: o.paymentType === "ONLINE" ? "PREPAID" : (o.paymentType || o.payment_mode || "COD"),
    origin_city: o.originHubCity || o.origin_city || "—",
    destination_city: o.destinationHubCity || o.destination_city || "—",
    created_at: o.createdAt || o.created_at || "",
    total_amount: o.totalAmount ?? o.fare?.total ?? 0,
    fare_breakdown: { total: o.totalAmount ?? o.fare?.total ?? 0 },
    earned_amount: o.earnedAmount,
    rider_role: o.legTypeForRider || "delivery",
  }));
}

export function mapWalletTransactions(transactions = []) {
  if (!Array.isArray(transactions)) return [];
  return transactions.map((t) => ({
    id: t.id,
    type: String(t.type || "").toUpperCase(),
    label: t.note || `${t.referenceType || "TXN"}${t.referenceId != null ? ` #${t.referenceId}` : ""}`,
    amount: Number(t.amount ?? 0),
    ts: t.createdAt || "",
    status: t.status,
    reference_type: t.referenceType,
    reference_id: t.referenceId,
  }));
}

export function mapRecentWithdrawals(withdrawals = []) {
  if (!Array.isArray(withdrawals)) return [];
  return withdrawals.map((w) => ({
    id: w.id,
    amount: w.amount ?? 0,
    status: w.status || "—",
    account_holder_name: w.accountHolderName || "—",
    account_number: w.accountNumber || "—",
    ifsc: w.ifsc || "—",
    created_at: w.createdAt || "",
  }));
}

export function normalizeRiderUi(rider = {}) {
  const kyc_documents = buildRiderKycDocuments(rider);
  const approvalStatus = String(rider.approvalStatus ?? "PENDING").toUpperCase();
  const recent_orders = mapRecentOrders(rider.recentOrders);
  const recent_wallet_transactions = mapWalletTransactions(rider.recentWalletTransactions);
  const recent_withdrawals = mapRecentWithdrawals(rider.recentWithdrawals);

  const delivered = recent_orders.filter((o) => o.status === "DELIVERED").length;

  return {
    ...rider,
    id: rider.id,
    public_id: rider.publicId ?? "",
    name: rider.name ?? "—",
    phone: rider.phone ?? rider.phoneNumber ?? "—",
    email: rider.email ?? "",
    vehicle_type: rider.vehicleType ?? rider.vehicle_type ?? "—",
    vehicle_id: rider.vehicleId,
    vehicle_model: rider.vehicleModel ?? rider.vehicle_model ?? "",
    vehicle_number: rider.vehicleNumber ?? rider.vehicle_number ?? "",
    vehicle_state: rider.vehicleState ?? rider.vehicle_state ?? "",
    city: rider.zoneName || rider.city || "—",
    zone_id: rider.zoneId ?? rider.zone_id,
    zone_name: rider.zoneName ?? rider.zone_name ?? "",
    rating: rider.rating != null && rider.rating !== "" ? Number(rider.rating) : null,
    status: approvalStatus,
    approvalStatus,
    availability: rider.isAvailable ? "ONLINE" : "OFFLINE",
    isAvailable: Boolean(rider.isAvailable),
    blocked: rider.isBlocked || rider.dispatchBlocked || false,
    wallet_balance: Number(rider.walletCurrentBalance ?? rider.wallet_balance ?? 0),
    wallet_total_earnings: Number(rider.walletTotalEarnings ?? 0),
    wallet_total_withdrawn: Number(rider.walletTotalWithdrawn ?? 0),
    wallet_net_available: Number(rider.walletNetAvailable ?? rider.walletCurrentBalance ?? 0),
    wallet_withdrawal_pending: Number(rider.walletWithdrawalPendingAmount ?? 0),
    cod_pending: Number(rider.walletCodPendingAmount ?? rider.cod_pending ?? 0),
    cod_limit: Number(rider.codHandoverLimit ?? rider.cod_limit ?? 0),
    total_orders_delivered: Number(rider.totalOrdersDelivered ?? 0),
    avatar: riderAvatarUrl(rider),
    joined_at: rider.createdAt ?? rider.joined_at ?? "",
    emergency_contact_name: rider.emergencyContactName ?? "",
    emergency_contact_phone:
      rider.emergencyPhone ??
      rider.emergencyContactPhone ??
      rider.emergencyContactNumber ??
      "",
    emergency_contact_relation: rider.emergencyContactRelation ?? "",
    kyc_documents,
    recent_orders,
    recent_wallet_transactions,
    recent_withdrawals,
    performance: {
      total_orders: rider.totalOrdersDelivered ?? recent_orders.length,
      delivered,
      in_progress: Math.max(0, recent_orders.length - delivered),
      failed: recent_orders.filter((o) => ["CANCELLED", "FAILED", "RETURNED"].includes(o.status)).length,
      completion_rate: recent_orders.length
        ? Math.round((delivered / recent_orders.length) * 100)
        : (rider.totalOrdersDelivered ? 100 : 0),
      on_time_rate: 0,
      rating: rider.rating ?? 0,
      total_earnings: Number(rider.walletTotalEarnings ?? 0),
    },
  };
}

export function walletFromRider(rider = {}) {
  return {
    balance: Number(rider.wallet_balance ?? rider.walletCurrentBalance ?? 0),
    net_available: Number(rider.wallet_net_available ?? rider.walletNetAvailable ?? 0),
    total_earnings: Number(rider.wallet_total_earnings ?? rider.walletTotalEarnings ?? 0),
    total_withdrawn: Number(rider.wallet_total_withdrawn ?? rider.walletTotalWithdrawn ?? 0),
    withdrawal_pending: Number(rider.wallet_withdrawal_pending ?? rider.walletWithdrawalPendingAmount ?? 0),
    cod_pending: Number(rider.cod_pending ?? rider.walletCodPendingAmount ?? 0),
    cod_limit: Number(rider.cod_limit ?? rider.codHandoverLimit ?? 0),
    blocked: Boolean(rider.blocked ?? rider.isBlocked ?? rider.dispatchBlocked),
    transactions: rider.recent_wallet_transactions || mapWalletTransactions(rider.recentWalletTransactions),
  };
}

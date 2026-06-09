import axios from "axios";
import { clearAuthSession, withAuthHeaders } from "@/lib/auth";
import { normalizeRiderUi, walletFromRider, mapRecentOrders } from "@/lib/riderUtils";

/** Spring API origin. Dev uses Vite proxy (empty base). Prod must not use admin subdomain. */
const configuredBackend = String(import.meta.env.VITE_BACKEND_URL || "").trim();
export const BACKEND_URL =
  configuredBackend || (import.meta.env.DEV ? "" : "https://youdashexpress.com");
/** Axios baseURL: same-origin in dev (proxied), absolute API host in production. */
export const API = import.meta.env.DEV ? "" : BACKEND_URL;

const client = axios.create({ baseURL: API, timeout: 30000 });

client.interceptors.request.use((config) => {
  config.headers = withAuthHeaders(config.headers);
  return rewriteAdminRequest(config);
});

function adapterHeaders(config) {
  return withAuthHeaders(config.headers);
}

client.interceptors.response.use(
  (response) => normalizeAdminResponse(response),
  (error) => {
    if (error?.response?.status === 401) {
      clearAuthSession();

      if (window.location.pathname !== "/login") {
        const next = `${window.location.pathname}${window.location.search}`;
        window.location.replace(`/login?next=${encodeURIComponent(next)}`);
      }
    }

    if (error?.response?.status === 404 && error.config?.method === "get") {
      return Promise.resolve(
        normalizeAdminResponse({
          config: error.config,
          data: { data: emptyDataFor(error.config?.adminUiUrl || error.config?.url || "") },
        }),
      );
    }

    return Promise.reject(error);
  },
);

export default client;

function rewriteAdminRequest(config) {
  const url = config.url || "";
  config.adminUiUrl = url;

  if (url === "/admin/login") {
    return config;
  }

  if (url === "/dashboard/summary") {
    config.adapter = dashboardAdapter;
    return config;
  }
  if (url === "/reports") {
    config.url = "/admin/reports/revenue";
    config.params = { range: rangeToBackend(config.params?.range) };
    return config;
  }
  if (url === "/orders/hub-to-hub/preview" || url === "/orders/hub-to-hub") {
    config.url = url.replace("/orders", "/admin/orders");
    return config;
  }
  if (url === "/orders" || url === "/orders/grouped" || url === "/orders/routes") {
    config.url = "/admin/orders";
    return config;
  }
  if (url.match(/^\/orders\/\d+$/)) {
    config.url = url.replace("/orders", "/admin/orders");
    return config;
  }
  if (url === "/orders/by-ref") {
    config.url = "/admin/orders/by-ref";
    return config;
  }
  if (url.match(/^\/orders\/\d+\/activity$/)) {
    config.url = url.replace("/orders", "/admin/orders").replace("/activity", "");
    return config;
  }
  if (url.match(/^\/orders\/\d+\/assign-rider$/)) {
    config.url = url.replace("/orders", "/admin/orders");
    config.data = assignmentPayload(config.data);
    return config;
  }
  if (url.match(/^\/orders\/\d+\/notify$/)) {
    config.url = url.replace("/orders", "/admin/orders").replace("/notify", "/notify-user");
    return config;
  }
  if (url.match(/^\/orders\/\d+\/status$/)) {
    config.url = url.replace("/orders", "/admin/orders").replace("/status", "/update-status");
    config.data = statusPayload(config.data);
    return config;
  }
  if (url.match(/^\/orders\/\d+\/hub-handover$/)) {
    config.url = url.replace("/orders", "/admin/orders").replace("/hub-handover", "/verify-hub-handover");
    config.data = hubHandoverPayload(config.data);
    return config;
  }
  if (url.match(/^\/orders\/\d+\/hub-to-hub$/)) {
    config.url = url.replace("/orders", "/admin/orders");
    return config;
  }
  if (url === "/riders") {
    config.adapter = ridersListAdapter;
    return config;
  }
  if (url === "/riders/eligible") {
    const orderId = config.params?.order_id;
    const role = String(config.params?.role || "").toUpperCase();
    config.url = `/admin/riders/eligible-for-order/${orderId}`;
    config.params = role ? { role } : {};
    return config;
  }
  if (url.match(/^\/riders\/\d+\/handover-limit$/)) {
    config.url = url.replace("/riders", "/admin/cod/riders").replace("/handover-limit", "/handover-limit");
    config.method = "patch";
    config.data = { codHandoverLimit: numberOrUndefined(config.data?.cod_handover_limit ?? config.data?.codHandoverLimit) };
    return config;
  }
  if (url.match(/^\/riders\/\d+\/(approve|reject)$/)) {
    config.url = url.replace("/riders", "/admin/riders");
    return config;
  }
  if (url.match(/^\/riders\/\d+$/) && config.method === "delete") {
    config.url = url.replace("/riders", "/admin/riders");
    return config;
  }
  if (url.match(/^\/riders\/\d+$/)) {
    config.adapter = riderDetailAdapter;
    return config;
  }
  if (url.match(/^\/riders\/\d+\/(orders|wallet|cod-deposits|performance)$/)) {
    config.adapter = riderDetailAdapter;
    return config;
  }
  if (url === "/users") {
    config.url = "/admin/users";
    return config;
  }
  if (url.match(/^\/users\/\d+\/orders$/)) {
    config.adapter = userOrdersAdapter;
    return config;
  }
  if (url.match(/^\/users\/\d+$/) && config.method === "delete") {
    config.url = url.replace("/users", "/admin/users") + "/hard-delete";
    return config;
  }
  if (url.match(/^\/users\/\d+$/) && (config.method === "put" || config.method === "patch")) {
    config.url = url.replace("/users", "/admin/users");
    if (config.method === "patch") config.method = "put";
    config.data = userUpdatePayload(config.data);
    return config;
  }
  if (url.match(/^\/users\/\d+$/) && config.method === "get") {
    config.url = url.replace("/users", "/admin/users");
    return config;
  }
  if (url === "/vehicles") {
    config.url = "/admin/vehicles";
    if (config.method === "post") {
      config.data = vehicleJsonPayload(config.data);
    }
    return config;
  }
  if (url.match(/^\/vehicles\/\d+$/)) {
    config.url = url.replace("/vehicles", "/admin/vehicles");
    if (config.method === "patch") config.method = "put";
    if (config.method === "put") {
      config.data = vehicleJsonPayload(config.data);
    }
    return config;
  }
  if (url === "/zones" || url.match(/^\/zones\/\d+$/)) {
    if (url.match(/^\/zones\/\d+$/) && config.method === "get") {
      config.adapter = zoneDetailAdapter;
      return config;
    }
    config.url = url.replace("/zones", "/admin/zones");
    if (config.method === "patch") config.method = "put";
    config.data = zonePayload(config.data);
    return config;
  }
  if (url === "/hubs" || url.match(/^\/hubs\/\d+$/)) {
    if (url.match(/^\/hubs\/\d+$/) && config.method === "get") {
      config.adapter = hubDetailAdapter;
      return config;
    }
    if (url.match(/^\/hubs\/\d+\/slots$/)) {
      config.adapter = noopAdapter;
      return config;
    }
    config.url = url.replace("/hubs", "/admin/hubs");
    if (config.method === "patch") config.method = "put";
    config.data = hubPayload(config.data);
    return config;
  }
  if (url.match(/^\/hubs\/\d+\/slots$/)) {
    config.adapter = noopAdapter;
    return config;
  }
  if (url === "/coupons" || url.match(/^\/coupons\/\d+$/)) {
    config.url = url.replace("/coupons", "/admin/coupons");
    if (config.method === "patch") config.method = "put";
    config.data = couponPayload(config.data);
    return config;
  }
  if (url === "/categories" || url.match(/^\/categories\/\d+$/)) {
    config.url = url.replace("/categories", "/admin/package-categories");
    if (config.method === "patch") config.method = "put";
    config.data = categoryPayload(config.data);
    return config;
  }
  if (url === "/banners" || url.match(/^\/banners\/\d+$/)) {
    config.url = url.replace("/banners", "/admin/banners");
    if (config.method === "patch") config.method = "put";
    if (config.method === "post" || config.method === "put") {
      config.data = adminMultipartFormData(bannerMultipartPayload(config.data));
    }
    return config;
  }
  if (url === "/notifications/targets") {
    config.url = "/admin/notifications/targets";
    config.params = { q: config.params?.q, limit: config.params?.limit ?? 20 };
    return config;
  }
  if (url === "/notifications") {
    if (config.method === "get") {
      config.url = "/admin/notifications/logs";
      config.params = { page: config.params?.page ?? 0, size: config.params?.size ?? 20 };
    } else {
      config.url = "/admin/notifications/broadcast";
    }
    return config;
  }
  if (url === "/transactions") {
    config.adapter = transactionsAdapter;
    return config;
  }
  if (url === "/withdrawals") {
    config.url = "/admin/withdraw/requests";
    return config;
  }
  if (url.match(/^\/withdrawals\/\d+\/(approve|reject)$/)) {
    const [, id, action] = url.match(/^\/withdrawals\/(\d+)\/(approve|reject)$/);
    config.url = `/admin/withdraw/${action}`;
    config.data = { withdrawalId: Number(id), approve: action === "approve" };
    return config;
  }
  if (url === "/incentives" || url.match(/^\/incentives\/\d+$/)) {
    config.url = url.replace("/incentives", "/admin/incentives/peak-campaigns");
    if (config.method === "patch") config.method = "put";
    config.data = incentivePayload(config.data);
    return config;
  }
  if (url === "/zone-routes" || url.match(/^\/zone-routes\/\d+$/)) {
    config.url = url.replace("/zone-routes", "/admin/zone-routes");
    config.data = zoneRoutePayload(config.data);
    if (config.method === "patch") config.method = "put";
    return config;
  }
  if (url === "/hub-routes" || url.match(/^\/hub-routes\/\d+$/)) {
    config.url = url.replace("/hub-routes", "/admin/hub-routes");
    config.data = hubRoutePayload(config.data);
    if (config.method === "patch") config.method = "put";
    return config;
  }
  if (url === "/zone-route-sla" || url.match(/^\/zone-route-sla\/\d+$/)) {
    config.url = url.replace("/zone-route-sla", "/admin/zone-route-sla");
    if (config.method === "patch") config.method = "put";
    return config;
  }
  if (url === "/hub-corridor-sla" || url.match(/^\/hub-corridor-sla\/\d+$/)) {
    config.url = url.replace("/hub-corridor-sla", "/admin/hub-corridor-sla");
    if (config.method === "patch") config.method = "put";
    return config;
  }
  if (url === "/hub-route-sla" || url.match(/^\/hub-route-sla\/\d+$/)) {
    config.url = url.replace("/hub-route-sla", "/admin/hub-route-sla");
    if (config.method === "patch") config.method = "put";
    return config;
  }
  if (url === "/pricing/resolve") {
    config.adapter = pricingResolveAdapter;
    return config;
  }
  if (url.match(/^\/riders\/\d+\/cod-deposit$/)) {
    config.url = "/admin/cod/deposit";
    config.data = codDepositPayload(config.data);
    return config;
  }
  if (url === "/wallet/cod-settlement") {
    config.url = "/admin/cod/settle";
    config.data = { orderId: config.data?.order_id, amount: config.data?.amount };
    return config;
  }
  if (url === "/config/commission") {
    config.url = "/admin/commission/config";
    if (config.method === "put") config.method = "post";
    config.data = commissionPayload(config.data);
    return config;
  }
  if (url === "/config/payments") {
    config.url = "/admin/config";
    if (config.method === "put") config.method = "put";
    config.data = paymentConfigPayload(config.data);
    return config;
  }
  if (url === "/config/app") {
    config.url = "/admin/config";
    config.data = appConfigPayload(config.data);
    return config;
  }
  if (url === "/config/app-version") {
    config.url = "/admin/app-version";
    config.data = appVersionPayload(config.data);
    return config;
  }
  if (url === "/audit-logs") {
    config.adapter = auditLogsAdapter;
    return config;
  }
  if (url === "/earnings") {
    config.url = "/admin/earnings";
    config.params = { range: rangeToBackend(config.params?.range) };
    return config;
  }

  return config;
}

function normalizeAdminResponse(response) {
  const originalUrl = response.config?.adminUiUrl || response.config?.url || "";
  const payload = response.data;

  // Keep ApiResponse wrapper for auth (token + success flag).
  if (originalUrl === "/admin/login") {
    return response;
  }

  const data = payload && Object.prototype.hasOwnProperty.call(payload, "data") ? payload.data : payload;

  if (originalUrl === "/dashboard/summary") response.data = normalizeDashboard(data);
  else if (originalUrl === "/reports") response.data = normalizeReport(data);
  else if (originalUrl === "/orders") response.data = { orders: filterOrders((data || []).map(normalizeOrder), response.config?.params) };
  else if (originalUrl === "/orders/grouped") response.data = { groups: groupOrders(filterOrders((data || []).map(normalizeOrder), response.config?.params)) };
  else if (originalUrl === "/orders/routes") response.data = { routes: routesFromOrders((data || []).map(normalizeOrder)) };
  else if (originalUrl.match(/^\/orders\/\d+$/) || originalUrl === "/orders/by-ref") response.data = normalizeOrder(data);
  else if (originalUrl.match(/^\/orders\/\d+\/activity$/)) response.data = { activity: normalizeActivity(data) };
  else if (originalUrl === "/riders/eligible") response.data = { riders: (data || []).map(normalizeRiderUi) };
  else if (originalUrl === "/users") response.data = { users: (data || []).map(normalizeUser) };
  else if (originalUrl.match(/^\/users\/\d+$/)) response.data = normalizeUser(data || {});
  else if (originalUrl.match(/^\/users\/\d+\/orders$/)) {
    const orders = Array.isArray(data?.orders) ? data.orders : Array.isArray(data) ? data : [];
    response.data = { orders };
  }
  else if (originalUrl === "/vehicles") response.data = { vehicles: (data || []).map(normalizeVehicle) };
  else if (originalUrl === "/zones") response.data = { zones: Array.isArray(data) ? data.map(normalizeZone) : [] };
  else if (originalUrl === "/hubs") response.data = { hubs: Array.isArray(data) ? data.map(normalizeHubForUi) : [] };
  else if (originalUrl === "/coupons") response.data = { coupons: (data || []).map(normalizeCoupon) };
  else if (originalUrl === "/categories") response.data = { categories: (data || []).map(normalizeCategory) };
  else if (originalUrl === "/banners") response.data = { banners: (data || []).map(normalizeBanner) };
  else if (originalUrl === "/notifications/targets") response.data = normalizeNotificationTargets(data);
  else if (originalUrl === "/notifications") response.data = normalizeNotificationLogs(data);
  else if (originalUrl === "/transactions") response.data = normalizeTransactions(data);
  else if (originalUrl === "/config/commission") response.data = normalizeCommissionConfig(data);
  else if (originalUrl === "/config/payments") response.data = normalizePaymentConfig(data);
  else if (originalUrl === "/config/app") response.data = normalizeAppConfig(data);
  else if (originalUrl === "/config/app-version") response.data = normalizeAppVersion(data);
  else if (originalUrl === "/withdrawals") response.data = { withdrawals: (data || []).map(normalizeWithdrawal) };
  else if (originalUrl === "/incentives") {
    response.data = Array.isArray(data) ? { incentives: data.map(normalizeIncentive) } : normalizeIncentive(data);
  }
  else if (originalUrl === "/zone-routes") response.data = { routes: (data || []).map(normalizeZoneRoute) };
  else if (originalUrl === "/hub-routes") response.data = { routes: (data || []).map(normalizeHubRoute) };
  else if (originalUrl === "/zone-route-sla" && response.config?.method === "get") response.data = { slas: Array.isArray(data) ? data : [] };
  else if (originalUrl === "/hub-corridor-sla" && response.config?.method === "get") response.data = { slas: Array.isArray(data) ? data : [] };
  else if (originalUrl === "/hub-route-sla" && response.config?.method === "get") response.data = { slas: Array.isArray(data) ? data : [] };
  else if (originalUrl === "/earnings") response.data = normalizeEarnings(data);
  else response.data = data || payload;

  return response;
}

function emptyDataFor(originalUrl) {
  if (
    originalUrl === "/orders" ||
    originalUrl === "/orders/grouped" ||
    originalUrl === "/orders/routes" ||
    originalUrl === "/riders" ||
    originalUrl === "/riders/eligible" ||
    originalUrl === "/users" ||
    originalUrl === "/vehicles" ||
    originalUrl === "/zones" ||
    originalUrl === "/hubs" ||
    originalUrl === "/coupons" ||
    originalUrl === "/categories" ||
    originalUrl === "/banners" ||
    originalUrl === "/notifications" ||
    originalUrl === "/withdrawals" ||
    originalUrl === "/incentives" ||
    originalUrl === "/zone-routes" ||
    originalUrl === "/hub-routes" ||
    originalUrl === "/zone-route-sla" ||
    originalUrl === "/hub-corridor-sla" ||
    originalUrl === "/hub-route-sla"
  ) {
    return [];
  }
  if (originalUrl === "/dashboard/summary") return {};
  if (originalUrl === "/reports") return {};
  if (originalUrl === "/earnings") return { orderCount: 0, totalRevenue: 0, totalCommission: 0, totalGst: 0, totalPlatformFee: 0, totalPlatformNet: 0, totalRiderPayouts: 0, orders: [] };
  if (originalUrl === "/transactions") return {};
  if (originalUrl === "/notifications/targets") return { cities: [], zones: [], users: [], riders: [] };
  return null;
}

function assignmentPayload(data = {}) {
  const riderId = data.rider_id || data.riderId;
  const role = String(data.role || "").toUpperCase();
  if (role === "PICKUP") return { pickupRiderId: riderId, assignmentRole: "PICKUP" };
  if (role === "DELIVERY") return { deliveryRiderId: riderId, assignmentRole: "DELIVERY" };
  if (role === "BOTH") return { pickupRiderId: riderId, deliveryRiderId: riderId, assignmentRole: "BOTH" };
  return { riderId };
}

function statusPayload(data = {}) {
  return {
    status: data.status,
    otp: data.otp,
    adminOverride: data.force || data.emergency_override,
    codCollectionMode: data.cod_mode,
  };
}

function hubHandoverPayload(data = {}) {
  return {
    type: data.type,
    otp: data.otp,
    adminOverride: data.force || data.emergency_override,
    codCollectionMode: data.cod_mode,
  };
}

function codDepositPayload(data = {}) {
  return {
    riderId: data.rider_id || data.riderId,
    amount: data.amount,
    hubId: data.hub_id === "manual" ? null : data.hub_id || data.hubId,
    note: data.note,
  };
}

function zoneRoutePayload(data = {}) {
  if (!data) return data;
  return {
    originZoneId: numberOrUndefined(data.origin_zone_id ?? data.originZoneId ?? data.origin),
    destinationZoneId: numberOrUndefined(data.destination_zone_id ?? data.destinationZoneId ?? data.destination),
    ratePerKm: numberOrUndefined(data.rate_per_km ?? data.ratePerKm),
    isActive: data.active ?? data.isActive,
  };
}

function hubRoutePayload(data = {}) {
  if (!data) return data;
  return {
    originHubId: numberOrUndefined(data.origin_hub_id ?? data.originHubId),
    destinationHubId: numberOrUndefined(data.destination_hub_id ?? data.destinationHubId),
    ratePerKm: numberOrUndefined(data.rate_per_km ?? data.ratePerKm),
    isActive: data.active ?? data.isActive,
  };
}

function numberOrUndefined(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function vehicleMultipartPayload(data = {}) {
  if (!data) return {};
  const imageUrl = data.image || data.imageUrl;
  return {
    name: data.name,
    pricePerKm: numberOrUndefined(data.per_km ?? data.pricePerKm),
    baseFare: numberOrUndefined(data.base_fare ?? data.baseFare),
    minimumKm: numberOrUndefined(data.min_distance ?? data.minimumKm),
    maxWeight: numberOrUndefined(data.max_weight ?? data.maxWeight),
    imageUrl: imageUrl || undefined,
    isActive: data.active ?? data.isActive,
    imageFile: data.imageFile,
  };
}

function vehicleJsonPayload(data = {}) {
  if (!data) return {};
  const imageUrl = data.image || data.imageUrl;
  return {
    name: data.name,
    pricePerKm: numberOrUndefined(data.per_km ?? data.pricePerKm),
    baseFare: numberOrUndefined(data.base_fare ?? data.baseFare),
    minimumKm: numberOrUndefined(data.min_distance ?? data.minimumKm),
    maxWeight: numberOrUndefined(data.max_weight ?? data.maxWeight),
    imageUrl: imageUrl || undefined,
    isActive: data.active ?? data.isActive,
  };
}

function zonePayload(data = {}) {
  if (!data) return data;
  const zoneType = data.zoneType || data.zone_type || "CIRCLE";
  return {
    ...data,
    zoneType,
    isActive: data.status ? data.status === "SERVING" : data.active ?? data.isActive,
    centerLat: zoneType === "CIRCLE" ? numberOrUndefined(data.centerLat) : undefined,
    centerLng: zoneType === "CIRCLE" ? numberOrUndefined(data.centerLng) : undefined,
    radiusKm: zoneType === "CIRCLE" ? numberOrUndefined(data.radiusKm) : undefined,
    coordinates: zoneType === "POLYGON" ? data.coordinates || [] : undefined,
  };
}

function hubPayload(data = {}) {
  if (!data) return data;
  return {
    ...data,
    zoneId: numberOrUndefined(data.zone_id ?? data.zoneId),
    intakeCutoff: data.hours || data.intakeCutoff,
    isActive: data.status ? data.status !== "HUB_OFF" : data.active ?? data.isActive,
  };
}

function commissionPayload(data = {}) {
  return {
    onlineCommissionPercent: numberOrUndefined(data.online_pct ?? data.onlineCommissionPercent),
    codCashCommissionPercent: numberOrUndefined(data.cod_cash_pct ?? data.codCashCommissionPercent),
    codQrCommissionPercent: numberOrUndefined(data.cod_qr_pct ?? data.codQrCommissionPercent),
  };
}

function paymentConfigPayload(data = {}) {
  return {
    codEnabled: data.cod_enabled ?? data.codEnabled,
    onlineEnabled: data.online_enabled ?? data.onlineEnabled,
    defaultPaymentType: data.default_method ?? data.defaultPaymentType,
  };
}

function appConfigPayload(data = {}) {
  if (!data) return data;
  return {
    gstPercent: numberOrUndefined(data.gstPercent),
    incityPlatformFee: numberOrUndefined(data.incityPlatformFee),
    outstationPlatformFee: numberOrUndefined(data.outstationPlatformFee),
    pickupRatePerKm: numberOrUndefined(data.pickupRatePerKm),
    dropRatePerKm: numberOrUndefined(data.dropRatePerKm),
    perKgRate: numberOrUndefined(data.perKgRate),
    defaultRouteRatePerKm: numberOrUndefined(data.defaultRouteRatePerKm),
    codEnabled: data.codEnabled,
    onlineEnabled: data.onlineEnabled,
    defaultPaymentType: data.defaultPaymentType,
    pickupLegTiers: normalizeTierPayload(data.pickupLegTiers),
    dropLegTiers: normalizeTierPayload(data.dropLegTiers),
    weightCostSlabs: normalizeWeightSlabPayload(data.weightCostSlabs),
  };
}

function normalizeTierPayload(tiers = []) {
  return tiers.map((tier, index) => ({
    id: tier.id,
    minWeightKg: numberOrUndefined(tier.minWeightKg),
    maxWeightKg: numberOrUndefined(tier.maxWeightKg),
    vehicleId: numberOrUndefined(tier.vehicleId),
    baseFare: numberOrUndefined(tier.baseFare),
    minimumKm: numberOrUndefined(tier.minimumKm),
    ratePerKm: numberOrUndefined(tier.ratePerKm),
    sortOrder: numberOrUndefined(tier.sortOrder) ?? index,
    isActive: tier.isActive ?? true,
  }));
}

function normalizeWeightSlabPayload(slabs = []) {
  if (!slabs) return [];
  return slabs.map((slab, index) => ({
    id: slab.id,
    minWeightKg: numberOrUndefined(slab.minWeightKg),
    maxWeightKg: numberOrUndefined(slab.maxWeightKg),
    flatCost: numberOrUndefined(slab.flatCost),
    sortOrder: numberOrUndefined(slab.sortOrder) ?? index,
    isActive: slab.isActive ?? true,
  }));
}

function appVersionPayload(data = {}) {
  if (!data.app) return data;
  if (data.app === "user") {
    return {
      userVersionCode: numberOrUndefined(data.version_code),
      userPlayStoreUrl: data.play_store_url,
    };
  }
  return {
    riderVersionCode: numberOrUndefined(data.version_code),
    riderPlayStoreUrl: data.play_store_url,
  };
}

function categoryPayload(data = {}) {
  if (!data) return data;
  return {
    name: data.name,
    emoji: data.emoji,
    sortOrder: numberOrUndefined(data.sort_order ?? data.sortOrder),
    isActive: data.active ?? data.isActive,
    defaultDeliveryType: data.default_delivery_type ?? data.defaultDeliveryType,
  };
}

function couponPayload(data = {}) {
  if (!data) return data;
  return {
    code: data.code,
    title: data.title,
    description: data.description,
    discountType: data.discount_type ?? data.discountType,
    discountValue: numberOrUndefined(data.discount_value ?? data.discountValue),
    maxDiscountAmount: numberOrUndefined(data.max_discount ?? data.maxDiscountAmount),
    minOrderAmount: numberOrUndefined(data.min_order_amount ?? data.minOrderAmount),
    validFrom: data.start_date || data.valid_from || data.validFrom,
    validTo: data.end_date || data.valid_to || data.validTo,
    maxRedemptionsTotal: numberOrUndefined(data.max_redemptions ?? data.maxRedemptionsTotal),
    maxRedemptionsPerUser: numberOrUndefined(data.max_per_user ?? data.maxRedemptionsPerUser),
    serviceMode: data.service_mode ?? data.serviceMode,
    active: data.status ? data.status === "ACTIVE" : data.active,
  };
}

function bannerMultipartPayload(data = {}) {
  if (!data) return {};
  const imageUrl = data.image || data.image_url || data.imageUrl;
  return {
    title: data.title,
    subtitle: data.subtitle,
    imageUrl: imageUrl || undefined,
    redirectUrl: data.redirect_url || data.redirectUrl,
    sortOrder: numberOrUndefined(data.sort_order ?? data.sortOrder),
    isActive: data.status ? data.status === "ACTIVE" : data.active ?? data.isActive,
    startsAt: data.start_date || data.startsAt,
    endsAt: data.end_date || data.endsAt,
    imageFile: data.imageFile,
  };
}

function normalizeNotificationTargets(data = {}) {
  const d = data && typeof data === "object" ? data : {};
  return {
    cities: Array.isArray(d.cities) ? d.cities : [],
    zones: Array.isArray(d.zones) ? d.zones : [],
    users: Array.isArray(d.users) ? d.users : [],
    riders: Array.isArray(d.riders) ? d.riders : [],
  };
}

function normalizeNotificationLogs(data) {
  const content = Array.isArray(data)
    ? data
    : Array.isArray(data?.content)
      ? data.content
      : Array.isArray(data?.logs)
        ? data.logs
        : [];
  const notifications = content.map((row, index) => ({
    id: row.id ?? row.campaignId ?? row.logId ?? index,
    title: row.title || row.heading || "—",
    body: row.body || row.message || "",
    target: row.target || row.targetType || row.targetLabel || "—",
    type: row.type || row.notificationType || "",
    sent: row.sent ?? row.totalCount ?? row.recipientCount ?? 0,
    success: row.success ?? row.successCount ?? row.deliveredCount ?? 0,
    failed: row.failed ?? row.failureCount ?? row.failedCount ?? 0,
    ts: row.createdAt || row.sentAt || row.ts || new Date().toISOString(),
  }));
  return {
    notifications,
    page: data?.number ?? 0,
    size: data?.size ?? notifications.length,
    totalElements: data?.totalElements ?? notifications.length,
    totalPages: data?.totalPages ?? 1,
  };
}

function adminMultipartFormData(payload = {}) {
  if (payload instanceof FormData) return payload;
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === "imageFile") {
      if (value instanceof File) fd.append("imageFile", value);
      return;
    }
    if (typeof value === "boolean") {
      fd.append(key, String(value));
      return;
    }
    fd.append(key, String(value));
  });
  return fd;
}

function incentivePayload(data = {}) {
  if (!data) return data;
  const serviceMode = data.service_mode || data.serviceMode;
  const incentiveDate = data.incentive_date || data.incentiveDate;
  const startTimeHhmm = data.start_time || data.startTimeHhmm;
  const endTimeHhmm = data.end_time || data.endTimeHhmm;
  const window = incentiveWindow(incentiveDate, startTimeHhmm, endTimeHhmm);
  const slabs = (data.slabs || []).map((slab) => ({
    requiredDeliveries: numberOrUndefined(slab.required_deliveries ?? slab.min_deliveries ?? slab.requiredDeliveries),
    bonusAmount: numberOrUndefined(slab.bonus ?? slab.bonusAmount),
  })).filter((slab) => slab.requiredDeliveries && slab.bonusAmount !== undefined);
  const firstSlab = slabs[0];
  const maxBonus = slabs.reduce((max, slab) => Math.max(max, Number(slab.bonusAmount || 0)), 0);

  return {
    incentiveType: data.incentiveType || data.incentive_type || "DAILY_DELIVERIES_SLOT",
    name: data.name,
    description: data.description,
    serviceMode: serviceMode === "ALL" ? undefined : serviceMode,
    incentiveDate,
    targetOnlineMinutes: numberOrUndefined(data.target_online_minutes ?? data.targetOnlineMinutes),
    daysOfWeek: data.days || data.daysOfWeek || [],
    startTimeHhmm,
    endTimeHhmm,
    validFrom: data.validFrom || window.validFrom,
    validTo: data.validTo || window.validTo,
    bonusAmount: numberOrUndefined(data.bonus_amount ?? data.bonusAmount) ?? maxBonus,
    minCompletedOrders: numberOrUndefined(data.min_completed_orders ?? data.minCompletedOrders) ?? firstSlab?.requiredDeliveries ?? 1,
    slabs,
    isActive: data.active ?? data.isActive,
  };
}

function incentiveWindow(date, startTime, endTime) {
  if (!date || !startTime || !endTime) return {};
  const start = new Date(`${date}T${startTime}:00`);
  const end = new Date(`${date}T${endTime}:00`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return {};
  if (end <= start) end.setDate(end.getDate() + 1);
  return {
    validFrom: start.toISOString(),
    validTo: end.toISOString(),
  };
}

function rangeToBackend(range) {
  if (range === "today") return "TODAY";
  if (range === "month") return "THIS_MONTH";
  return "THIS_WEEK";
}

function normalizeDashboardChart(points = []) {
  if (!Array.isArray(points)) return [];
  return points.map((p) => ({
    label: p.label ?? p.bucket ?? p.hour ?? "",
    value: Number(p.value ?? p.count ?? p.orderCount ?? 0),
  }));
}

function normalizeDashboardFeed(items = []) {
  if (!Array.isArray(items)) return [];
  return items.map((f) => ({
    ts: f.createdAt || f.ts || new Date().toISOString(),
    detail:
      f.detail ||
      `${f.displayOrderId || f.orderId || "Order"} is ${f.status || "updated"}`,
    actor: f.riderName || f.customerName || f.actor || "System",
    display_order_id: f.displayOrderId,
    status: f.status,
    amount: f.amount ?? f.totalAmount,
  }));
}

function normalizeDashboard(data = {}) {
  // Only treat as pre-normalized UI shape when kpis/health exist (not chart/feed arrays).
  if (data.kpis || data.health) {
    const kpis = data.kpis || {};
    const health = data.health || {};
    return {
      range: data.range,
      kpis: {
        total_orders: kpis.total_orders ?? kpis.totalOrders ?? 0,
        gross_revenue: kpis.gross_revenue ?? kpis.grossRevenue ?? 0,
        online_riders: kpis.online_riders ?? kpis.onlineRiders ?? 0,
        active_users: kpis.active_users ?? kpis.activeUsers ?? 0,
      },
      health: {
        avg_assignment_eta: health.avg_assignment_eta ?? health.avgAssignmentEta ?? "0 min",
        cancellation_rate: health.cancellation_rate ?? health.cancellationRate ?? 0,
        completion_rate: health.completion_rate ?? health.completionRate ?? 0,
        avg_order_value: health.avg_order_value ?? health.avgOrderValue ?? 0,
      },
      chart: normalizeDashboardChart(data.chart),
      feed: normalizeDashboardFeed(data.feed),
    };
  }

  // Live GET /admin/dashboard/summary — flat camelCase (zone_setup).
  return {
    range: data.range,
    kpis: {
      total_orders: data.totalOrders ?? data.total_orders ?? 0,
      gross_revenue: data.grossRevenue ?? data.gross_revenue ?? 0,
      online_riders: data.onlineRiders ?? data.online_riders ?? 0,
      active_users: data.activeUsers ?? data.active_users ?? 0,
    },
    health: {
      avg_assignment_eta: `${data.avgAssignmentEtaMinutes ?? data.avg_assignment_eta_minutes ?? 0} min`,
      cancellation_rate: data.cancellationRate ?? data.cancellation_rate ?? 0,
      completion_rate: data.completionRate ?? data.completion_rate ?? 0,
      avg_order_value: data.avgOrderValue ?? data.avg_order_value ?? 0,
    },
    chart: normalizeDashboardChart(data.chart),
    feed: normalizeDashboardFeed(data.feed),
  };
}

async function dashboardAdapter(config) {
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const range = rangeToBackend(config.params?.range);
  const [summary, chart, feed] = await Promise.all([
    instance.get("/admin/dashboard/summary", { headers, params: { range } }),
    instance.get("/admin/dashboard/order-volume", { headers, params: { range } }),
    instance.get("/admin/dashboard/live-activity", { headers, params: { limit: 10 } }),
  ]);

  const summaryData = summary.data?.data || {};
  const merged = {
    ...summaryData,
    range,
    chart: chart.data?.data || chart.data || [],
    feed: feed.data?.data || feed.data || [],
  };

  return normalizeAdminResponse({
    ...summary,
    config,
    data: { data: merged },
  });
}

async function riderDetailAdapter(config) {
  const originalUrl = config.adminUiUrl || config.url || "";
  const riderId = Number(originalUrl.match(/^\/riders\/(\d+)/)?.[1]);
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);

  const rider = await fetchAdminRiderDetail(instance, headers, riderId);
  const riderUi = rider || normalizeRiderUi({ id: riderId });

  if (originalUrl.endsWith("/orders")) {
    let orders = riderUi.recent_orders || [];
    if (!orders.length) {
      const raw = await fetchAdminRiderRaw(instance, headers, riderId);
      if (raw?.recentOrders?.length) {
        orders = mapRecentOrders(raw.recentOrders);
      } else {
        try {
          const ordersResponse = await instance.get("/admin/orders", { headers });
          orders = (ordersResponse.data?.data || [])
            .map(normalizeOrder)
            .filter((order) => [order.riderId, order.pickupRiderId, order.deliveryRiderId].includes(riderId))
            .map((order) => normalizeRiderOrder(order, riderId));
        } catch {
          orders = [];
        }
      }
    }
    return { config, data: { orders }, status: 200, statusText: "OK", headers: {}, request: null };
  }

  if (originalUrl.endsWith("/wallet")) {
    const txs = riderUi.recent_wallet_transactions || [];
    if (txs.length || riderUi.wallet_balance != null) {
      return { config, data: walletFromRider(riderUi), status: 200, statusText: "OK", headers: {}, request: null };
    }
    const codDetail = await safeGet(instance, `/admin/cod/riders/${riderId}`, headers, null);
    const detail = codDetail?.data?.data || {};
    return { config, data: normalizeRiderWallet(detail, riderUi), status: 200, statusText: "OK", headers: {}, request: null };
  }

  if (originalUrl.endsWith("/cod-deposits")) {
    const codDetail = await safeGet(instance, `/admin/cod/riders/${riderId}`, headers, null);
    const detail = codDetail?.data?.data || {};
    return { config, data: normalizeRiderCod(detail), status: 200, statusText: "OK", headers: {}, request: null };
  }

  if (originalUrl.endsWith("/performance")) {
    if (riderUi.performance) {
      return { config, data: riderUi.performance, status: 200, statusText: "OK", headers: {}, request: null };
    }
    const orders = riderUi.recent_orders || [];
    return { config, data: normalizeRiderPerformance(orders, riderUi), status: 200, statusText: "OK", headers: {}, request: null };
  }

  return { config, data: riderUi, status: 200, statusText: "OK", headers: {}, request: null };
}

async function userOrdersAdapter(config) {
  const originalUrl = config.adminUiUrl || config.url || "";
  const userId = Number(originalUrl.match(/^\/users\/(\d+)\/orders$/)?.[1]);
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const ordersResponse = await safeGet(
    instance,
    `/admin/orders/user/${userId}`,
    headers,
    { data: { data: [] } },
  );
  const raw = ordersResponse.data?.data ?? ordersResponse.data ?? [];
  const orders = (Array.isArray(raw) ? raw : []).map(normalizeOrder);
  return { config, data: { orders }, status: 200, statusText: "OK", headers: {}, request: null };
}

function userUpdatePayload(data = {}) {
  if (!data) return data;
  return {
    firstName: data.first_name ?? data.firstName,
    lastName: data.last_name ?? data.lastName,
    phoneNumber: data.phone ?? data.phoneNumber,
    active: data.active ?? data.isActive,
  };
}

async function transactionsAdapter(config) {
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const params = config.params || {};
  const [summaryResponse, listResponse] = await Promise.all([
    safeGet(instance, "/admin/transactions/summary", headers, { data: { data: {} } }),
    safeGet(instance, "/admin/transactions", headers, { data: { data: [] } }, {
      type: params.type,
      status: params.status,
      q: params.q,
    }),
  ]);

  return {
    config,
    data: normalizeTransactions({
      summary: summaryResponse.data?.data || {},
      items: listResponse.data?.data || [],
    }),
    status: 200,
    statusText: "OK",
    headers: {},
    request: null,
  };
}

async function pricingResolveAdapter(config) {
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const originHubId = Number(config.params?.origin_hub_id);
  const destinationHubId = Number(config.params?.destination_hub_id);
  const [hubRoutesResponse, zoneRoutesResponse, hubsResponse] = await Promise.all([
    safeGet(instance, "/admin/hub-routes", headers, { data: { data: [] } }),
    safeGet(instance, "/admin/zone-routes", headers, { data: { data: [] } }),
    safeGet(instance, "/admin/hubs", headers, { data: { data: [] } }),
  ]);
  const hubRoutes = (hubRoutesResponse.data?.data || []).map(normalizeHubRoute);
  const zoneRoutes = (zoneRoutesResponse.data?.data || []).map(normalizeZoneRoute);
  const hubs = (hubsResponse.data?.data || []).map(normalizeHubForUi);
  const originHub = hubs.find((hub) => Number(hub.id) === originHubId);
  const destinationHub = hubs.find((hub) => Number(hub.id) === destinationHubId);

  const hubRoute = hubRoutes.find((route) =>
    Number(route.origin_hub_id) === originHubId &&
    Number(route.destination_hub_id) === destinationHubId &&
    route.active
  );
  if (hubRoute) {
    return { config, data: { rate_per_km: hubRoute.rate_per_km, source: "hub_route" }, status: 200, statusText: "OK", headers: {}, request: null };
  }

  const zoneRoute = zoneRoutes.find((route) =>
    Number(route.origin_zone_id) === Number(originHub?.zone_id) &&
    Number(route.destination_zone_id) === Number(destinationHub?.zone_id) &&
    route.active
  );
  if (zoneRoute) {
    return { config, data: { rate_per_km: zoneRoute.rate_per_km, source: "zone_route" }, status: 200, statusText: "OK", headers: {}, request: null };
  }

  return { config, data: { rate_per_km: 9, source: "default" }, status: 200, statusText: "OK", headers: {}, request: null };
}

async function zoneDetailAdapter(config) {
  const id = Number((config.adminUiUrl || config.url || "").match(/^\/zones\/(\d+)$/)?.[1]);
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const response = await safeGet(instance, "/admin/zones", headers, { data: { data: [] } });
  const zone = (response.data?.data || []).map(normalizeZone).find((item) => Number(item.id) === id);
  return { config, data: zone || normalizeZone({ id }), status: 200, statusText: "OK", headers: {}, request: null };
}

async function hubDetailAdapter(config) {
  const id = Number((config.adminUiUrl || config.url || "").match(/^\/hubs\/(\d+)$/)?.[1]);
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const response = await safeGet(instance, "/admin/hubs", headers, { data: { data: [] } });
  const hub = (response.data?.data || []).map(normalizeHubForUi).find((item) => Number(item.id) === id);
  return { config, data: hub || normalizeHubForUi({ id }), status: 200, statusText: "OK", headers: {}, request: null };
}

async function auditLogsAdapter(config) {
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);
  const [notifications, transactions] = await Promise.all([
    safeGet(instance, "/admin/notifications/logs", headers, { data: { data: [] } }),
    safeGet(instance, "/admin/transactions", headers, { data: { data: [] } }),
  ]);
  const logs = [
    ...(notifications.data?.data || []).map((row) => ({
      id: `notification-${row.id || row.campaignId || Math.random()}`,
      actor: row.createdBy || "Admin",
      action_type: "NOTIFICATION_SENT",
      target: row.target || row.targetType || "Notification",
      detail: row.title || row.body || "Notification campaign",
      ts: row.createdAt || row.sentAt || new Date().toISOString(),
    })),
    ...(transactions.data?.data || []).slice(0, 20).map((row) => ({
      id: `transaction-${row.txnId || row.reference || Math.random()}`,
      actor: row.partyName || "System",
      action_type: "TRANSACTION",
      target: row.txnId || row.reference || row.sourceType || "Transaction",
      detail: `${row.sourceType || "Transaction"} ${row.status || ""}`.trim(),
      ts: row.createdAt || new Date().toISOString(),
    })),
  ];
  return { config, data: { logs }, status: 200, statusText: "OK", headers: {}, request: null };
}

async function noopAdapter(config) {
  return { config, data: {}, status: 200, statusText: "OK", headers: {}, request: null };
}

async function ridersListAdapter(config) {
  const instance = axios.create({ baseURL: API, timeout: config.timeout });
  const headers = adapterHeaders(config);

  // Fetch all riders regardless of availability — APPROVED (includes ONLINE/OFFLINE/BUSY) + PENDING.
  const [approvedRes, pendingRes] = await Promise.all([
    safeGet(instance, "/admin/riders", headers, { data: { data: [] } }, { status: "APPROVED" }),
    safeGet(instance, "/admin/riders/pending", headers, { data: { data: [] } }),
  ]);
  const merged = new Map();
  [...(approvedRes?.data?.data || []), ...(pendingRes?.data?.data || [])].forEach((r) => {
    if (r?.id != null) merged.set(Number(r.id), r);
  });
  const riders = Array.from(merged.values()).map((r) => normalizeRiderUi(r));
  return { config, data: { riders }, status: 200, statusText: "OK", headers: {}, request: null };
}

async function fetchAdminRiderRaw(instance, headers, riderId) {
  const [pendingRes, availableRes, approvedRes, rejectedRes, pendingStatusRes] = await Promise.all([
    safeGet(instance, "/admin/riders/pending", headers, { data: { data: [] } }),
    safeGet(instance, "/admin/riders/available", headers, { data: { data: [] } }),
    safeGet(instance, "/admin/riders", headers, { data: { data: [] } }, { status: "APPROVED" }),
    safeGet(instance, "/admin/riders", headers, { data: { data: [] } }, { status: "REJECTED" }),
    safeGet(instance, "/admin/riders", headers, { data: { data: [] } }, { status: "PENDING" }),
  ]);
  const pool = [
    ...(pendingRes?.data?.data || []),
    ...(availableRes?.data?.data || []),
    ...(approvedRes?.data?.data || []),
    ...(rejectedRes?.data?.data || []),
    ...(pendingStatusRes?.data?.data || []),
  ];
  return pool.find((item) => Number(item.id) === Number(riderId)) || null;
}

async function fetchAdminRiderDetail(instance, headers, riderId) {
  const raw = await fetchAdminRiderRaw(instance, headers, riderId);
  const codDetail = await safeGet(instance, `/admin/cod/riders/${riderId}`, headers, null);
  const summary = codDetail?.data?.data?.summary || {};

  if (!raw && !summary?.riderId) return null;

  const merged = {
    ...(raw || {}),
    id: raw?.id ?? summary.riderId ?? riderId,
    name: raw?.name ?? summary.riderName,
    phone: raw?.phone ?? summary.riderPhone,
    dispatchBlocked: summary.dispatchBlocked ?? raw?.dispatchBlocked,
    walletCodPendingAmount: summary.commissionPending ?? raw?.walletCodPendingAmount,
    codHandoverLimit: summary.handoverLimit ?? raw?.codHandoverLimit,
    walletCurrentBalance: raw?.walletCurrentBalance,
  };
  return normalizeRiderUi(merged);
}

async function fetchAdminRider(instance, headers, riderId) {
  return fetchAdminRiderDetail(instance, headers, riderId);
}

async function safeGet(instance, url, headers, fallback, params) {
  try {
    return await instance.get(url, { headers, params });
  } catch {
    return fallback;
  }
}

function normalizeReport(data = {}) {
  return {
    kpis: {
      total_revenue: data.totalRevenue ?? 0,
      rush_multiplier: data.rushMultiplier ?? 0,
      completion_rate: `${data.completionRate ?? 0}%`,
      avg_assignment_eta: `${data.avgAssignmentEtaMinutes ?? 0} min`,
    },
    chart: (data.trend || []).map((p) => ({ label: p.label, value: p.value ?? p.revenue ?? 0 })),
    top_sources: (data.topSources || []).map((s) => ({
      source: s.source,
      volume: s.volume ?? 0,
      revenue: s.revenue ?? 0,
      conversion: s.conversion ?? "—",
    })),
  };
}

function normalizeOrder(order = {}) {
  const paymentMode = order.paymentType || order.payment_mode || "PREPAID";
  const total = order.totalAmount ?? order.total ?? 0;
  return {
    ...order,
    tracking_id: order.displayOrderId || order.tracking_id || `YD-${order.id ?? ""}`,
    origin_city: order.originHubCity || order.pickupTag || order.origin_city || "Pickup",
    destination_city: order.destinationHubCity || order.dropTag || order.destination_city || "Drop",
    origin_hub_name: order.originHubName || order.origin_hub_name || null,
    destination_hub_name: order.destinationHubName || order.destination_hub_name || null,
    subtotal: order.subtotal ?? null,
    gst_amount: order.gstAmount ?? order.gst_amount ?? null,
    platform_fee: order.platformFee ?? order.platform_fee ?? null,
    total_amount: order.totalAmount ?? order.total_amount ?? total,
    delivery_type: order.deliveryType || order.delivery_type || "DOOR_TO_DOOR",
    payment_mode: paymentMode === "ONLINE" ? "PREPAID" : paymentMode,
    weight_kg: order.weight ?? order.weight_kg ?? 0,
    created_at: order.createdAt || order.created_at || new Date().toISOString(),
    distance_km: order.distanceKm ?? order.distance_km ?? 0,
    category: order.packageContents || order.category || "Parcel",
    fragile: order.isFragile ?? order.fragile ?? false,
    sender: {
      name: order.senderName || order.sender?.name || "Sender",
      phone: order.senderPhone || order.sender?.phone || "—",
      address: order.pickupAddress || order.sender?.address || "—",
    },
    receiver: {
      name: order.receiverName || order.receiver?.name || "Receiver",
      phone: order.receiverPhone || order.receiver?.phone || "—",
      address: order.dropAddress || order.receiver?.address || "—",
    },
    pickup_rider: order.pickupRiderId
      ? {
          id: order.pickupRiderId,
          name: order.pickupRiderName || order.riderName || "Pickup rider",
          phone: order.pickupRiderPhone || order.riderPhone || "—",
        }
      : null,
    delivery_rider: order.deliveryRiderId || order.riderId
      ? {
          id: order.deliveryRiderId || order.riderId,
          name: order.deliveryRiderName || order.riderName || "Delivery rider",
          phone: order.deliveryRiderPhone || order.riderPhone || "—",
        }
      : null,
    fare: {
      pickup_leg: order.pickupAmount ?? 0,
      corridor: order.hubToHubAmount ?? 0,
      drop_leg: order.lastMileAmount ?? 0,
      weight_surcharge: 0,
      subtotal: order.subtotal ?? total,
      platform_fee: order.platformFee ?? 0,
      gst: order.gstAmount ?? 0,
      total,
    },
    cod_already_collected: order.codAlreadyCollected ?? false,
    cod_mode: order.codCollectionMode,
    recommendation: recommendationFor(order.status),
    otp_pickup: order.pickupOtp || "—",
    otp_delivery: order.deliveryOtp || "—",
    otp_hub_drop: "—",
    otp_hub_collect: order.hubCollectionOtp || "—",
  };
}

function normalizeActivity(order = {}) {
  const events = order.timelineEvents || order.timeline || order.events || [];
  return events.map((event, index) => ({
    id: event.id ?? index,
    ts: event.createdAt || event.timestamp || event.ts || order.createdAt || new Date().toISOString(),
    event: humanizeEvent(event.title || event.eventType || event.status || event.event || "Update"),
    detail: event.description || event.message || event.note || event.detail || "",
    actor: event.actor || event.performedBy || event.createdBy || event.updatedBy || "System",
  }));
}

function humanizeEvent(value) {
  return String(value || "Update").replaceAll("_", " ");
}

function normalizeRider(rider = {}) {
  return normalizeRiderUi(rider);
}

function normalizeVehicle(vehicle = {}) {
  return {
    ...vehicle,
    image: vehicle.image || vehicle.imageUrl || "",
    base_fare: vehicle.baseFare ?? vehicle.base_fare ?? 0,
    per_km: vehicle.pricePerKm ?? vehicle.per_km ?? 0,
    min_distance: vehicle.minimumKm ?? vehicle.min_distance ?? 0,
    max_weight: vehicle.maxWeight ?? vehicle.max_weight ?? 0,
    active: vehicle.isActive ?? vehicle.active ?? true,
  };
}

function normalizeZone(zone = {}) {
  return {
    ...zone,
    city: zone.city || "—",
    status: zone.status || (zone.isActive === false ? "PAUSED" : "SERVING"),
    active: zone.isActive ?? zone.active ?? true,
    zoneType: zone.zoneType || zone.zone_type || "CIRCLE",
    centerLat: zone.centerLat ?? zone.center_lat,
    centerLng: zone.centerLng ?? zone.center_lng,
    radiusKm: zone.radiusKm ?? zone.radius_km,
    coordinates: zone.coordinates || [],
  };
}

function normalizeRiderOrder(order, riderId) {
  let riderRole = "assigned";
  if (Number(order.pickupRiderId) === Number(riderId)) riderRole = "pickup";
  if (Number(order.deliveryRiderId) === Number(riderId)) riderRole = "delivery";
  if (Number(order.riderId) === Number(riderId) && riderRole === "assigned") riderRole = "primary";

  return {
    ...order,
    rider_role: riderRole,
    fare_breakdown: order.fare || { total: 0 },
  };
}

function normalizeRiderWallet(detail = {}, riderUi = {}) {
  const summary = detail.summary || {};
  const openLines = detail.openLines || [];
  const codFallback = {
    balance: Number(riderUi.wallet_balance ?? 0),
    net_available: Number(riderUi.wallet_net_available ?? riderUi.wallet_balance ?? 0),
    total_earnings: Number(riderUi.wallet_total_earnings ?? 0),
    total_withdrawn: Number(riderUi.wallet_total_withdrawn ?? 0),
    withdrawal_pending: Number(riderUi.wallet_withdrawal_pending ?? 0),
    cod_pending: summary.commissionPending ?? riderUi.cod_pending ?? 0,
    cod_limit: summary.handoverLimit ?? riderUi.cod_limit ?? 0,
    blocked: summary.dispatchBlocked ?? riderUi.blocked ?? false,
    transactions: (riderUi.recent_wallet_transactions || []).length
      ? riderUi.recent_wallet_transactions
      : openLines.map((line) => ({
          id: line.orderId,
          type: "DEBIT",
          label: `COD commission pending for ${line.displayOrderId || line.orderId}`,
          amount: line.commissionAmount ?? 0,
          ts: line.deliveredAt || "",
        })),
  };
  return codFallback;
}

function normalizeRiderCod(detail = {}) {
  const deposits = (detail.recentDeposits || []).map((deposit) => ({
    id: deposit.depositId,
    ts: deposit.createdAt,
    amount: deposit.amount ?? 0,
    hub_id: deposit.hubId,
    note: deposit.note,
  }));
  return {
    deposits,
    total: deposits.reduce((sum, deposit) => sum + Number(deposit.amount || 0), 0),
  };
}

function normalizeRiderPerformance(orders, rider = {}) {
  const total = rider.total_orders_delivered ?? orders.length;
  const delivered = orders.filter((order) => order.status === "DELIVERED").length;
  const failed = orders.filter((order) => ["CANCELLED", "FAILED", "RETURNED"].includes(order.status)).length;
  const inProgress = Math.max(0, orders.length - delivered - failed);
  const totalEarnings = Number(
    rider.wallet_total_earnings ??
      orders
        .filter((order) => order.status === "DELIVERED")
        .reduce((sum, order) => sum + Number(order.earnedAmount ?? order.fare_breakdown?.total ?? 0), 0),
  );

  return {
    total_orders: total,
    delivered: rider.total_orders_delivered != null ? rider.total_orders_delivered : delivered,
    in_progress: inProgress,
    failed,
    completion_rate: orders.length ? Math.round((delivered / orders.length) * 100) : (total ? 100 : 0),
    on_time_rate: 0,
    rating: rider.rating ?? 0,
    total_earnings: Math.round(totalEarnings),
  };
}

function userDisplayStatus(user = {}) {
  const active = user.active ?? user.isActive;
  const profileCompleted = user.profileCompleted ?? user.profile_completed;
  if (active === false) return "INACTIVE";
  if (active && profileCompleted) return "ACTIVE";
  if (active && !profileCompleted) return "PENDING";
  return active ? "ACTIVE" : "INACTIVE";
}

function normalizeUser(user = {}) {
  const firstName = String(user.firstName ?? user.first_name ?? "").trim();
  const lastName = String(user.lastName ?? user.last_name ?? "").trim();
  const name = [firstName, lastName].filter(Boolean).join(" ") || user.name || "User";
  const status = userDisplayStatus(user);
  return {
    ...user,
    first_name: firstName,
    last_name: lastName,
    name,
    email: user.email ?? "",
    phone: user.phoneNumber || user.phone || "—",
    city: user.city || "—",
    total_orders: user.totalOrders ?? user.total_orders ?? 0,
    status,
    active: status !== "INACTIVE",
    profile_completed: Boolean(user.profileCompleted ?? user.profile_completed),
    wallet_balance: user.walletBalance ?? user.wallet_balance ?? 0,
  };
}

function normalizeHubForUi(hub = {}) {
  return {
    ...hub,
    lat: hub.lat ?? "—",
    lng: hub.lng ?? "—",
    hours: hub.hours || hub.intakeCutoff || "—",
    slots: hub.slots || [],
    status: hub.status || (hub.isActive === false ? "HUB_OFF" : "FULLY_OPERATIONAL"),
    zone_id: hub.zoneId || hub.zone_id,
  };
}

function normalizeCommissionConfig(config = {}) {
  return {
    online_pct: config.online_pct ?? config.onlineCommissionPercent ?? 15,
    cod_cash_pct: config.cod_cash_pct ?? config.codCashCommissionPercent ?? 12,
    cod_qr_pct: config.cod_qr_pct ?? config.codQrCommissionPercent ?? 10,
  };
}

function normalizePaymentConfig(config = {}) {
  return {
    cod_enabled: config.cod_enabled ?? config.codEnabled ?? true,
    online_enabled: config.online_enabled ?? config.onlineEnabled ?? true,
    default_method: config.default_method ?? config.defaultPaymentType ?? "ONLINE",
  };
}

function normalizeAppConfig(config = {}) {
  return {
    gstPercent: config.gstPercent ?? 0,
    incityPlatformFee: config.incityPlatformFee ?? config.platformFee ?? 0,
    outstationPlatformFee: config.outstationPlatformFee ?? config.platformFee ?? 0,
    pickupRatePerKm: config.pickupRatePerKm ?? 0,
    dropRatePerKm: config.dropRatePerKm ?? 0,
    perKgRate: config.perKgRate ?? 0,
    defaultRouteRatePerKm: config.defaultRouteRatePerKm ?? 0,
    codEnabled: config.codEnabled ?? true,
    onlineEnabled: config.onlineEnabled ?? true,
    defaultPaymentType: config.defaultPaymentType ?? "ONLINE",
    pickupLegTiers: (config.pickupLegTiers || []).map(normalizeTier),
    dropLegTiers: (config.dropLegTiers || []).map(normalizeTier),
    weightCostSlabs: (config.weightCostSlabs || []).map(normalizeWeightSlab),
  };
}

function normalizeTier(tier = {}) {
  return {
    id: tier.id,
    minWeightKg: tier.minWeightKg ?? 0,
    maxWeightKg: tier.maxWeightKg ?? 0,
    vehicleId: tier.vehicleId ?? null,
    vehicleName: tier.vehicleName ?? null,
    baseFare: tier.baseFare ?? 0,
    minimumKm: tier.minimumKm ?? 0,
    ratePerKm: tier.ratePerKm ?? 0,
    sortOrder: tier.sortOrder ?? 0,
    isActive: tier.isActive ?? true,
  };
}

function normalizeWeightSlab(slab = {}) {
  return {
    id: slab.id,
    minWeightKg: slab.minWeightKg ?? 0,
    maxWeightKg: slab.maxWeightKg ?? 0,
    flatCost: slab.flatCost ?? 0,
    sortOrder: slab.sortOrder ?? 0,
    isActive: slab.isActive ?? true,
  };
}

function normalizeAppVersion(config = {}) {
  return {
    user: {
      version_code: config.user?.version_code ?? config.userVersionCode ?? 0,
      play_store_url: config.user?.play_store_url ?? config.userPlayStoreUrl ?? "",
    },
    rider: {
      version_code: config.rider?.version_code ?? config.riderVersionCode ?? 0,
      play_store_url: config.rider?.play_store_url ?? config.riderPlayStoreUrl ?? "",
    },
  };
}

function normalizeCategory(category = {}) {
  return {
    ...category,
    sort_order: category.sort_order ?? category.sortOrder ?? 0,
    active: category.active ?? category.isActive ?? true,
  };
}

function normalizeCoupon(coupon = {}) {
  const maxRedemptions = coupon.maxRedemptionsTotal ?? coupon.max_redemptions ?? 0;
  return {
    ...coupon,
    discount_type: coupon.discount_type || coupon.discountType || "FLAT",
    discount_value: coupon.discount_value ?? coupon.discountValue ?? 0,
    max_discount: coupon.max_discount ?? coupon.maxDiscountAmount ?? 0,
    used: coupon.used ?? coupon.redemptionCount ?? 0,
    max_redemptions: maxRedemptions || 1,
    service_mode: coupon.service_mode || coupon.serviceMode || "INCITY",
    status: coupon.status || (coupon.active === false ? "PAUSED" : "ACTIVE"),
  };
}

function normalizeBanner(banner = {}) {
  return {
    ...banner,
    image: banner.image || banner.imageUrl || "",
    redirect_url: banner.redirect_url || banner.redirectUrl || "",
    start_date: banner.start_date || banner.startsAt || "",
    end_date: banner.end_date || banner.endsAt || "",
    status: banner.status || (banner.isActive === false ? "PAUSED" : "ACTIVE"),
  };
}

function filterOrders(orders, params = {}) {
  return orders.filter((order) => {
    if (params.service_mode && order.serviceMode && order.serviceMode !== params.service_mode) return false;
    if (params.status && order.status !== params.status) return false;
    if (params.payment && order.payment_mode !== params.payment) return false;
    if (params.assigned === "yes" && !order.riderId && !order.pickupRiderId && !order.deliveryRiderId) return false;
    if (params.assigned === "no" && (order.riderId || order.pickupRiderId || order.deliveryRiderId)) return false;
    if (params.q) {
      const q = String(params.q).toLowerCase();
      return [order.tracking_id, order.sender?.name, order.receiver?.name, order.sender?.phone, order.receiver?.phone]
        .some((value) => String(value || "").toLowerCase().includes(q));
    }
    return true;
  });
}

function routesFromOrders(orders) {
  const routes = new Map();
  orders.forEach((order) => {
    const key = `${order.origin_city}-${order.destination_city}`;
    routes.set(key, { key, label: `${order.origin_city} → ${order.destination_city}` });
  });
  return Array.from(routes.values());
}

function groupOrders(orders) {
  const byStatus = new Map();
  orders.forEach((order) => {
    if (!byStatus.has(order.status)) byStatus.set(order.status, new Map());
    const route = `${order.origin_city} → ${order.destination_city}`;
    const routeMap = byStatus.get(order.status);
    if (!routeMap.has(route)) routeMap.set(route, { route, count: 0, order_ids: [], orders: [] });
    const row = routeMap.get(route);
    row.count += 1;
    row.order_ids.push(order.id);
    row.orders.push(order);
  });

  return Array.from(byStatus.entries()).map(([status, routeMap]) => ({
    status,
    total: Array.from(routeMap.values()).reduce((sum, route) => sum + route.count, 0),
    routes: Array.from(routeMap.values()),
  }));
}

function normalizeTransactions(data = {}) {
  if (Array.isArray(data)) {
    return {
      transactions: data.map(normalizeTransactionItem),
      summary: { total: 0, payouts: 0, pg: 0 },
    };
  }
  const summary = data.summary || data;
  const items = Array.isArray(data.transactions) ? data.transactions : data.items || [];
  return {
    transactions: items.map(normalizeTransactionItem),
    summary: {
      total: summary.total ?? summary.totalVolume ?? 0,
      payouts: summary.payouts ?? summary.activePayoutAmount ?? 0,
      pg: summary.pg ?? summary.paymentGatewayVolume ?? 0,
    },
  };
}

function normalizeTransactionItem(item = {}) {
  return {
    ...item,
    id: item.id || item.txnId || item.reference,
    txn_id: item.txn_id || item.txnId || item.reference || "—",
    party: item.party || item.partyName || `${item.partyType || "Party"} ${item.partyId || ""}`.trim(),
    type: item.type || item.sourceType || "—",
    method: item.method || "—",
    status: item.status || "—",
    amount: item.amount ?? 0,
    source: item.source || item.reference || item.sourceId || "—",
    ts: item.ts || item.createdAt || new Date().toISOString(),
  };
}

function normalizeWithdrawal(row = {}) {
  const accountNumber = row.accountNumber || row.bankAccountNumber || row.bank_account_number || "";
  return {
    ...row,
    rider_id: row.riderId ?? row.rider_id,
    rider_name: row.riderName || row.rider_name || row.rider?.name || "Rider",
    account_holder_name: row.accountHolderName || row.account_holder_name || row.bankAccountName || "—",
    account_number: accountNumber,
    ifsc: row.ifsc || row.bankIfsc || row.bank_ifsc || "—",
    bank_account_masked: row.bankAccountMasked || row.bank_account_masked || maskAccount(accountNumber),
    requested_at: row.requestedAt || row.createdAt || row.requested_at || new Date().toISOString(),
    status: row.status || "PENDING",
  };
}

function maskAccount(accountNumber) {
  if (!accountNumber) return "—";
  const text = String(accountNumber);
  if (text.length <= 4) return text;
  return `${"*".repeat(Math.max(0, text.length - 4))}${text.slice(-4)}`;
}

function normalizeIncentive(row = {}) {
  const slabs = row.slabs || [];
  return {
    ...row,
    incentive_type: row.incentiveType || row.incentive_type || "DAILY_DELIVERIES_SLOT",
    service_mode: row.serviceMode || row.service_mode || "INCITY",
    days: row.days || row.daysOfWeek || [],
    slabs: slabs.map((slab) => ({
      ...slab,
      min_deliveries: slab.min_deliveries ?? slab.requiredDeliveries ?? 0,
      bonus: slab.bonus ?? slab.bonusAmount ?? 0,
    })),
    active: row.active ?? row.isActive ?? true,
  };
}

function normalizeZoneRoute(row = {}) {
  return {
    ...row,
    origin_zone_id: row.originZoneId ?? row.origin_zone_id,
    destination_zone_id: row.destinationZoneId ?? row.destination_zone_id,
    origin: row.origin || row.originZoneName || row.originCity || `Zone #${row.originZoneId ?? "—"}`,
    destination: row.destination || row.destinationZoneName || row.destinationCity || `Zone #${row.destinationZoneId ?? "—"}`,
    rate_per_km: row.ratePerKm ?? row.rate_per_km ?? 0,
    active: row.active ?? row.isActive ?? true,
  };
}

function normalizeHubRoute(row = {}) {
  return {
    ...row,
    origin_hub_id: row.originHubId ?? row.origin_hub_id,
    destination_hub_id: row.destinationHubId ?? row.destination_hub_id,
    origin_hub_name: row.originHubName || row.origin_hub_name || `Hub #${row.originHubId ?? "—"}`,
    destination_hub_name: row.destinationHubName || row.destination_hub_name || `Hub #${row.destinationHubId ?? "—"}`,
    origin_city: row.originCity || row.origin_city || "—",
    destination_city: row.destinationCity || row.destination_city || "—",
    rate_per_km: row.ratePerKm ?? row.rate_per_km ?? 0,
    active: row.active ?? row.isActive ?? true,
  };
}

function recommendationFor(status) {
  return {
    title: status ? status.replaceAll("_", " ") : "Review order",
    detail: "Check the order details and choose the next valid admin action.",
  };
}

function normalizeEarnings(data = {}) {
  return {
    range: data.range ?? "",
    orderCount: data.orderCount ?? 0,
    totalRevenue: data.totalRevenue ?? 0,
    totalCommission: data.totalCommission ?? 0,
    totalGst: data.totalGst ?? 0,
    totalPlatformFee: data.totalPlatformFee ?? 0,
    totalPlatformNet: data.totalPlatformNet ?? 0,
    totalRiderPayouts: data.totalRiderPayouts ?? 0,
    orders: Array.isArray(data.orders) ? data.orders : [],
  };
}

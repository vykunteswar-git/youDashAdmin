import axios from "axios";

const API_BASE_URL =
  (typeof import.meta !== "undefined" &&
    import.meta.env?.VITE_API_BASE_URL &&
    String(import.meta.env.VITE_API_BASE_URL).trim()) ||
  "https://youdashexpress.com";

const api = axios.create({
  baseURL: API_BASE_URL,
});

/** JWT from login — must match what Login.jsx persists after /admin/login */
function getStoredAuthToken() {
  const t = localStorage.getItem("token")?.trim();
  if (t) return t;
  const alt = localStorage.getItem("accessToken")?.trim();
  return alt || null;
}

api.interceptors.request.use((config) => {
  const token = getStoredAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let authRedirectScheduled = false;
let authFailureCount = 0;
let authFailureWindowStartedAt = 0;

const AUTH_FAILURE_WINDOW_MS = 15000;
const AUTH_FAILURE_THRESHOLD = 3;

function resetAuthFailureWindow() {
  authFailureCount = 0;
  authFailureWindowStartedAt = 0;
}

function noteAuthFailure() {
  const now = Date.now();
  if (
    authFailureWindowStartedAt === 0 ||
    now - authFailureWindowStartedAt > AUTH_FAILURE_WINDOW_MS
  ) {
    authFailureWindowStartedAt = now;
    authFailureCount = 1;
    return authFailureCount;
  }
  authFailureCount += 1;
  return authFailureCount;
}

function isTokenClearlyInvalid(error) {
  const body = error?.response?.data;
  const message = [
    typeof body === "string" ? body : "",
    body?.message,
    body?.error,
    body?.detail,
  ]
    .filter((x) => typeof x === "string")
    .join(" ")
    .toLowerCase();

  // Detect explicit token failures; avoid logging out for generic endpoint issues.
  return (
    message.includes("token expired") ||
    message.includes("expired token") ||
    message.includes("invalid token") ||
    message.includes("jwt expired") ||
    message.includes("signature") ||
    message.includes("unauthorized")
  );
}

function scheduleAuthRedirect() {
  if (typeof window === "undefined") return;
  if (authRedirectScheduled || window.location.pathname.endsWith("/login")) return;
  authRedirectScheduled = true;
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("adminAuthenticated");
  window.location.replace("/login");
}

api.interceptors.response.use(
  (res) => {
    // Any successful call means current auth is likely healthy.
    resetAuthFailureWindow();
    return res;
  },
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    if (
      (status === 401 || status === 403) &&
      !url.includes("/admin/login") &&
      typeof window !== "undefined"
    ) {
      const hasToken = Boolean(getStoredAuthToken());
      if (!hasToken) {
        scheduleAuthRedirect();
        return Promise.reject(error);
      }

      const failuresInWindow = noteAuthFailure();
      if (
        isTokenClearlyInvalid(error) ||
        failuresInWindow >= AUTH_FAILURE_THRESHOLD
      ) {
        scheduleAuthRedirect();
      }
    }
    return Promise.reject(error);
  }
);

/** Message from Spring ApiResponse-style body */
export function readApiMessage(data) {
  if (!data || typeof data !== "object") return "";
  const m = data.message;
  return typeof m === "string" && m.trim() ? m.trim() : "";
}

export function isApiFailureBody(data) {
  return Boolean(data && typeof data === "object" && data.success === false);
}

export function getAxiosErrorMessage(error, fallback = "Request failed.") {
  const d = error?.response?.data;
  if (typeof d === "string" && d.trim()) return d.trim();
  if (d && typeof d === "object") {
    const fromApi = readApiMessage(d);
    if (fromApi) return fromApi;
    return (
      d.error ??
      d.detail ??
      (Array.isArray(d.errors) ? d.errors.join(", ") : null) ??
      error?.message ??
      fallback
    );
  }
  return error?.message || fallback;
}

/** 403 → fixed copy; otherwise ApiResponse message or fallback */
export function getAdminHttpErrorMessage(error, fallback = "Request failed.") {
  const status = error?.response?.status;
  if (status === 403) return "Admin only";
  return getAxiosErrorMessage(error, fallback);
}

/** Spring may return a bare array or { data: [...] } */
export function unwrapList(res) {
  const d = res?.data;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  return [];
}

/** Single entity: body or body.data */
export function unwrapEntity(res) {
  const d = res?.data;
  if (d && typeof d === "object" && "data" in d && d.data !== undefined) return d.data;
  return d;
}

function unwrapDataOr(res, fallback) {
  const d = res?.data;
  if (d && typeof d === "object" && "data" in d && d.data !== undefined) {
    return d.data ?? fallback;
  }
  return d ?? fallback;
}

export const authService = {
  login: ({ email, password }) =>
    api.post("/admin/login", { email, password }),
};

export const userService = {
  getUsers: () => api.get("/admin/users"),
  hardDeleteUser: (id) =>
    api.delete(`/admin/users/${encodeURIComponent(String(id))}/hard-delete`),
};

export const vehicleService = {
  getVehicles: () => api.get("/admin/vehicles"),
  createVehicle: (payload) => api.post("/admin/vehicles", payload),
  updateVehicle: (id, payload) =>
    api.put(`/admin/vehicles/${encodeURIComponent(String(id))}`, payload),
};

export const appConfigService = {
  getConfig: () => api.get("/admin/config"),
  updateConfig: (payload) => api.put("/admin/config", payload),
};

export const appVersionService = {
  getConfig: () => api.get("/admin/app-version"),
  updateConfig: (payload) => api.put("/admin/app-version", payload),
};

export const zoneService = {
  list: () => api.get("/admin/zones"),
  create: (payload) => api.post("/admin/zones", payload),
  update: (id, payload) =>
    api.put(`/admin/zones/${encodeURIComponent(String(id))}`, payload),
};

export const hubService = {
  list: () => api.get("/admin/hubs"),
  create: (payload) => api.post("/admin/hubs", payload),
  update: (id, payload) =>
    api.put(`/admin/hubs/${encodeURIComponent(String(id))}`, payload),
};

export const hubRouteService = {
  list: () => api.get("/admin/hub-routes"),
  create: (payload) => api.post("/admin/hub-routes", payload),
  update: (id, payload) =>
    api.put(`/admin/hub-routes/${encodeURIComponent(String(id))}`, payload),
};

/** HubRouteSLARequestDTO — hubRouteId, deliveryType NEXT_DAY | HOURS, priority, isActive, etc. */
export const hubRouteSlaService = {
  list: (hubRouteId) =>
    api.get("/admin/hub-route-sla", {
      params: { hubRouteId },
    }),
  create: (payload) => api.post("/admin/hub-route-sla", payload),
  update: (id, payload) =>
    api.put(`/admin/hub-route-sla/${encodeURIComponent(String(id))}`, payload),
};

/** PackageCategoryRequestDTO: name, emoji (required on create; optional on update = unchanged), sortOrder?, isActive? */
export const packageCategoryService = {
  list: () => api.get("/admin/package-categories"),
  create: (payload) => api.post("/admin/package-categories", payload),
  update: (id, payload) =>
    api.put(
      `/admin/package-categories/${encodeURIComponent(String(id))}`,
      payload
    ),
  remove: (id) =>
    api.delete(`/admin/package-categories/${encodeURIComponent(String(id))}`),
};

const orderPath = (orderId) =>
  `/admin/orders/${encodeURIComponent(String(orderId))}`;

export const orderService = {
  listOrders: () => api.get("/admin/orders"),
  getOrder: (id) => api.get(orderPath(id)),
  assignRider: (orderId, rider) =>
    api.post(
      `${orderPath(orderId)}/assign-rider`,
      typeof rider === "object" ? rider : { riderId: rider }
    ),
  updateStatus: (orderId, payload) =>
    api.post(`${orderPath(orderId)}/update-status`, payload),
  notifyUser: (orderId, payload) =>
    api.post(`${orderPath(orderId)}/notify-user`, payload),
};

export const riderService = {
  getPendingRiders: () => api.get("/admin/riders/pending"),
  listByStatus: (status) =>
    api.get("/admin/riders", {
      params: status ? { status } : undefined,
    }),
  getAvailableRiders: () => api.get("/admin/riders/available"),
  getEligibleRidersForOrder: (orderId) =>
    api.get(`/admin/riders/eligible-for-order/${encodeURIComponent(String(orderId))}`),
  approveRider: (id) =>
    api.post(`/admin/riders/${encodeURIComponent(String(id))}/approve`),
  rejectRider: (id) =>
    api.post(`/admin/riders/${encodeURIComponent(String(id))}/reject`),
};

/** TestPushRequestDTO: token; optional title, body, type, data (map string → string) */
export const notificationAdminService = {
  listFcmTargets: () => api.get("/admin/fcm-test/targets"),
  sendFcmTest: (payload) => api.post("/admin/fcm-test/send", payload),
  testPush: (payload) => api.post("/admin/notifications/test", payload),
  sendBroadcast: (payload) => api.post("/admin/notifications/broadcast", payload),
  sendNotificationBroadcast: (payload) =>
    api.post("/admin/notifications/broadcast", payload),
  getNotificationTargets: async (params = {}) => {
    const q = typeof params?.q === "string" ? params.q : undefined;
    const rawLimit = Number(params?.limit);
    const limit = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(100, Math.trunc(rawLimit)))
      : 20;
    const res = await api.get("/admin/notifications/targets", {
      params: {
        ...(q ? { q } : {}),
        limit,
      },
    });
    return unwrapDataOr(res, {
      cities: [],
      zones: [],
      users: [],
      riders: [],
    });
  },
  getNotificationLogs: async (params = {}) => {
    const rawPage = Number(params?.page);
    const rawSize = Number(params?.size);
    const page = Number.isFinite(rawPage) ? Math.max(0, Math.trunc(rawPage)) : 0;
    const size = Number.isFinite(rawSize)
      ? Math.max(1, Math.min(100, Math.trunc(rawSize)))
      : 20;
    const res = await api.get("/admin/notifications/logs", {
      params: { page, size },
    });
    return unwrapDataOr(res, {
      content: [],
      number: page,
      size,
      totalElements: 0,
      totalPages: 0,
    });
  },
  getNotificationLogsPaged: async (params = {}) =>
    notificationAdminService.getNotificationLogs(params),
};

/** RiderCommissionConfigDTO — GET returns ApiResponse wrapper */
export const commissionService = {
  getConfig: () => api.get("/admin/commission/config"),
  saveConfig: (payload) => api.post("/admin/commission/config", payload),
};

/** COD commission handover (bulk deposit by rider) */
export const codHandoverService = {
  listRiders: (params = {}) =>
    api.get("/admin/cod/riders", {
      params: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.search ? { search: params.search } : {}),
      },
    }),
  getRiderDetail: (riderId) => api.get(`/admin/cod/riders/${riderId}`),
  confirmDeposit: (payload) => api.post("/admin/cod/deposit", payload),
  updateHandoverLimit: (riderId, codHandoverLimit) =>
    api.patch(`/admin/cod/riders/${riderId}/handover-limit`, { codHandoverLimit }),
};

/** AdminCodSettleRequestDTO; rider withdrawal approval */
export const walletAdminService = {
  codSettle: (payload) => api.post("/admin/cod/settle", payload),
  listWithdrawals: (status, page = 0, size = 50) =>
    api.get("/admin/withdraw/requests", {
      params: {
        ...(status ? { status } : {}),
        page,
        size,
      },
    }),
  approveWithdrawal: (withdrawalId) =>
    api.post("/admin/withdraw/approve", {
      withdrawalId,
      approve: true,
    }),
  rejectWithdrawal: (withdrawalId) =>
    api.post("/admin/withdraw/reject", { withdrawalId }),
};

/** Admin coupon DTO: code, title, description, discountType PERCENT|FLAT, discountValue, optional caps & ISO validFrom/validTo, serviceMode, active */
export const couponAdminService = {
  list: () => api.get("/admin/coupons"),
  create: (payload) => api.post("/admin/coupons", payload),
  update: (id, payload) =>
    api.put(
      `/admin/coupons/${encodeURIComponent(String(id))}`,
      payload
    ),
};

/** Admin banner DTO: id, title, subtitle, imageUrl, redirectUrl, sortOrder, isActive, startsAt, endsAt */
function buildBannerFormData(payload = {}) {
  if (payload instanceof FormData) return payload;
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value == null) return;
    if (key === "imageFile") {
      if (value instanceof File) fd.append("imageFile", value);
      return;
    }
    fd.append(key, String(value));
  });
  return fd;
}

export const bannerAdminService = {
  list: () => api.get("/admin/banners"),
  create: (payload) => api.post("/admin/banners", buildBannerFormData(payload)),
  update: (id, payload) =>
    api.put(
      `/admin/banners/${encodeURIComponent(String(id))}`,
      buildBannerFormData(payload)
    ),
  remove: (id) => api.delete(`/admin/banners/${encodeURIComponent(String(id))}`),
};

/**
 * @typedef {Object} AdminTransactionSummaryDTO
 * @property {string=} from
 * @property {string=} to
 * @property {number=} totalVolume
 * @property {number=} activePayoutAmount
 * @property {number=} paymentGatewayVolume
 * @property {number=} totalTransactions
 */

/**
 * @typedef {Object} AdminTransactionItemDTO
 * @property {string} txnId
 * @property {"ORDER_PAY"|"PAYOUT"|string} sourceType
 * @property {string|number=} sourceId
 * @property {"USER"|"RIDER"|string=} partyType
 * @property {string|number=} partyId
 * @property {string=} partyName
 * @property {string=} method
 * @property {string=} status
 * @property {number=} amount
 * @property {string=} createdAt
 * @property {string=} reference
 */

export const transactionAdminService = {
  getSummary: (params) => api.get("/admin/transactions/summary", { params }),
  list: (params) => api.get("/admin/transactions", { params }),
};

/**
 * @typedef {Object} PeakCampaignDTO
 * @property {number|string=} id
 * @property {string} name
 * @property {string=} description
 * @property {"INCITY"|"OUTSTATION"|null=} serviceMode
 * @property {number} bonusAmount
 * @property {number} minCompletedOrders
 * @property {boolean} isActive
 * @property {string} validFrom
 * @property {string} validTo
 * @property {string[]=} daysOfWeek
 * @property {string} startTimeHhmm
 * @property {string} endTimeHhmm
 */
export const incentiveAdminService = {
  listPeakCampaigns: () => api.get("/admin/incentives/peak-campaigns"),
  createPeakCampaign: (payload) =>
    api.post("/admin/incentives/peak-campaigns", payload),
  updatePeakCampaign: (id, payload) =>
    api.put(
      `/admin/incentives/peak-campaigns/${encodeURIComponent(String(id))}`,
      payload
    ),
  deletePeakCampaign: (id) =>
    api.delete(`/admin/incentives/peak-campaigns/${encodeURIComponent(String(id))}`),
};

export const analyticsService = {
  getDashboardSummary: async (range) => {
    const res = await api.get("/admin/dashboard/summary", {
      params: { range },
    });
    return unwrapDataOr(res, {});
  },
  getDashboardOrderVolume: async (range) => {
    const res = await api.get("/admin/dashboard/order-volume", {
      params: { range },
    });
    return unwrapDataOr(res, []);
  },
  getDashboardLiveActivity: async (limit = 10) => {
    const res = await api.get("/admin/dashboard/live-activity", {
      params: { limit },
    });
    return unwrapDataOr(res, []);
  },
  getRevenueReport: async (range) => {
    const res = await api.get("/admin/reports/revenue", {
      params: { range },
    });
    return unwrapDataOr(res, {
      totalRevenue: 0,
      rushMultiplier: 0,
      completionRate: 0,
      avgAssignmentEtaMinutes: 0,
      trend: [],
      topSources: [],
    });
  },
};

export default api;

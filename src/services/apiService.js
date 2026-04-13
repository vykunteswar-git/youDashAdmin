import axios from "axios";

const API_BASE_URL = "http://192.168.31.54:8080"; // Change this to your backend URL

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

export const authService = {
  login: ({ email, password }) =>
    api.post("/admin/login", { email, password }),
};

export const userService = {
  getUsers: () => api.get("/admin/users"),
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
  assignRider: (orderId, riderId) =>
    api.post(`${orderPath(orderId)}/assign-rider`, { riderId }),
  updateStatus: (orderId, payload) =>
    api.post(`${orderPath(orderId)}/update-status`, payload),
};

export const riderService = {
  getPendingRiders: () => api.get("/admin/riders/pending"),
  getAvailableRiders: () => api.post("/admin/riders/available"),
  approveRider: (id) =>
    api.post(`/admin/riders/${encodeURIComponent(String(id))}/approve`),
  rejectRider: (id) =>
    api.post(`/admin/riders/${encodeURIComponent(String(id))}/reject`),
};

export default api;

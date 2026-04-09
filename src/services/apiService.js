import axios from "axios";

const API_BASE_URL = "http://10.238.191.72:8080"; // Change this to your backend URL

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  login: ({ email, password }) =>
    api.post("/admin/login", { email, password }),
};

export const userService = {
  getUsers: () => api.get("/users"),
};

export const orderService = {
  getOrders: () => api.get("/orders"),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  assignRider: (id, riderId) =>
    api.post(`/orders/${id}/assign-rider`, { riderId }),
};

export const riderService = {
  getRiders: () => api.get("/riders"),
  addRider: (rider) => api.post("/riders", rider),
  toggleAvailability: (id, available) =>
    api.put(`/riders/${id}/availability`, { available }),
};

export const paymentService = {
  getPayments: () => api.get("/payments"),
};

export const vehicleService = {
  getVehicles: () => api.get("/admin/vehicles"),
  createVehicle: (payload) => api.post("/admin/vehicles", payload),
  updateVehicle: (id, payload) => api.put(`/admin/vehicles/${id}`, payload),
};

export const categoryService = {
  getCategories: () => api.get("/admin/categories"),
  createCategory: (payload) => api.post("/admin/categories", payload),
  updateCategory: (id, payload) => api.put(`/admin/categories/${id}`, payload),
};

export default api;

import axios from "axios";

const API_BASE_URL = "http://localhost:8080/api"; // Change this to your backend URL

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
  login: (credentials) => api.post("/auth/login", credentials),
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

export default api;

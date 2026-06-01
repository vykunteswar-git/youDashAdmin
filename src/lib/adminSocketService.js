import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client/dist/sockjs";
import { getAuthToken } from "@/lib/auth";

// In dev, Vite proxies `/ws` to the backend. In prod, fall back to the configured backend origin.
const BACKEND_ORIGIN =
  (import.meta.env.VITE_BACKEND_URL && String(import.meta.env.VITE_BACKEND_URL).trim()) ||
  "https://youdashexpress.com";

const WS_URL = import.meta.env.DEV
  ? `${window.location.origin}/ws`
  : `${BACKEND_ORIGIN.replace(/\/+$/, "")}/ws`;

const ADMIN_ORDERS_TOPIC = "/topic/admin/orders";

class AdminSocketService {
  client = null;
  listeners = new Set();
  connected = false;
  reconnectDelay = 5000;

  ensureConnected() {
    const token = getAuthToken();
    if (!token) return;
    if (this.client?.active || this.connected) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: this.reconnectDelay,
      debug: () => {},
      onConnect: () => {
        this.connected = true;
        this.client?.subscribe(ADMIN_ORDERS_TOPIC, (frame) => {
          const payload = this._safeParse(frame.body);
          for (const listener of this.listeners) {
            listener(payload);
          }
        });
      },
      onStompError: () => {
        this.connected = false;
      },
      onWebSocketClose: () => {
        this.connected = false;
      },
    });
    this.client.activate();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    this.ensureConnected();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  disconnect() {
    this.connected = false;
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
  }

  _safeParse(raw) {
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
}

export const adminSocketService = new AdminSocketService();

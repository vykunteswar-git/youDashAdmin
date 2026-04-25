import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Search,
  RefreshCw,
  Package,
  MapPin,
  X,
  User,
  Truck,
  CreditCard,
  Clock,
  ChevronRight,
  Navigation,
} from "lucide-react";
import {
  orderService,
  riderService,
  unwrapList,
  unwrapEntity,
} from "../services/apiService";
import { adminSocketService } from "../services/adminSocketService";

const ORDER_STATUSES = [
  "PENDING",
  "PENDING_ASSIGNMENT",
  "ASSIGNED",
  "CREATED",
  "CONFIRMED",
  "PICKED_UP",
  "AT_ORIGIN_HUB",
  "DEPARTED_ORIGIN_HUB",
  "IN_TRANSIT",
  "AT_DESTINATION_HUB",
  "SORTED_AT_DESTINATION",
  "OUT_FOR_DELIVERY",
  "READY_FOR_PICKUP",
  "DELIVERED",
  "FAILED_DELIVERY",
  "RETURNED",
  "CANCELLED",
];
const STATUS_UPDATE_MAP = {
  PENDING: "CREATED",
  PENDING_ASSIGNMENT: "CREATED",
  ASSIGNED: "CONFIRMED",
};
const SERVICE_MODE_TABS = ["INCITY", "OUTSTATION"];

function formatWhen(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleString();
  } catch {
    return String(iso);
  }
}

function statusBadgeClass(status) {
  const s = String(status || "").toUpperCase();
  if (s === "DELIVERED") return "active";
  if (s === "CANCELLED") return "cancelled";
  if (s === "ASSIGNED" || s === "CONFIRMED") return "active";
  if (s === "CREATED" || s === "PENDING" || s === "PENDING_ASSIGNMENT")
    return "pending";
  if (s === "FAILED_DELIVERY" || s === "RETURNED") return "cancelled";
  return "info";
}

const Orders = () => {
  const [search, setSearch] = useState("");
  const [serviceModeTab, setServiceModeTab] = useState("INCITY");
  const [statusTab, setStatusTab] = useState("All");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);

  const [availableRiders, setAvailableRiders] = useState([]);
  const [riderPick, setRiderPick] = useState("");
  const [assignRolePick, setAssignRolePick] = useState("DELIVERY");
  const [statusPick, setStatusPick] = useState("CONFIRMED");
  const knownOutstationPendingIdsRef = useRef(new Set());
  const outstationAlertInitializedRef = useRef(false);
  const [outstationAlertOrder, setOutstationAlertOrder] = useState(null);
  const [realtimeOrderAlert, setRealtimeOrderAlert] = useState(null);
  const [apiNotice, setApiNotice] = useState(null);

  const setApiError = useCallback((message) => {
    setApiNotice({ type: "error", text: message || "Something went wrong." });
  }, []);

  const setApiSuccess = useCallback((message) => {
    setApiNotice({ type: "success", text: message || "Done." });
  }, []);

  const playOutstationAlert = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 700);
    } catch {
      // no-op: sound is best-effort only
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await orderService.listOrders();
      const list = unwrapList(res);
      setOrders(list);
      const pendingOutstationIds = new Set(
        list
          .filter((o) => String(o?.serviceMode || "").toUpperCase() === "OUTSTATION")
          .filter((o) =>
            ["CREATED", "PENDING", "PENDING_ASSIGNMENT"].includes(
              String(o?.status || "").toUpperCase()
            )
          )
          .filter((o) => o?.riderId == null)
          .map((o) => String(o.id ?? o.orderId))
          .filter(Boolean)
      );
      if (outstationAlertInitializedRef.current) {
        let hasNew = false;
        let newestOrder = null;
        for (const id of pendingOutstationIds) {
          if (!knownOutstationPendingIdsRef.current.has(id)) {
            hasNew = true;
            newestOrder =
              list.find((o) => String(o?.id ?? o?.orderId) === id) || null;
            break;
          }
        }
        if (hasNew) {
          playOutstationAlert();
          setOutstationAlertOrder(newestOrder);
        }
      } else {
        outstationAlertInitializedRef.current = true;
      }
      knownOutstationPendingIdsRef.current = pendingOutstationIds;
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || "Failed to load orders.";
      setError(msg);
      setApiError(msg);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [playOutstationAlert, setApiError]);

  const loadRiders = useCallback(async () => {
    try {
      const res = await riderService.getAvailableRiders();
      setAvailableRiders(unwrapList(res));
    } catch {
      setAvailableRiders([]);
    }
  }, []);

  const loadEligibleRidersForOrder = useCallback(async (order) => {
    const id = order?.id ?? order?.orderId;
    if (id == null) {
      setAvailableRiders([]);
      return;
    }
    try {
      const res = await riderService.getEligibleRidersForOrder(id);
      setAvailableRiders(unwrapList(res));
    } catch {
      setAvailableRiders([]);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadRiders();
  }, [loadOrders, loadRiders]);

  useEffect(() => {
    const unsubscribe = adminSocketService.subscribe((evt) => {
      if (!evt || !evt.orderId) return;
      loadOrders();
      const eventType = String(evt.eventType || evt.event || "")
        .toLowerCase()
        .trim();
      if (eventType === "order_created") {
        playOutstationAlert();
        setRealtimeOrderAlert({
          id: evt.orderId,
          serviceMode: evt.serviceMode,
          status: evt.status,
        });
      }
    });
    return () => {
      unsubscribe();
    };
  }, [loadOrders, playOutstationAlert]);

  const openDetail = async (order) => {
    const id = order?.id ?? order?.orderId;
    if (id == null) return;
    setSelectedId(id);
    setDetail(order);
    setRiderPick(order?.riderId != null ? String(order.riderId) : "");
    setStatusPick(String(order?.status || "CONFIRMED").toUpperCase());
    setAssignRolePick("DELIVERY");
    await loadEligibleRidersForOrder(order);
    setDetailLoading(true);
    try {
      const res = await orderService.getOrder(id);
      const entity = unwrapEntity(res);
      if (entity && typeof entity === "object") {
        setDetail(entity);
        setRiderPick(entity.riderId != null ? String(entity.riderId) : "");
        setStatusPick(String(entity.status || "CONFIRMED").toUpperCase());
        await loadEligibleRidersForOrder(entity);
      }
    } catch {
      // keep list row data
      setApiError("Failed to load latest order details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setDetail(null);
  };

  const runAction = async (fn) => {
    if (selectedId == null) return;
    setActionBusy(true);
    try {
      const resp = await fn();
      await loadOrders();
      const res = await orderService.getOrder(selectedId);
      const entity = unwrapEntity(res);
      if (entity && typeof entity === "object") setDetail(entity);
      setApiSuccess(resp?.data?.message || "Action completed successfully.");
    } catch (e) {
      setApiError(e?.response?.data?.message || e?.message || "Action failed.");
    } finally {
      setActionBusy(false);
    }
  };

  const q = search.trim().toLowerCase();
  const modeFilteredOrders = useMemo(() => {
    return orders.filter(
      (o) => String(o?.serviceMode || "").toUpperCase() === serviceModeTab
    );
  }, [orders, serviceModeTab]);

  const filteredOrders = useMemo(() => {
    return modeFilteredOrders.filter((o) => {
      if (statusTab !== "All") {
        const st = String(o?.status || "").toUpperCase();
        if (st !== statusTab.toUpperCase()) return false;
      }
      if (!q) return true;
      const hay = [
        o.id,
        o.userId,
        o.status,
        o.serviceMode,
        o.paymentType,
        o.riderId,
        o.vehicleId,
      ]
        .filter((x) => x != null)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modeFilteredOrders, statusTab, q]);

  const statusCounts = useMemo(() => {
    const m = { All: modeFilteredOrders.length };
    for (const s of ORDER_STATUSES) {
      m[s] = modeFilteredOrders.filter(
        (o) => String(o?.status || "").toUpperCase() === s
      ).length;
    }
    return m;
  }, [modeFilteredOrders]);

  const fmtMoney = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : `₹${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const fmtAddress = (s) => {
    const v = String(s || "").trim();
    return v || "—";
  };
  const isAnyBusy = loading || detailLoading || actionBusy;

  return (
    <>
      <div className="container-fluid fade-in position-relative">
        {apiNotice ? (
          <div
            className={`alert ${
              apiNotice.type === "error" ? "alert-danger" : "alert-success"
            } mb-3 d-flex align-items-center justify-content-between gap-3 rounded-4 border-0 shadow-sm`}
            role="alert"
          >
            <span>{apiNotice.text}</span>
            <button
              type="button"
              className="btn btn-sm btn-light rounded-pill"
              onClick={() => setApiNotice(null)}
            >
              Dismiss
            </button>
          </div>
        ) : null}

        {isAnyBusy ? (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              zIndex: 1300,
              backgroundColor: "rgba(15, 23, 42, 0.35)",
              backdropFilter: "blur(1px)",
            }}
          >
            <div className="bg-white rounded-4 shadow px-4 py-3 d-flex align-items-center gap-3">
              <span className="spinner-border spinner-border-sm text-danger" />
              <span className="small fw-semibold text-muted">
                {actionBusy
                  ? "Processing request..."
                  : detailLoading
                  ? "Loading order details..."
                  : "Loading orders..."}
              </span>
            </div>
          </div>
        ) : null}

        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-lg-start gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Orders</h2>
            <p className="text-muted small mb-0">
              {loading
                ? "Loading orders…"
                : "All orders from the admin API — assign riders and update status."}
            </p>
          </div>
          <button
            type="button"
            className="btn d-flex align-items-center gap-2 px-4 py-2 small fw-bold text-white border-0 shadow-sm"
            style={{ backgroundColor: "#E51818", borderRadius: 12 }}
            onClick={() => {
              loadOrders();
              loadRiders();
            }}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? "spin" : ""} />
            Refresh
          </button>
        </div>

        {error ? (
          <div
            className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3 rounded-4 border-0 shadow-sm"
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger rounded-pill"
              onClick={loadOrders}
            >
              Retry
            </button>
          </div>
        ) : null}

        {outstationAlertOrder ? (
          <div className="alert alert-warning border-0 shadow-sm rounded-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
            <div>
              <div className="fw-bold">New outstation order alert</div>
              <div className="small text-muted">
                Order #{outstationAlertOrder?.id ?? outstationAlertOrder?.orderId ?? "—"} is waiting for rider assignment.
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={() => {
                  openDetail(outstationAlertOrder);
                  setOutstationAlertOrder(null);
                }}
              >
                Open order
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => setOutstationAlertOrder(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {realtimeOrderAlert ? (
          <div className="alert alert-danger border-0 shadow-sm rounded-4 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3 mb-3">
            <div>
              <div className="fw-bold">New order alert</div>
              <div className="small text-muted">
                Order #{realtimeOrderAlert.id} ({realtimeOrderAlert.serviceMode ?? "—"}) is now{" "}
                {realtimeOrderAlert.status ?? "CREATED"}.
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={async () => {
                  try {
                    const res = await orderService.getOrder(realtimeOrderAlert.id);
                    const entity = unwrapEntity(res);
                    if (entity && typeof entity === "object") {
                      await openDetail(entity);
                    }
                  } finally {
                    setRealtimeOrderAlert(null);
                  }
                }}
              >
                Open order
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light"
                onClick={() => setRealtimeOrderAlert(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="row g-3 mb-4">
          {SERVICE_MODE_TABS.map((tab) => {
            const active = serviceModeTab === tab;
            const count =
              tab === "ALL"
                ? orders.length
                : orders.filter(
                    (o) => String(o?.serviceMode || "").toUpperCase() === tab
                  ).length;
            return (
              <div key={tab} className="col-auto">
                <button
                  type="button"
                  onClick={() => setServiceModeTab(tab)}
                  className="btn border-0 px-3 py-2 small rounded-pill fw-semibold"
                  style={{
                    backgroundColor: active ? "#111827" : "#fff",
                    color: active ? "#fff" : "#64748B",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {tab === "INCITY" ? "Incity" : "Outstation"}
                  <span className="ms-1 opacity-80" style={{ fontSize: 11 }}>
                    ({count})
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <div className="row g-3 mb-4">
          {["All", ...ORDER_STATUSES].map((tab) => (
            <div key={tab} className="col-auto">
              <button
                type="button"
                onClick={() => setStatusTab(tab)}
                className="btn border-0 px-3 py-2 small rounded-pill fw-semibold"
                style={{
                  backgroundColor:
                    statusTab === tab ? "#E51818" : "#fff",
                  color: statusTab === tab ? "#fff" : "#64748B",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                {tab === "All" ? "All" : tab.replace(/_/g, " ")}
                <span
                  className="ms-1 opacity-80"
                  style={{ fontSize: 11 }}
                >
                  ({statusCounts[tab] ?? 0})
                </span>
              </button>
            </div>
          ))}
        </div>

        <div className="dashboard-card mb-3 border-0 py-3">
          <div className="search-container flex-grow-1 mb-0">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search by id, user, status, rider, vehicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2"
              style={{ borderRadius: 12 }}
            />
          </div>
        </div>

        <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table mb-0 table-hover align-middle">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 text-muted small border-0">
                    ORDER
                  </th>
                  <th className="px-3 py-3 text-muted small border-0">
                    USER
                  </th>
                  <th className="px-3 py-3 text-muted small border-0">
                    ROUTE
                  </th>
                  <th className="px-3 py-3 text-muted small border-0">
                    MODE
                  </th>
                  <th className="px-3 py-3 text-muted small border-0">
                    STATUS
                  </th>
                  <th className="px-3 py-3 text-muted small border-0">
                    RIDER
                  </th>
                  <th className="px-3 py-3 text-muted small border-0 text-end">
                    TOTAL
                  </th>
                  <th className="px-4 py-3 border-0 w-1" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-5 text-muted small"
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="text-center py-5 text-muted small"
                    >
                      No orders in this view.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const id = order.id ?? order.orderId;
                    return (
                      <tr
                        key={id}
                        className="cursor-pointer"
                        role="button"
                        onClick={() => openDetail(order)}
                      >
                        <td className="px-4 py-3 border-0">
                          <span className="fw-bold small">#{id}</span>
                          <div className="text-muted" style={{ fontSize: 10 }}>
                            <Clock size={10} className="me-1" />
                            {formatWhen(order.createdAt)}
                          </div>
                        </td>
                        <td className="px-3 py-3 border-0 small">
                          {order.userId ?? "—"}
                        </td>
                        <td className="px-3 py-3 border-0 small text-muted">
                          <div className="d-flex flex-column gap-1">
                            <div className="d-flex align-items-center gap-1">
                              <MapPin size={12} className="text-danger" />
                              <span>{fmtAddress(order.pickupAddress)}</span>
                            </div>
                            <div className="d-flex align-items-center gap-1">
                              <MapPin size={12} className="text-success" />
                              <span>{fmtAddress(order.dropAddress)}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 border-0 small">
                          {order.serviceMode ?? "—"}
                        </td>
                        <td className="px-3 py-3 border-0">
                          <span
                            className={`status-badge status-${statusBadgeClass(
                              order.status
                            )}`}
                            style={{ fontSize: 11 }}
                          >
                            {order.status ?? "—"}
                          </span>
                        </td>
                        <td className="px-3 py-3 border-0 small text-muted">
                          {order.riderId ?? "—"}
                        </td>
                        <td className="px-3 py-3 border-0 text-end fw-bold small">
                          {fmtMoney(order.totalAmount)}
                        </td>
                        <td className="px-4 py-3 border-0 text-muted">
                          <ChevronRight size={18} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-muted small mt-3 mb-0">
          Showing {filteredOrders.length} of {modeFilteredOrders.length}{" "}
          {serviceModeTab === "INCITY" ? "incity orders" : "outstation orders"}
        </p>
      </div>

      {detail && selectedId != null && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 fade-in d-flex flex-column"
          style={{
            zIndex: 1050,
            background: "linear-gradient(180deg, #F1F5F9 0%, #F8FAFC 100%)",
          }}
        >
          <div className="bg-white border-bottom shadow-sm px-3 py-3 px-md-4 sticky-top">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <h4 className="fw-bold mb-1 d-flex flex-wrap align-items-center gap-2">
                  Order #{selectedId}
                  {detailLoading ? (
                    <span className="spinner-border spinner-border-sm text-secondary" />
                  ) : null}
                  <span
                    className={`status-badge status-${statusBadgeClass(
                      detail.status
                    )}`}
                  >
                    {detail.status ?? "—"}
                  </span>
                </h4>
                <p className="text-muted small mb-0">
                  User #{detail.userId ?? "—"} · {detail.serviceMode ?? "—"} ·{" "}
                  {formatWhen(detail.createdAt)}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger rounded-circle p-2 border-0 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 40, height: 40, backgroundColor: "#E51818" }}
                onClick={closeDetail}
                aria-label="Close"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

          <div className="flex-grow-1 overflow-auto px-3 py-4 px-md-4 pb-5">
            <div className="mx-auto" style={{ maxWidth: 1100 }}>
              <div className="row g-4">
                <div className="col-12 col-lg-7">
                  <div className="dashboard-card border-0 shadow-sm mb-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-uppercase small text-muted letter-spacing">
                      <Navigation size={18} style={{ color: "#E51818" }} />
                      Locations
                    </h6>
                    <div className="d-flex flex-column gap-3">
                      <div className="p-3 rounded-3 bg-light">
                        <p className="text-muted mb-1 small">Pickup</p>
                        <p className="mb-1 small">{fmtAddress(detail.pickupAddress)}</p>
                        <p className="fw-semibold mb-0 font-monospace small">
                          {detail.pickupLat != null && detail.pickupLng != null
                            ? `${detail.pickupLat}, ${detail.pickupLng}`
                            : "—"}
                        </p>
                        <a
                          className="small"
                          href={
                            detail.pickupLat != null && detail.pickupLng != null
                              ? `https://www.google.com/maps?q=${detail.pickupLat},${detail.pickupLng}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Maps
                        </a>
                      </div>
                      <div className="p-3 rounded-3 bg-light">
                        <p className="text-muted mb-1 small">Drop</p>
                        <p className="mb-1 small">{fmtAddress(detail.dropAddress)}</p>
                        <p className="fw-semibold mb-0 font-monospace small">
                          {detail.dropLat != null && detail.dropLng != null
                            ? `${detail.dropLat}, ${detail.dropLng}`
                            : "—"}
                        </p>
                        <a
                          className="small"
                          href={
                            detail.dropLat != null && detail.dropLng != null
                              ? `https://www.google.com/maps?q=${detail.dropLat},${detail.dropLng}`
                              : undefined
                          }
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open in Maps
                        </a>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card border-0 shadow-sm">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-uppercase small text-muted letter-spacing">
                      <Package size={18} style={{ color: "#E51818" }} />
                      Order details
                    </h6>
                    <div className="row g-3 small">
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Weight</p>
                        <p className="fw-bold mb-0">
                          {detail.weight != null ? `${detail.weight} kg` : "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Vehicle ID</p>
                        <p className="fw-bold mb-0">{detail.vehicleId ?? "—"}</p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Payment</p>
                        <p className="fw-bold mb-0">{detail.paymentType ?? "—"}</p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Delivery type</p>
                        <p className="fw-bold mb-0">{detail.deliveryType ?? "—"}</p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Origin hub</p>
                        <p className="fw-bold mb-0">{detail.originHubId ?? "—"}</p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Destination hub</p>
                        <p className="fw-bold mb-0">
                          {detail.destinationHubId ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-lg-5 d-flex flex-column gap-4">
                  <div className="dashboard-card border-0 shadow-sm">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
                      <CreditCard size={18} /> Amounts
                    </h6>
                    <div className="d-flex flex-column gap-2 small">
                      {[
                        ["Subtotal", detail.subtotal],
                        ["GST", detail.gstAmount],
                        ["Platform fee", detail.platformFee],
                        ["Coupon", detail.couponAmount],
                        ["Total", detail.totalAmount],
                      ].map(([label, val]) => (
                        <div
                          key={label}
                          className="d-flex justify-content-between py-2 border-bottom border-light"
                        >
                          <span className="text-muted">{label}</span>
                          <span className="fw-semibold">{fmtMoney(val)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="dashboard-card border-0 shadow-sm border border-warning border-opacity-25">
                    <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                      <User size={18} /> Assign rider
                    </h6>
                    <p className="text-muted small mb-3">
                      POST{" "}
                      <code className="small">/assign-rider</code> with a rider
                      id from the available pool.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      <select
                        className="form-select form-select-sm rounded-3"
                        value={assignRolePick}
                        onChange={(e) => setAssignRolePick(e.target.value)}
                        disabled={actionBusy}
                      >
                        <option value="DELIVERY">Delivery rider</option>
                        <option value="PICKUP">Pickup rider</option>
                        <option value="BOTH">Both roles</option>
                      </select>
                      <select
                        className="form-select form-select-sm rounded-3"
                        value={riderPick}
                        onChange={(e) => setRiderPick(e.target.value)}
                        disabled={actionBusy}
                      >
                        <option value="">Select rider…</option>
                        {availableRiders.map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            #{r.id} — {r.name ?? "Rider"} ({r.vehicleType ?? "—"}
                            )
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn text-white fw-semibold rounded-3 py-2"
                        style={{ backgroundColor: "#E51818" }}
                        disabled={
                          actionBusy ||
                          riderPick === "" ||
                          Number.isNaN(parseInt(riderPick, 10))
                        }
                        onClick={() => {
                          const rid = parseInt(riderPick, 10);
                          const payload =
                            assignRolePick === "PICKUP"
                              ? {
                                  pickupRiderId: rid,
                                  assignmentRole: "PICKUP",
                                }
                              : assignRolePick === "DELIVERY"
                              ? {
                                  deliveryRiderId: rid,
                                  assignmentRole: "DELIVERY",
                                }
                              : {
                                  pickupRiderId: rid,
                                  deliveryRiderId: rid,
                                  assignmentRole: "BOTH",
                                };
                          runAction(() =>
                            orderService.assignRider(selectedId, payload)
                          );
                        }}
                      >
                        Assign rider
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card border-0 shadow-sm">
                    <h6 className="fw-bold mb-2">Update status</h6>
                    <p className="text-muted small mb-3">
                      Status values must match{" "}
                      <code className="small">OrderStatus</code> enum names.
                    </p>
                    <div className="d-flex flex-column gap-2">
                      <select
                        className="form-select form-select-sm rounded-3"
                        value={statusPick}
                        onChange={(e) => setStatusPick(e.target.value)}
                        disabled={actionBusy}
                      >
                        {ORDER_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-outline-primary fw-semibold rounded-3 py-2"
                        disabled={actionBusy}
                        onClick={() =>
                          runAction(() =>
                            orderService.updateStatus(selectedId, {
                              status:
                                STATUS_UPDATE_MAP[
                                  String(statusPick || "").toUpperCase()
                                ] ?? statusPick,
                            })
                          )
                        }
                      >
                        Update status
                      </button>
                    </div>
                  </div>

                  {actionBusy ? (
                    <p className="small text-muted d-flex align-items-center gap-2 mb-0">
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden
                      />
                      Working…
                    </p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .letter-spacing { letter-spacing: 0.06em; }
      `}</style>
    </>
  );
};

export default Orders;

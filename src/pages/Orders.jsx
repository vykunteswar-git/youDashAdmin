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
  notificationAdminService,
  unwrapList,
  unwrapEntity,
} from "../services/apiService";
import { adminSocketService } from "../services/adminSocketService";
import {
  CANONICAL_ORDER_STATUSES,
  OUTSTATION_BULK_STATUSES,
  OUTSTATION_EXCEPTION_STATUSES,
  canonicalOrderStatus,
  toApiOrderStatus,
  formatStatusLabel,
  getOutstationPrimaryNextStatus,
  getOutstationMilestoneLabels,
  getOutstationProgressIndex,
  resolveAdminNextStatuses,
  countOrdersByCanonicalStatus,
  orderMatchesStatusTab,
  statusBadgeClass,
  outstationStatusRequiresOtp,
} from "../utils/orderStatusUtils";

const SERVICE_MODE_TABS = ["INCITY", "OUTSTATION"];

function canConfirmHubDrop(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    String(order?.deliveryType || "").toUpperCase() === "HUB_TO_DOOR" &&
    canonicalOrderStatus(order?.status) === "BOOKED"
  );
}

function canConfirmHubCollect(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    String(order?.deliveryType || "").toUpperCase() === "DOOR_TO_HUB" &&
    canonicalOrderStatus(order?.status) === "AWAITING_HUB_COLLECTION"
  );
}

function isOutstationDoorDeliveryType(deliveryType) {
  const type = String(deliveryType || "").toUpperCase();
  return type === "DOOR_TO_DOOR" || type === "HUB_TO_DOOR";
}

function needsDeliveryRiderAssign(order) {
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    isOutstationDoorDeliveryType(order?.deliveryType) &&
    canonicalOrderStatus(order?.status) === "AT_DESTINATION_HUB"
  );
}

function needsPickupRiderAssign(order) {
  const type = String(order?.deliveryType || "").toUpperCase();
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    (type === "DOOR_TO_DOOR" || type === "DOOR_TO_HUB") &&
    canonicalOrderStatus(order?.status) === "BOOKED"
  );
}

function resolveSuggestedAssignRole(order) {
  if (needsDeliveryRiderAssign(order)) return "DELIVERY";
  if (needsPickupRiderAssign(order)) return "PICKUP";
  const type = String(order?.deliveryType || "").toUpperCase();
  if (type === "DOOR_TO_HUB") return "PICKUP";
  return "DELIVERY";
}

function canRecordPickupCod(order, targetStatus) {
  const type = String(order?.deliveryType || "").toUpperCase();
  return (
    String(order?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
    (type === "DOOR_TO_DOOR" || type === "DOOR_TO_HUB") &&
    String(canonicalOrderStatus(targetStatus)) === "PICKED_UP" &&
    String(order?.paymentType || "").toUpperCase() === "COD" &&
    !(order?.codAlreadyCollected === true)
  );
}

function getOutstationNextAdminAction(order) {
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
  const [statusPick, setStatusPick] = useState("RIDER_ASSIGNED");
  const [statusOtp, setStatusOtp] = useState("");
  const [statusAdminOverride, setStatusAdminOverride] = useState(false);
  const [pickupCodMode, setPickupCodMode] = useState("CASH");
  const [hubHandoverOtp, setHubHandoverOtp] = useState("");
  const [hubHandoverCodMode, setHubHandoverCodMode] = useState("CASH");
  const [hubHandoverOverride, setHubHandoverOverride] = useState(false);
  const [routeFilter, setRouteFilter] = useState("All Routes");
  const [selectedOrderIds, setSelectedOrderIds] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState(OUTSTATION_BULK_STATUSES[0]);
  const [bulkBusy, setBulkBusy] = useState(false);

  const knownOutstationOrderIdsRef = useRef(new Set());
  const outstationAlertInitializedRef = useRef(false);
  const [outstationAlertOrder, setOutstationAlertOrder] = useState(null);
  const [realtimeOrderAlert, setRealtimeOrderAlert] = useState(null);
  const [apiNotice, setApiNotice] = useState(null);
  const outstationAlertIntervalRef = useRef(null);

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
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      // Louder, longer triple pulse so outstation arrivals are hard to miss.
      const pulses = [
        { at: 0, freq: 920, len: 0.34 },
        { at: 0.4, freq: 740, len: 0.34 },
        { at: 0.8, freq: 920, len: 0.46 },
      ];
      for (const pulse of pulses) {
        const osc = ctx.createOscillator();
        osc.type = "square";
        osc.frequency.setValueAtTime(pulse.freq, ctx.currentTime + pulse.at);
        osc.connect(gain);
        osc.start(ctx.currentTime + pulse.at);
        osc.stop(ctx.currentTime + pulse.at + pulse.len);
      }
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.32, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.35);
      window.setTimeout(() => {
        ctx.close().catch(() => {});
      }, 1800);
    } catch {
      // no-op: sound is best-effort only
    }
  }, []);

  const stopOutstationAlertLoop = useCallback(() => {
    if (outstationAlertIntervalRef.current != null) {
      window.clearInterval(outstationAlertIntervalRef.current);
      outstationAlertIntervalRef.current = null;
    }
  }, []);

  const startOutstationAlertLoop = useCallback(() => {
    if (outstationAlertIntervalRef.current != null) return;
    playOutstationAlert();
    outstationAlertIntervalRef.current = window.setInterval(() => {
      playOutstationAlert();
    }, 3500);
  }, [playOutstationAlert]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await orderService.listOrders();
      const list = unwrapList(res);
      setOrders(list);
      const outstationOrderIds = new Set(
        list
          .filter(
            (o) => String(o?.serviceMode || "").toUpperCase() === "OUTSTATION",
          )
          .map((o) => String(o.id ?? o.orderId))
          .filter(Boolean),
      );
      if (outstationAlertInitializedRef.current) {
        let hasNew = false;
        let newestOrder = null;
        for (const id of outstationOrderIds) {
          if (!knownOutstationOrderIdsRef.current.has(id)) {
            hasNew = true;
            newestOrder =
              list.find((o) => String(o?.id ?? o?.orderId) === id) || null;
            break;
          }
        }
        if (hasNew) {
          setOutstationAlertOrder(newestOrder);
        }
      } else {
        outstationAlertInitializedRef.current = true;
      }
      knownOutstationOrderIdsRef.current = outstationOrderIds;
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load orders.";
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

  const loadEligibleRidersForOrder = useCallback(async (order, role) => {
    const id = order?.id ?? order?.orderId;
    if (id == null) {
      setAvailableRiders([]);
      return;
    }
    const assignmentRole =
      role ??
      (String(order?.deliveryType || "").toUpperCase() === "DOOR_TO_HUB"
        ? "PICKUP"
        : "DELIVERY");
    try {
      const res = await riderService.getEligibleRidersForOrder(id, assignmentRole);
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
    if (detail == null || selectedId == null) return;
    loadEligibleRidersForOrder(detail, assignRolePick);
  }, [assignRolePick, detail, selectedId, loadEligibleRidersForOrder]);

  useEffect(() => {
    if (detail == null) return;
    setAssignRolePick(resolveSuggestedAssignRole(detail));
  }, [detail?.id, detail?.status, detail?.deliveryType, detail?.serviceMode]);

  useEffect(() => {
    const unsubscribe = adminSocketService.subscribe((evt) => {
      if (!evt || !evt.orderId) return;
      loadOrders();
      const eventType = String(evt.eventType || evt.event || "")
        .toLowerCase()
        .trim();
      if (eventType === "order_created") {
        if (
          String(evt.serviceMode || "").toUpperCase() === "OUTSTATION" &&
          evt.orderId != null
        ) {
          setOutstationAlertOrder(
            (prev) =>
              prev ?? {
                id: evt.orderId,
                orderId: evt.orderId,
                serviceMode: evt.serviceMode,
                status: evt.status,
              },
          );
        }
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
  }, [loadOrders]);

  useEffect(() => {
    if (outstationAlertOrder) {
      startOutstationAlertLoop();
    } else {
      stopOutstationAlertLoop();
    }
    return () => {
      stopOutstationAlertLoop();
    };
  }, [outstationAlertOrder, startOutstationAlertLoop, stopOutstationAlertLoop]);

  const openDetail = async (order) => {
    const id = order?.id ?? order?.orderId;
    if (id == null) return;
    setSelectedId(id);
    setDetail(order);
    setRiderPick(order?.riderId != null ? String(order.riderId) : "");
    setStatusPick(canonicalOrderStatus(order?.status || "RIDER_ASSIGNED"));
    setAssignRolePick("DELIVERY");
    await loadEligibleRidersForOrder(order, assignRolePick);
    setDetailLoading(true);
    try {
      const res = await orderService.getOrder(id);
      const entity = unwrapEntity(res);
      if (entity && typeof entity === "object") {
        setDetail(entity);
        setRiderPick(entity.riderId != null ? String(entity.riderId) : "");
        setStatusPick(canonicalOrderStatus(entity.status || "RIDER_ASSIGNED"));
        await loadEligibleRidersForOrder(entity, assignRolePick);
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

  const nextStatuses = useMemo(() => resolveAdminNextStatuses(detail), [detail]);

  const primaryNextStatus = useMemo(
    () => getOutstationPrimaryNextStatus(detail),
    [detail],
  );

  useEffect(() => {
    if (nextStatuses.length === 0) {
      setStatusPick("");
      return;
    }
    if (!nextStatuses.includes(canonicalOrderStatus(statusPick))) {
      setStatusPick(nextStatuses[0]);
    }
  }, [nextStatuses, statusPick]);

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
      (o) => String(o?.serviceMode || "").toUpperCase() === serviceModeTab,
    );
  }, [orders, serviceModeTab]);

  const availableRoutes = useMemo(() => {
    if (serviceModeTab !== "OUTSTATION") return [];
    const routeSet = new Set();
    for (const o of modeFilteredOrders) {
      const orig = String(o.originHubCity || "").trim();
      const dest = String(o.destinationHubCity || "").trim();
      if (orig && dest) routeSet.add(`${orig} → ${dest}`);
    }
    return Array.from(routeSet).sort();
  }, [modeFilteredOrders, serviceModeTab]);

  useEffect(() => {
    setSelectedOrderIds(new Set());
  }, [serviceModeTab, routeFilter, statusTab]);

  useEffect(() => {
    if (serviceModeTab !== "OUTSTATION") setRouteFilter("All Routes");
  }, [serviceModeTab]);

  const filteredOrders = useMemo(() => {
    return modeFilteredOrders.filter((o) => {
      if (!orderMatchesStatusTab(o, statusTab)) return false;
      if (serviceModeTab === "OUTSTATION" && routeFilter !== "All Routes") {
        const orig = String(o.originHubCity || "").trim();
        const dest = String(o.destinationHubCity || "").trim();
        const route = orig && dest ? `${orig} → ${dest}` : "";
        if (route !== routeFilter) return false;
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
        o.originHubCity,
        o.destinationHubCity,
      ]
        .filter((x) => x != null)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [modeFilteredOrders, statusTab, q, serviceModeTab, routeFilter]);

  const statusCounts = useMemo(
    () => countOrdersByCanonicalStatus(modeFilteredOrders),
    [modeFilteredOrders],
  );

  const statusGroups = useMemo(() => {
    if (serviceModeTab !== "OUTSTATION" || routeFilter === "All Routes") return [];
    const groups = {};
    for (const o of filteredOrders) {
      const s = canonicalOrderStatus(o.status);
      if (!groups[s]) groups[s] = [];
      groups[s].push(o);
    }
    const deliveryType = filteredOrders[0]?.deliveryType;
    return Object.entries(groups).sort(([a], [b]) => {
      const ai = getOutstationProgressIndex(a, deliveryType);
      const bi = getOutstationProgressIndex(b, deliveryType);
      if (ai === -1 && bi === -1) return 0;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [filteredOrders, serviceModeTab, routeFilter]);

  const runGroupAdvance = async (groupOrders, nextStatus) => {
    if (!nextStatus || groupOrders.length === 0) return;
    setBulkBusy(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const o of groupOrders) {
        const id = o.id ?? o.orderId;
        try {
          await orderService.updateStatus(id, { status: toApiOrderStatus(nextStatus) });
          succeeded++;
        } catch {
          failed++;
        }
      }
      await loadOrders();
      if (failed === 0) {
        setApiSuccess(
          `Advanced ${succeeded} order${succeeded !== 1 ? "s" : ""} → ${formatStatusLabel(nextStatus)}.`,
        );
      } else {
        setApiError(`${succeeded} advanced, ${failed} failed.`);
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const runBulkStatusUpdate = async () => {
    if (selectedOrderIds.size === 0 || !bulkStatus) return;
    setBulkBusy(true);
    let succeeded = 0;
    let failed = 0;
    try {
      for (const orderId of selectedOrderIds) {
        try {
          await orderService.updateStatus(orderId, {
            status: toApiOrderStatus(bulkStatus),
          });
          succeeded++;
        } catch {
          failed++;
        }
      }
      await loadOrders();
      setSelectedOrderIds(new Set());
      if (failed === 0) {
        setApiSuccess(
          `Updated ${succeeded} order${succeeded !== 1 ? "s" : ""} to ${formatStatusLabel(bulkStatus)}.`,
        );
      } else {
        setApiError(
          `${succeeded} updated, ${failed} failed. Check individual orders.`,
        );
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleOrderSelection = (orderId, e) => {
    e.stopPropagation();
    setSelectedOrderIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredOrders.map((o) => o.id ?? o.orderId);
    const allSelected = visibleIds.every((id) => selectedOrderIds.has(id));
    if (allSelected) {
      setSelectedOrderIds(new Set());
    } else {
      setSelectedOrderIds(new Set(visibleIds));
    }
  };

  const fmtMoney = (n) =>
    n == null || Number.isNaN(Number(n))
      ? "—"
      : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
  const fmtAddress = (s) => {
    const v = String(s || "").trim();
    return v || "—";
  };
  const fmtYesNo = (v) => (v === true ? "Yes" : v === false ? "No" : "—");
  const parcelHandlingTags = (d) => {
    const tags = [];
    if (d?.isFragile) tags.push("Fragile");
    if (d?.containsLiquid) tags.push("Contains liquid");
    if (d?.containsBattery) tags.push("Contains battery");
    return tags;
  };
  const isListBusy = loading && selectedId == null;
  const isPageOverlayBusy = isListBusy;

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

        {isPageOverlayBusy ? (
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
                Loading orders...
              </span>
            </div>
          </div>
        ) : null}

        {!(detail && selectedId != null) && (
        <>
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <h2 className="fw-bold mb-1">Orders</h2>
            <p className="text-muted small mb-0">
              {loading ? "Loading orders…" : `${filteredOrders.length} orders`}
            </p>
          </div>
          <button
            type="button"
            className="btn d-flex align-items-center gap-2 px-3 py-2 small fw-semibold text-white border-0"
            style={{ backgroundColor: "#E51818", borderRadius: 10 }}
            onClick={() => {
              loadOrders();
              loadRiders();
            }}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
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
                Order #
                {outstationAlertOrder?.id ??
                  outstationAlertOrder?.orderId ??
                  "—"}{" "}
                is waiting for rider assignment.
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
                Order #{realtimeOrderAlert.id} (
                {realtimeOrderAlert.serviceMode ?? "—"}) is now{" "}
                {realtimeOrderAlert.status ?? "CREATED"}.
              </div>
            </div>
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-sm btn-dark"
                onClick={async () => {
                  try {
                    const res = await orderService.getOrder(
                      realtimeOrderAlert.id,
                    );
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

        <div
          className="dashboard-card border-0 shadow-sm mb-4 py-3"
          style={{ borderRadius: 14 }}
        >
          {/* Row 1: mode toggle, status filter, search */}
          <div className="d-flex flex-wrap align-items-center gap-2">
            {/* Mode toggle */}
            <div
              className="d-flex rounded-3 overflow-hidden border"
              style={{ borderColor: "#E5E7EB" }}
            >
              {SERVICE_MODE_TABS.map((tab) => {
                const active = serviceModeTab === tab;
                const count = orders.filter(
                  (o) => String(o?.serviceMode || "").toUpperCase() === tab,
                ).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setServiceModeTab(tab)}
                    className="btn border-0 px-3 py-2 small fw-semibold"
                    style={{
                      backgroundColor: active ? "#111827" : "transparent",
                      color: active ? "#fff" : "#64748B",
                      borderRadius: 0,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {tab === "INCITY" ? "Incity" : "Outstation"}
                    <span
                      className="ms-1"
                      style={{ fontSize: 11, opacity: 0.75 }}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Status dropdown — hidden in outstation grouped-route view */}
            {!(serviceModeTab === "OUTSTATION" && routeFilter !== "All Routes") && (
              <select
                className="form-select form-select-sm border fw-semibold text-secondary"
                style={{
                  width: "auto",
                  minWidth: 170,
                  borderRadius: 8,
                  borderColor: "#E5E7EB",
                  fontSize: 13,
                }}
                value={statusTab}
                onChange={(e) => setStatusTab(e.target.value)}
              >
                <option value="All">
                  All statuses ({statusCounts.All ?? 0})
                </option>
                {CANONICAL_ORDER_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(s)} ({statusCounts[s] ?? 0})
                  </option>
                ))}
              </select>
            )}

            {/* Search */}
            <div
              className="search-container flex-grow-1 mb-0"
              style={{ minWidth: 180 }}
            >
              <Search size={15} className="text-muted" />
              <input
                type="text"
                placeholder="Search orders…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control bg-light border-0 ps-5 py-2 small"
                style={{ borderRadius: 8 }}
              />
            </div>

            {/* Clear filters */}
            {(statusTab !== "All" ||
              routeFilter !== "All Routes" ||
              search.trim()) && (
              <button
                type="button"
                className="btn btn-sm d-flex align-items-center gap-1 text-muted"
                style={{ borderRadius: 8, fontSize: 12 }}
                onClick={() => {
                  setStatusTab("All");
                  setRouteFilter("All Routes");
                  setSearch("");
                }}
              >
                <X size={13} />
                Clear
              </button>
            )}
          </div>

          {/* Row 2: outstation hub-pair filters */}
          {serviceModeTab === "OUTSTATION" && (
            <div
              className="d-flex flex-wrap gap-2 mt-3 pt-3"
              style={{ borderTop: "1px solid #F1F5F9" }}
            >
              <button
                type="button"
                className="btn btn-sm fw-semibold px-3"
                style={{
                  borderRadius: 20,
                  fontSize: 12,
                  backgroundColor:
                    routeFilter === "All Routes" ? "#111827" : "#F1F5F9",
                  color: routeFilter === "All Routes" ? "#fff" : "#64748B",
                  border: "none",
                }}
                onClick={() => setRouteFilter("All Routes")}
              >
                All routes
                <span className="ms-1 opacity-75">
                  ({modeFilteredOrders.length})
                </span>
              </button>
              {availableRoutes.length === 0 ? (
                <span className="small text-muted align-self-center">
                  No hub-pair filters — origin/destination hub city missing on orders.
                </span>
              ) : (
                availableRoutes.map((route) => {
                  const count = modeFilteredOrders.filter((o) => {
                    const orig = String(o.originHubCity || "").trim();
                    const dest = String(o.destinationHubCity || "").trim();
                    return orig && dest && `${orig} → ${dest}` === route;
                  }).length;
                  const active = routeFilter === route;
                  return (
                    <button
                      key={route}
                      type="button"
                      className="btn btn-sm fw-semibold px-3 d-flex align-items-center gap-1"
                      style={{
                        borderRadius: 20,
                        fontSize: 12,
                        backgroundColor: active ? "#1D4ED8" : "#EFF6FF",
                        color: active ? "#fff" : "#1D4ED8",
                        border: "none",
                        whiteSpace: "nowrap",
                      }}
                      onClick={() => setRouteFilter(active ? "All Routes" : route)}
                    >
                      <span>{route}</span>
                      <span
                        className="rounded-pill px-1"
                        style={{
                          backgroundColor: active
                            ? "rgba(255,255,255,0.25)"
                            : "rgba(29,78,216,0.12)",
                          fontSize: 11,
                        }}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Bulk action bar — shown when orders are selected across groups */}
        {serviceModeTab === "OUTSTATION" && selectedOrderIds.size > 0 && (
          <div
            className="dashboard-card border-0 shadow-sm mb-3 py-2 px-3"
            style={{ borderRadius: 12, borderLeft: "3px solid #E51818" }}
          >
            <div className="d-flex flex-wrap align-items-center gap-3">
              <span className="small fw-semibold" style={{ color: "#E51818" }}>
                {selectedOrderIds.size} order
                {selectedOrderIds.size !== 1 ? "s" : ""} selected
              </span>
              <select
                className="form-select form-select-sm border"
                style={{ width: "auto", minWidth: 220, borderRadius: 8, fontSize: 13 }}
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                disabled={bulkBusy}
              >
                {OUTSTATION_BULK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {formatStatusLabel(s)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-sm fw-semibold text-white border-0 d-flex align-items-center gap-2"
                style={{ backgroundColor: "#E51818", borderRadius: 8, fontSize: 13 }}
                disabled={bulkBusy}
                onClick={runBulkStatusUpdate}
              >
                {bulkBusy ? <span className="spinner-border spinner-border-sm" /> : null}
                Update {selectedOrderIds.size} selected
              </button>
              <button
                type="button"
                className="btn btn-sm btn-light d-flex align-items-center gap-1"
                style={{ borderRadius: 8, fontSize: 12 }}
                onClick={() => setSelectedOrderIds(new Set())}
                disabled={bulkBusy}
              >
                <X size={12} />
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Grouped view — when a specific route chip is selected */}
        {serviceModeTab === "OUTSTATION" && routeFilter !== "All Routes" ? (
          <div className="d-flex flex-column gap-3">
            {loading ? (
              <div className="dashboard-card border-0 shadow-sm text-center py-5 text-muted small">
                Loading…
              </div>
            ) : statusGroups.length === 0 ? (
              <div className="dashboard-card border-0 shadow-sm text-center py-5 text-muted small">
                No orders on this route.
              </div>
            ) : (
              statusGroups.map(([status, groupOrders]) => {
                const nextStatus = getOutstationPrimaryNextStatus(groupOrders[0]);
                const groupIds = groupOrders.map((o) => o.id ?? o.orderId);
                const allGroupSelected =
                  groupIds.length > 0 &&
                  groupIds.every((id) => selectedOrderIds.has(id));
                const someGroupSelected = groupIds.some((id) =>
                  selectedOrderIds.has(id),
                );
                const isException = OUTSTATION_EXCEPTION_STATUSES.includes(
                  canonicalOrderStatus(status),
                );
                return (
                  <div
                    key={status}
                    className="dashboard-card border-0 shadow-sm"
                    style={{
                      borderLeft: isException
                        ? "3px solid #EF4444"
                        : "3px solid #E5E7EB",
                    }}
                  >
                    {/* Group header */}
                    <div className="d-flex flex-wrap align-items-center gap-3 mb-3">
                      <input
                        type="checkbox"
                        className="form-check-input flex-shrink-0"
                        checked={allGroupSelected}
                        ref={(el) => {
                          if (el)
                            el.indeterminate =
                              someGroupSelected && !allGroupSelected;
                        }}
                        onChange={() => {
                          setSelectedOrderIds((prev) => {
                            const next = new Set(prev);
                            if (allGroupSelected) {
                              groupIds.forEach((id) => next.delete(id));
                            } else {
                              groupIds.forEach((id) => next.add(id));
                            }
                            return next;
                          });
                        }}
                      />
                      <span
                        className={`status-badge status-${statusBadgeClass(status)}`}
                        style={{ fontSize: 12 }}
                      >
                        {formatStatusLabel(status)}
                      </span>
                      <span className="small text-muted fw-semibold">
                        {groupOrders.length} order
                        {groupOrders.length !== 1 ? "s" : ""}
                      </span>
                      <div className="ms-auto d-flex gap-2 flex-wrap">
                        {nextStatus && !isException && (
                          <button
                            type="button"
                            className="btn btn-sm fw-semibold d-flex align-items-center gap-1"
                            style={{
                              backgroundColor: "#EFF6FF",
                              color: "#1D4ED8",
                              borderRadius: 8,
                              fontSize: 12,
                              border: "none",
                            }}
                            disabled={bulkBusy}
                            onClick={() =>
                              runGroupAdvance(groupOrders, nextStatus)
                            }
                          >
                            {bulkBusy ? (
                              <span className="spinner-border spinner-border-sm" style={{ width: 12, height: 12 }} />
                            ) : (
                              <ChevronRight size={13} />
                            )}
                            Advance all → {formatStatusLabel(nextStatus)}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Order rows */}
                    <div className="d-flex flex-column gap-2">
                      {groupOrders.map((order) => {
                        const id = order.id ?? order.orderId;
                        const isSelected = selectedOrderIds.has(id);
                        return (
                          <div
                            key={id}
                            className="d-flex align-items-center gap-3 px-3 py-2 rounded-3"
                            style={{
                              backgroundColor: isSelected ? "#FEF3F2" : "#F8FAFC",
                              cursor: "pointer",
                            }}
                          >
                            <input
                              type="checkbox"
                              className="form-check-input flex-shrink-0"
                              checked={isSelected}
                              onChange={(e) => toggleOrderSelection(id, e)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div
                              className="d-flex flex-column flex-grow-1"
                              onClick={() => openDetail(order)}
                            >
                              <div className="d-flex align-items-center gap-2">
                                <span className="fw-bold small">#{id}</span>
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  User #{order.userId ?? "—"}
                                </span>
                                {order.riderId && (
                                  <span
                                    className="badge rounded-pill"
                                    style={{
                                      backgroundColor: "#F0FDF4",
                                      color: "#15803D",
                                      fontSize: 10,
                                    }}
                                  >
                                    <Truck size={9} className="me-1" />
                                    Rider #{order.riderId}
                                  </span>
                                )}
                              </div>
                              <div className="d-flex align-items-center gap-2 mt-1">
                                <Clock size={10} className="text-muted" />
                                <span className="text-muted" style={{ fontSize: 11 }}>
                                  {formatWhen(order.createdAt)}
                                </span>
                                {fmtMoney(order.totalAmount) !== "—" && (
                                  <span className="text-muted" style={{ fontSize: 11 }}>
                                    · {fmtMoney(order.totalAmount)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-sm btn-light flex-shrink-0"
                              style={{ borderRadius: 8, fontSize: 12 }}
                              onClick={() => openDetail(order)}
                            >
                              View
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* Flat table — "All Routes" or INCITY */
          <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table mb-0 table-hover align-middle">
                <thead className="bg-light">
                  <tr>
                    {serviceModeTab === "OUTSTATION" && (
                      <th className="px-3 py-3 border-0" style={{ width: 40 }}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={
                            filteredOrders.length > 0 &&
                            filteredOrders.every((o) =>
                              selectedOrderIds.has(o.id ?? o.orderId),
                            )
                          }
                          onChange={toggleSelectAll}
                          title="Select all visible"
                        />
                      </th>
                    )}
                    <th className="px-4 py-3 text-muted small border-0">ORDER</th>
                    <th className="px-3 py-3 text-muted small border-0">USER</th>
                    <th className="px-3 py-3 text-muted small border-0">
                      {serviceModeTab === "OUTSTATION" ? "HUB PAIR" : "ROUTE"}
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">MODE</th>
                    <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                    <th className="px-3 py-3 text-muted small border-0">RIDER</th>
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
                        colSpan={serviceModeTab === "OUTSTATION" ? 9 : 8}
                        className="text-center py-5 text-muted small"
                      >
                        Loading…
                      </td>
                    </tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={serviceModeTab === "OUTSTATION" ? 9 : 8}
                        className="text-center py-5 text-muted small"
                      >
                        No orders in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const id = order.id ?? order.orderId;
                      const isSelected = selectedOrderIds.has(id);
                      const hubOrig = String(order.originHubCity || "").trim();
                      const hubDest = String(order.destinationHubCity || "").trim();
                      const hubRoute =
                        hubOrig && hubDest ? `${hubOrig} → ${hubDest}` : null;
                      return (
                        <tr
                          key={id}
                          className="cursor-pointer"
                          role="button"
                          onClick={() => openDetail(order)}
                          style={
                            isSelected ? { backgroundColor: "#FEF3F2" } : undefined
                          }
                        >
                          {serviceModeTab === "OUTSTATION" && (
                            <td
                              className="px-3 py-3 border-0"
                              onClick={(e) => toggleOrderSelection(id, e)}
                            >
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={isSelected}
                                onChange={() => {}}
                              />
                            </td>
                          )}
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
                            {serviceModeTab === "OUTSTATION" && hubRoute ? (
                              <span
                                className="badge rounded-pill fw-semibold"
                                style={{
                                  backgroundColor: "#EFF6FF",
                                  color: "#1D4ED8",
                                  fontSize: 11,
                                }}
                              >
                                {hubRoute}
                              </span>
                            ) : (
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
                            )}
                          </td>
                          <td className="px-3 py-3 border-0 small">
                            {order.serviceMode ?? "—"}
                          </td>
                          <td className="px-3 py-3 border-0">
                            <span
                              className={`status-badge status-${statusBadgeClass(
                                order.status,
                              )}`}
                              style={{ fontSize: 11 }}
                            >
                              {formatStatusLabel(order.status)}
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
        )}

        <p className="text-muted small mt-3 mb-0">
          {serviceModeTab === "OUTSTATION" && routeFilter !== "All Routes"
            ? `${filteredOrders.length} order${filteredOrders.length !== 1 ? "s" : ""} on ${routeFilter}`
            : `Showing ${filteredOrders.length} of ${modeFilteredOrders.length} ${serviceModeTab === "INCITY" ? "incity" : "outstation"} orders`}
        </p>
        </>
        )}

      {detail && selectedId != null && (
        <div className="order-detail-panel fade-in pb-4">
          <div className="dashboard-card border-0 shadow-sm mb-4">
            <div className="d-flex justify-content-between align-items-start gap-3">
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-light rounded-pill mb-2 d-inline-flex align-items-center gap-1"
                  onClick={closeDetail}
                >
                  <ChevronRight size={14} style={{ transform: "rotate(180deg)" }} />
                  Back to orders
                </button>
                <h4
                  id="order-detail-title"
                  className="fw-bold mb-1 d-flex flex-wrap align-items-center gap-2"
                >
                  Order #{selectedId}
                  {detailLoading ? (
                    <span className="spinner-border spinner-border-sm text-secondary" />
                  ) : null}
                  <span
                    className={`status-badge status-${statusBadgeClass(
                      detail.status,
                    )}`}
                  >
                    {formatStatusLabel(detail.status)}
                  </span>
                </h4>
                <p className="text-muted small mb-0">
                  User #{detail.userId ?? "—"} · {detail.serviceMode ?? "—"} ·{" "}
                  {formatWhen(detail.createdAt)}
                  {detail.deliveryType ? ` · ${detail.deliveryType}` : ""}
                  {detail.paymentType ? ` · ${detail.paymentType}` : ""}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-danger rounded-circle p-2 border-0 d-flex align-items-center justify-content-center flex-shrink-0"
                style={{ width: 40, height: 40, backgroundColor: "#E51818" }}
                onClick={closeDetail}
                aria-label="Close order details"
              >
                <X size={20} className="text-white" />
              </button>
            </div>
          </div>

          <div className="pb-3">
            <div className="row g-4">
                <div className="col-12 col-xxl-8">
                  <div className="dashboard-card border-0 shadow-sm mb-4">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-uppercase small text-muted letter-spacing">
                      <Navigation size={18} style={{ color: "#E51818" }} />
                      Locations
                    </h6>
                    <div className="row g-3">
                      <div className="col-12 col-md-6">
                        <div className="p-3 rounded-3 bg-light h-100">
                          <p className="text-muted mb-1 small">Pickup</p>
                        <p className="mb-1 small">
                          {fmtAddress(detail.pickupAddress)}
                        </p>
                        {!String(detail.pickupAddress || "").trim() &&
                        detail.pickupLat != null &&
                        detail.pickupLng != null ? (
                          <p className="text-muted mb-1 font-monospace small">
                            {detail.pickupLat}, {detail.pickupLng}
                          </p>
                        ) : null}
                        {detail.pickupLat != null &&
                        detail.pickupLng != null ? (
                          <a
                            className="small"
                            href={`https://www.google.com/maps?q=${detail.pickupLat},${detail.pickupLng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Maps
                          </a>
                        ) : null}
                      </div>
                      </div>
                      <div className="col-12 col-md-6">
                        <div className="p-3 rounded-3 bg-light h-100">
                          <p className="text-muted mb-1 small">Drop</p>
                        <p className="mb-1 small">
                          {fmtAddress(detail.dropAddress)}
                        </p>
                        {!String(detail.dropAddress || "").trim() &&
                        detail.dropLat != null &&
                        detail.dropLng != null ? (
                          <p className="text-muted mb-1 font-monospace small">
                            {detail.dropLat}, {detail.dropLng}
                          </p>
                        ) : null}
                        {detail.dropLat != null && detail.dropLng != null ? (
                          <a
                            className="small"
                            href={`https://www.google.com/maps?q=${detail.dropLat},${detail.dropLng}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Maps
                          </a>
                        ) : null}
                      </div>
                      </div>
                    </div>
                  </div>

                  <div className="dashboard-card border-0 shadow-sm">
                    <h6 className="fw-bold mb-3 d-flex align-items-center gap-2 text-uppercase small text-muted letter-spacing">
                      <Package size={18} style={{ color: "#E51818" }} />
                      Order details
                    </h6>
                    <div className="row g-3 small">
                      <div className="col-12">
                        <p className="text-muted mb-1">Package contents</p>
                        <p className="fw-bold mb-0">
                          {fmtAddress(detail.packageContents)}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Declared value</p>
                        <p className="fw-bold mb-0">
                          {fmtMoney(detail.declaredValue)}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Pieces</p>
                        <p className="fw-bold mb-0">
                          {detail.pieceCount != null
                            ? detail.pieceCount
                            : "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Category ID</p>
                        <p className="fw-bold mb-0">
                          {detail.categoryId ?? "—"}
                        </p>
                      </div>
                      <div className="col-12">
                        <p className="text-muted mb-1">Special handling</p>
                        {parcelHandlingTags(detail).length > 0 ? (
                          <div className="d-flex flex-wrap gap-2">
                            {parcelHandlingTags(detail).map((tag) => (
                              <span
                                key={tag}
                                className="badge rounded-pill text-bg-light border text-dark"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="fw-bold mb-0">—</p>
                        )}
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">
                          Prohibited items confirmed
                        </p>
                        <p className="fw-bold mb-0">
                          {fmtYesNo(detail.prohibitedItemsAccepted)}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">
                          Parcel declaration confirmed
                        </p>
                        <p className="fw-bold mb-0">
                          {fmtYesNo(detail.parcelDeclarationAccepted)}
                        </p>
                      </div>
                      {detail.imageUrl ? (
                        <div className="col-12">
                          <p className="text-muted mb-1">Package photo</p>
                          <a
                            href={detail.imageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="small"
                          >
                            View photo
                          </a>
                        </div>
                      ) : null}
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Weight</p>
                        <p className="fw-bold mb-0">
                          {detail.weight != null ? `${detail.weight} kg` : "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Vehicle ID</p>
                        <p className="fw-bold mb-0">
                          {detail.vehicleId ?? "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Payment</p>
                        <p className="fw-bold mb-0">
                          {detail.paymentType ?? "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Delivery type</p>
                        <p className="fw-bold mb-0">
                          {detail.deliveryType ?? "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Origin hub</p>
                        <p className="fw-bold mb-0">
                          {detail.originHubCity
                            ? `${detail.originHubCity}${detail.originHubName ? ` (${detail.originHubName})` : ""}`
                            : detail.originHubId ?? "—"}
                        </p>
                      </div>
                      <div className="col-6 col-md-4">
                        <p className="text-muted mb-1">Destination hub</p>
                        <p className="fw-bold mb-0">
                          {detail.destinationHubCity
                            ? `${detail.destinationHubCity}${detail.destinationHubName ? ` (${detail.destinationHubName})` : ""}`
                            : detail.destinationHubId ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className="col-12 col-xxl-4 d-flex flex-column gap-4"
                  style={{ alignSelf: "flex-start" }}
                >
                  <div
                    className="d-flex flex-column gap-4"
                    style={{
                      position: "sticky",
                      top: 0,
                    }}
                  >
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

                  {String(detail?.serviceMode || "").toUpperCase() === "OUTSTATION" &&
                  getOutstationNextAdminAction(detail) ? (
                    <div className="dashboard-card border-0 shadow-sm border border-primary border-opacity-25 mb-3">
                      <h6 className="fw-bold mb-2">Next action</h6>
                      <p className="text-muted small mb-2">
                        {getOutstationNextAdminAction(detail)}
                      </p>
                      {String(detail?.paymentType || "").toUpperCase() === "COD" ? (
                        <span
                          className={`badge rounded-pill fw-semibold ${
                            detail?.codAlreadyCollected
                              ? "bg-success-subtle text-success"
                              : "bg-warning-subtle text-warning"
                          }`}
                        >
                          COD {detail?.codAlreadyCollected ? "collected from sender" : "pending — collect from sender"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="dashboard-card border-0 shadow-sm border border-warning border-opacity-25">
                    <h6 className="fw-bold mb-2 d-flex align-items-center gap-2">
                      <User size={18} /> Assign rider
                    </h6>
                    <p className="text-muted small mb-3">
                      Pickup rider for door pickup (Door to Door / Door to Hub) — nearby online riders.
                      Delivery rider for door delivery (Door to Door / Hub to Door) — any approved rider.
                      Out for Delivery is set automatically when a delivery rider is assigned.
                    </p>
                    {needsDeliveryRiderAssign(detail) ? (
                      <div className="alert alert-info small py-2 px-3 mb-3">
                        Parcel is at the destination hub. Use <strong>Delivery rider</strong>,
                        select any approved rider, then assign — status becomes{" "}
                        <strong>Out for delivery</strong>.
                      </div>
                    ) : null}
                    {needsPickupRiderAssign(detail) ? (
                      <div className="alert alert-info small py-2 px-3 mb-3">
                        Order is booked. Use <strong>Pickup rider</strong> to assign a rider near the sender.
                      </div>
                    ) : null}
                    <div className="d-flex flex-column gap-2">
                      <div className="small text-muted">
                        Currently assigned rider:{" "}
                        {detail?.riderId != null
                          ? `#${detail.riderId}`
                          : "Not assigned"}
                      </div>
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
                        disabled={actionBusy || availableRiders.length === 0}
                      >
                        <option value="">Select rider…</option>
                        {availableRiders.map((r) => (
                          <option key={r.id} value={String(r.id)}>
                            #{r.id} — {r.name ?? "Rider"} (
                            {r.vehicleType ?? "—"})
                          </option>
                        ))}
                      </select>
                      {availableRiders.length === 0 ? (
                        <div className="alert alert-light border small mb-0 py-2 px-3">
                          No approved riders found.
                          <button
                            type="button"
                            className="btn btn-sm btn-link p-0 ms-1 align-baseline"
                            onClick={() =>
                              loadEligibleRidersForOrder(detail, assignRolePick)
                            }
                            disabled={actionBusy}
                          >
                            Retry
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        className="btn text-white fw-semibold rounded-3 py-2"
                        style={{ backgroundColor: "#E51818" }}
                        disabled={
                          actionBusy ||
                          availableRiders.length === 0 ||
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
                          runAction(async () => {
                            const res = await orderService.assignRider(
                              selectedId,
                              payload,
                            );
                            const userId = detail?.userId;
                            if (userId != null) {
                              try {
                                await notificationAdminService.sendBroadcast({
                                  targetUserIds: [userId],
                                  title: "Rider Assigned",
                                  body: "Your rider is on the way! Track your delivery now.",
                                  data: {
                                    type: "RIDER_ASSIGNED",
                                    orderId: String(selectedId),
                                  },
                                });
                              } catch {
                                // notification is best-effort; assignment still succeeded
                              }
                            }
                            return res;
                          });
                        }}
                      >
                        Assign rider
                      </button>
                    </div>
                  </div>

                  {(canConfirmHubDrop(detail) || canConfirmHubCollect(detail)) && (
                    <div className="dashboard-card border-0 shadow-sm mb-3">
                      <h6 className="fw-bold mb-2">
                        {canConfirmHubDrop(detail)
                          ? "Confirm hub drop-off"
                          : "Confirm hub collection"}
                      </h6>
                      <p className="text-muted small mb-3">
                        {canConfirmHubDrop(detail)
                          ? "Enter the drop-off OTP from the customer app. For COD, collect payment from the sender at the hub."
                          : "Enter the collection OTP from the customer app (share with receiver)."}
                      </p>
                      <div className="d-flex flex-column gap-2">
                        <input
                          aria-label="Hub handover OTP"
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          className="form-control form-control-sm rounded-3"
                          placeholder="6-digit OTP"
                          value={hubHandoverOtp}
                          onChange={(e) =>
                            setHubHandoverOtp(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          disabled={actionBusy || hubHandoverOverride}
                        />
                        {canConfirmHubDrop(detail) &&
                        String(detail?.paymentType || "").toUpperCase() ===
                          "COD" &&
                        !(detail?.codAlreadyCollected === true) ? (
                          <select
                            aria-label="COD collection mode"
                            className="form-select form-select-sm rounded-3"
                            value={hubHandoverCodMode}
                            onChange={(e) => setHubHandoverCodMode(e.target.value)}
                            disabled={actionBusy || hubHandoverOverride}
                          >
                            <option value="CASH">COD — Cash from sender</option>
                            <option value="QR">COD — UPI QR from sender</option>
                          </select>
                        ) : null}
                        <label className="form-check small text-muted mb-0">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={hubHandoverOverride}
                            onChange={(e) => setHubHandoverOverride(e.target.checked)}
                            disabled={actionBusy}
                          />
                          Emergency override (skip OTP check)
                        </label>
                        <button
                          type="button"
                          className="btn btn-primary fw-semibold rounded-3 py-2"
                          disabled={actionBusy}
                          onClick={() =>
                            runAction(() =>
                              orderService.verifyHubHandover(selectedId, {
                                type: canConfirmHubDrop(detail) ? "DROP" : "COLLECT",
                                otp: hubHandoverOtp.trim() || undefined,
                                adminOverride: hubHandoverOverride,
                                codCollectionMode:
                                  canConfirmHubDrop(detail) &&
                                  String(detail?.paymentType || "").toUpperCase() ===
                                    "COD"
                                    ? hubHandoverCodMode
                                    : undefined,
                              }),
                            )
                          }
                        >
                          {canConfirmHubDrop(detail)
                            ? "Confirm drop at hub"
                            : "Confirm collection at hub"}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="dashboard-card border-0 shadow-sm">
                    <h6 className="fw-bold mb-2">Update status</h6>
                    <p className="text-muted small mb-3">
                      Hub transit and delivery milestones. Out for Delivery is only via Assign rider at destination hub.
                      {primaryNextStatus ? (
                        <>
                          {" "}
                          Recommended next:{" "}
                          <strong>{formatStatusLabel(primaryNextStatus)}</strong>
                        </>
                      ) : null}
                    </p>
                    <div className="d-flex flex-column gap-2">
                      <select
                        aria-label="Next status"
                        className="form-select form-select-sm rounded-3"
                        value={statusPick}
                        onChange={(e) => setStatusPick(e.target.value)}
                        disabled={actionBusy || nextStatuses.length === 0}
                      >
                        {nextStatuses.map((s) => (
                          <option key={s} value={s}>
                            {formatStatusLabel(s)}
                            {s === primaryNextStatus ? " (recommended)" : ""}
                          </option>
                        ))}
                      </select>
                      {String(detail?.serviceMode || "").toUpperCase() ===
                        "OUTSTATION" &&
                      outstationStatusRequiresOtp(statusPick) ? (
                        <>
                          <input
                            aria-label="OTP from customer"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            className="form-control form-control-sm rounded-3"
                            placeholder="6-digit OTP from customer app"
                            value={statusOtp}
                            onChange={(e) =>
                              setStatusOtp(
                                e.target.value.replace(/\D/g, "").slice(0, 6),
                              )
                            }
                            disabled={actionBusy || statusAdminOverride}
                          />
                          <label className="form-check small text-muted mb-0">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={statusAdminOverride}
                              onChange={(e) =>
                                setStatusAdminOverride(e.target.checked)
                              }
                              disabled={actionBusy}
                            />
                            Emergency override (skip OTP check)
                          </label>
                        </>
                      ) : null}
                      {canRecordPickupCod(detail, statusPick) && !statusAdminOverride ? (
                        <select
                          aria-label="COD collection mode at pickup"
                          className="form-select form-select-sm rounded-3"
                          value={pickupCodMode}
                          onChange={(e) => setPickupCodMode(e.target.value)}
                          disabled={actionBusy}
                        >
                          <option value="CASH">COD — Cash from sender</option>
                          <option value="QR">COD — UPI QR from sender</option>
                        </select>
                      ) : null}
                      <button
                        aria-label="Update status"
                        type="button"
                        className="btn btn-outline-primary fw-semibold rounded-3 py-2"
                        disabled={
                          actionBusy || nextStatuses.length === 0 || !statusPick
                        }
                        onClick={() =>
                          runAction(() =>
                            orderService.updateStatus(selectedId, {
                              status: toApiOrderStatus(statusPick),
                              ...(String(detail?.serviceMode || "").toUpperCase() ===
                                "OUTSTATION" &&
                              outstationStatusRequiresOtp(statusPick)
                                ? {
                                    otp: statusOtp.trim() || undefined,
                                    adminOverride: statusAdminOverride,
                                  }
                                : {}),
                              ...(canRecordPickupCod(detail, statusPick) &&
                              !statusAdminOverride
                                ? { codCollectionMode: pickupCodMode }
                                : {}),
                            }),
                          )
                        }
                      >
                        {nextStatuses.length === 0
                          ? "No valid next status"
                          : "Update status"}
                      </button>
                    </div>
                  </div>

                  {String(detail?.serviceMode || "").toUpperCase() ===
                  "OUTSTATION" ? (
                    <div className="dashboard-card border-0 shadow-sm">
                      <h6 className="fw-bold mb-3">Outstation milestones</h6>
                      <div className="d-flex flex-wrap gap-2">
                      {getOutstationMilestoneLabels(detail?.deliveryType).map(
                        (stepLabel, index) => {
                          const progressIndex = getOutstationProgressIndex(
                            detail?.status,
                            detail?.deliveryType,
                          );
                          const isCompleted = progressIndex > index;
                          const isCurrent = progressIndex === index;
                          const badgeClass = isCurrent
                            ? "bg-primary text-white"
                            : isCompleted
                              ? "bg-success-subtle text-success"
                              : "bg-light text-muted";
                          return (
                            <span
                              key={stepLabel}
                              className={`badge rounded-pill fw-semibold ${badgeClass}`}
                            >
                              {stepLabel}
                            </span>
                          );
                        })}
                      </div>
                      {OUTSTATION_EXCEPTION_STATUSES.includes(
                        canonicalOrderStatus(detail?.status),
                      ) ? (
                        <div className="mt-3">
                          <span className="badge bg-danger-subtle text-danger fw-semibold">
                            {formatStatusLabel(detail?.status)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

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
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 0.8s linear infinite; }
        .letter-spacing { letter-spacing: 0.06em; }
      `}</style>
    </>
  );
};

export default Orders;

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { adminSocketService } from "@/lib/adminSocketService";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { ALL_STATUSES, EXCEPTION_STATUSES } from "@/lib/status";
import {
  OUTSTATION_BULK_STATUSES,
  canBulkAdvanceGroupStatus,
  formatStatusLabel,
  getBulkRecommendedAction,
  getDefaultBulkStatus,
  getOutstationPrimaryNextStatus,
  orderMatchesDateFilter,
} from "@/lib/orderStatusUtils";
import { Search, X, Layers, ListFilter, ChevronRight, Radio, Volume2, BellRing, Copy } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["ALL", ...ALL_STATUSES, ...EXCEPTION_STATUSES];
const DATE_FILTERS = [
  ["ALL", "All dates"],
  ["TODAY", "Today"],
  ["YESTERDAY", "Yesterday"],
  ["CUSTOM", "Pick date"],
];

export default function Orders() {
  const nav = useNavigate();
  const [serviceMode, setServiceMode] = useState("OUTSTATION");
  const [status, setStatus] = useState("ALL");
  const [route, setRoute] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [assigned, setAssigned] = useState("ALL");
  const [q, setQ] = useState("");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [customDate, setCustomDate] = useState("");
  const [bulkStatus, setBulkStatus] = useState(OUTSTATION_BULK_STATUSES[0]);
  const [orders, setOrders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [view, setView] = useState("list"); // list | grouped
  const [selected, setSelected] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [expanded, setExpanded] = useState(new Set());
  const [live, setLive] = useState(false);
  const [alertOrder, setAlertOrder] = useState(null);
  const reloadRef = useRef(() => {});
  const lastReloadRef = useRef(0);
  const alertIntervalRef = useRef(null);
  const knownOutstationIdsRef = useRef(new Set());
  const alertInitializedRef = useRef(false);

  function filterParams() {
    const params = { service_mode: serviceMode };
    if (status !== "ALL") params.status = status;
    if (route !== "ALL") params.route = route;
    if (payment !== "ALL") params.payment = payment;
    if (assigned !== "ALL") params.assigned = assigned === "ASSIGNED" ? "yes" : "no";
    if (q) params.q = q;
    return params;
  }

  // Best-effort loud triple-pulse beep for incoming outstation orders.
  const playOutstationAlert = useCallback(() => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const gain = ctx.createGain();
      gain.connect(ctx.destination);
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
      window.setTimeout(() => { ctx.close().catch(() => {}); }, 1800);
    } catch {
      // sound is best-effort only
    }
  }, []);

  async function loadList() {
    const r = await api.get("/orders", { params: filterParams() });
    setOrders(r.data.orders);
    if (serviceMode === "OUTSTATION") detectNewOutstation(r.data.orders);
  }
  async function loadGroups() {
    const r = await api.get("/orders/grouped", { params: filterParams() });
    setGroups(r.data.groups);
  }

  const visibleOrders = useMemo(
    () => orders.filter((o) => orderMatchesDateFilter(o, dateFilter, customDate)),
    [orders, dateFilter, customDate],
  );

  const filteredGroups = useMemo(() => {
    return groups
      .map((g) => {
        const routes = (g.routes || [])
          .map((r) => {
            const routeOrders = (r.orders || []).filter((o) =>
              orderMatchesDateFilter(o, dateFilter, customDate),
            );
            return {
              ...r,
              orders: routeOrders,
              count: routeOrders.length,
              order_ids: routeOrders.map((o) => o.id),
            };
          })
          .filter((r) => r.count > 0);
        const total = routes.reduce((sum, r) => sum + r.count, 0);
        return { ...g, routes, total };
      })
      .filter((g) => g.total > 0);
  }, [groups, dateFilter, customDate]);

  const selectedOrders = useMemo(() => {
    const pool = view === "list" ? visibleOrders : filteredGroups.flatMap((g) => g.routes.flatMap((r) => r.orders || []));
    return pool.filter((o) => selected.has(o.id));
  }, [visibleOrders, filteredGroups, selected, view]);

  // Track outstation order ids across reloads; trigger the alert loop on new arrivals.
  function detectNewOutstation(list = []) {
    const outstationIds = new Set(
      list
        .filter((o) => String(o.serviceMode || "").toUpperCase() === "OUTSTATION")
        .map((o) => String(o.id))
        .filter(Boolean),
    );
    if (alertInitializedRef.current) {
      for (const id of outstationIds) {
        if (!knownOutstationIdsRef.current.has(id)) {
          setAlertOrder(list.find((o) => String(o.id) === id) || { id });
          break;
        }
      }
    } else {
      alertInitializedRef.current = true;
    }
    knownOutstationIdsRef.current = outstationIds;
  }

  useEffect(() => { api.get("/orders/routes").then(r => setRoutes(r.data.routes)); }, []);
  useEffect(() => {
    if (view === "list") loadList();
    else loadGroups();
    // eslint-disable-next-line
  }, [serviceMode, status, route, payment, assigned, q, view]);

  useEffect(() => {
    setSelected(new Set());
  }, [serviceMode, status, route, payment, assigned, q, dateFilter, customDate, view]);

  const selectionKey = Array.from(selected).sort((a, b) => a - b).join(",");
  useEffect(() => {
    if (!selectionKey) return;
    setBulkStatus(getDefaultBulkStatus(selectedOrders));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  // Loop the alert sound every 3.5s until the admin acknowledges it.
  useEffect(() => {
    if (alertOrder) {
      playOutstationAlert();
      alertIntervalRef.current = window.setInterval(playOutstationAlert, 3500);
    }
    return () => {
      if (alertIntervalRef.current != null) {
        window.clearInterval(alertIntervalRef.current);
        alertIntervalRef.current = null;
      }
    };
  }, [alertOrder, playOutstationAlert]);

  // Keep a stable reference to the current loader so the socket can refresh live.
  reloadRef.current = () => {
    const now = Date.now();
    if (now - lastReloadRef.current < 1000) return; // throttle bursty pushes
    lastReloadRef.current = now;
    if (view === "list") loadList();
    else loadGroups();
  };

  // Subscribe once to live admin order updates (STOMP over /topic/admin/orders).
  useEffect(() => {
    const unsubscribe = adminSocketService.subscribe((evt) => {
      setLive(true);
      reloadRef.current();
      if (evt && String(evt.serviceMode || "").toUpperCase() === "OUTSTATION" && evt.orderId != null) {
        setAlertOrder({ id: evt.orderId, status: evt.status, serviceMode: evt.serviceMode });
      }
    });
    return unsubscribe;
    // eslint-disable-next-line
  }, []);

  const visibleIds = visibleOrders.map((o) => o.id);
  const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));

  function toggleIds(ids, allCurrentlySelected) {
    const n = new Set(selected);
    if (allCurrentlySelected) ids.forEach((id) => n.delete(id));
    else ids.forEach((id) => n.add(id));
    setSelected(n);
  }

  function toggleAll() {
    toggleIds(visibleIds, allSelected);
  }
  function toggleRow(id) {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  }
  function toggleExpand(key) {
    const n = new Set(expanded);
    n.has(key) ? n.delete(key) : n.add(key);
    setExpanded(n);
  }

  async function bulkAdvance(orderIds, newStatus) {
    if (!newStatus) return;
    const results = await Promise.allSettled(
      orderIds.map((id) => api.post(`/orders/${id}/status`, { status: newStatus })),
    );
    const updated = results.filter((result) => result.status === "fulfilled").length;
    const skipped = results.length - updated;
    if (skipped) toast.warning(`Updated ${updated} · skipped ${skipped}`);
    else toast.success(`Updated ${updated} orders → ${formatStatusLabel(newStatus)}`);
    setSelected(new Set());
    if (view === "list") loadList(); else loadGroups();
  }

  async function runBulkStatusUpdate() {
    if (selected.size === 0 || !bulkStatus) return;
    await bulkAdvance(Array.from(selected), bulkStatus);
  }

  const bulkRecommended = getBulkRecommendedAction(selectedOrders);

  return (
    <div data-testid="orders-page">
      <PageHeader
        title="Orders"
        subtitle="Outstation & incity dispatch operations"
        actions={
          <div className="flex gap-2 items-center">
            <span className={`chip ${live ? "text-emerald-700" : "text-zinc-400"}`} data-testid="live-indicator" title="Live order updates">
              <Radio size={12} className={live ? "text-emerald-500" : "text-zinc-400"} /> {live ? "Live" : "Connecting…"}
            </span>
<button data-testid="view-list" onClick={() => setView("list")} className={`chip ${view === "list" ? "chip-active" : ""}`}><ListFilter size={12} /> List</button>
            <button data-testid="view-grouped" onClick={() => setView("grouped")} className={`chip ${view === "grouped" ? "chip-active" : ""}`}><Layers size={12} /> Grouped</button>
          </div>
        }
      />

      {alertOrder && (
        <div className="surface p-3 mb-4 flex items-center justify-between border-l-4 border-l-[var(--brand-red)] bg-rose-50" data-testid="outstation-alert">
          <div className="flex items-center gap-2 text-[13px] text-rose-900">
            <BellRing size={16} className="text-rose-600 animate-pulse" />
            <span className="font-semibold">New outstation order</span>
            <span className="text-rose-700">#{alertOrder.id}{alertOrder.status ? ` · ${String(alertOrder.status).replaceAll("_", " ")}` : ""}</span>
          </div>
          <button onClick={() => setAlertOrder(null)} data-testid="ack-outstation-alert"
            className="text-[12px] bg-rose-600 text-white px-3 py-1.5 rounded-sm hover:bg-rose-700 flex items-center gap-1">
            <Volume2 size={12} /> Acknowledge
          </button>
        </div>
      )}

      {/* Service mode tabs */}
      <div className="tabbar mb-4">
        {["OUTSTATION", "INCITY"].map(m => (
          <button key={m} data-testid={`tab-${m.toLowerCase()}`}
            className={serviceMode === m ? "active" : ""} onClick={() => setServiceMode(m)}>{m}</button>
        ))}
      </div>

      {/* Sticky filter bar */}
      <div className="surface p-3 mb-4 flex items-center gap-2 flex-wrap" data-testid="filter-bar">
        <div className="relative">
          <Search size={13} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input data-testid="search-input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search tracking ID, sender, receiver…"
            className="pl-7 h-8 w-72 text-[13px] border border-[var(--border-default)] rounded-sm" />
        </div>
        <Select label="Status" value={status} onChange={setStatus} options={STATUS_OPTIONS} testid="filter-status" />
        <Select label="Route" value={route} onChange={setRoute} options={["ALL", ...routes.map(r => r.key)]}
          display={(v) => v === "ALL" ? "All routes" : (routes.find(r => r.key === v)?.label || v)} testid="filter-route" />
        <Select label="Payment" value={payment} onChange={setPayment} options={["ALL", "PREPAID", "COD"]} testid="filter-payment" />
        <Select label="Assigned" value={assigned} onChange={setAssigned} options={["ALL", "ASSIGNED", "UNASSIGNED"]} testid="filter-assigned" />
        <Select label="Date" value={dateFilter} onChange={setDateFilter} options={DATE_FILTERS.map(([v]) => v)}
          display={(v) => DATE_FILTERS.find(([k]) => k === v)?.[1] || v} testid="filter-date" />
        {dateFilter === "CUSTOM" && (
          <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)}
            data-testid="filter-custom-date"
            className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2" />
        )}
        <button data-testid="reset-filters" onClick={() => {
          setStatus("ALL"); setRoute("ALL"); setPayment("ALL"); setAssigned("ALL"); setQ("");
          setDateFilter("ALL"); setCustomDate("");
        }}
          className="chip"><X size={12} /> Reset</button>
        <div className="ml-auto text-[12px] text-zinc-500">
          {view === "list"
            ? `${visibleOrders.length} orders`
            : `${filteredGroups.length} groups · ${filteredGroups.reduce((s, g) => s + g.total, 0)} orders`}
        </div>
      </div>

      {view === "list" ? (
        <div className="surface overflow-hidden">
          <table className="tbl" data-testid="orders-table">
            <thead>
              <tr>
                <th style={{ width: 30 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} data-testid="select-all" />
                </th>
                <th>Tracking ID</th>
                <th>Route</th>
                <th>Status</th>
                <th>Delivery</th>
                <th>Payment</th>
                <th>Weight</th>
                <th>Total</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.length === 0 && (
                <tr><td colSpan={10} className="empty">No orders matching filters.</td></tr>
              )}
              {visibleOrders.map(o => (
                <tr key={o.id} className="row-link" data-testid={`order-row-${o.tracking_id}`}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)}
                      data-testid={`select-${o.tracking_id}`} />
                  </td>
                  <td className="mono text-[12px] font-semibold">
                    <div className="flex items-center gap-1.5">
                      <span onClick={() => nav(`/orders/${o.id}`)} className="cursor-pointer">{o.tracking_id}</span>
                      <button type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(o.tracking_id); toast.success("Copied!"); }}
                        className="text-zinc-300 hover:text-zinc-600 transition flex-shrink-0" title="Copy order ID">
                        <Copy size={11} />
                      </button>
                    </div>
                  </td>
                  <td onClick={() => nav(`/orders/${o.id}`)}>{o.origin_city} → {o.destination_city}</td>
                  <td onClick={() => nav(`/orders/${o.id}`)}><StatusPill status={o.status} /></td>
                  <td onClick={() => nav(`/orders/${o.id}`)} className="text-[11px] text-zinc-600">{o.delivery_type.replaceAll("_", "→")}</td>
                  <td onClick={() => nav(`/orders/${o.id}`)}>
                    <span className={`pill ${o.payment_mode === "COD" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-800 border-emerald-300"}`}>{o.payment_mode}</span>
                  </td>
                  <td onClick={() => nav(`/orders/${o.id}`)} className="mono text-[12px]">{o.weight_kg} kg</td>
                  <td onClick={() => nav(`/orders/${o.id}`)} className="mono text-[12px]">₹{o.fare.total}</td>
                  <td onClick={() => nav(`/orders/${o.id}`)} className="text-[11px] text-zinc-500">{new Date(o.created_at).toLocaleString()}</td>
                  <td onClick={() => nav(`/orders/${o.id}`)}><ChevronRight size={14} className="text-zinc-400" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3" data-testid="grouped-view">
          {filteredGroups.map(g => {
            const statusOrderIds = g.routes.flatMap((r) => r.order_ids || []);
            const allStatusSelected = statusOrderIds.length > 0 && statusOrderIds.every((id) => selected.has(id));
            const someStatusSelected = statusOrderIds.some((id) => selected.has(id));
            return (
            <div key={g.status} className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={allStatusSelected}
                    ref={(el) => { if (el) el.indeterminate = someStatusSelected && !allStatusSelected; }}
                    onChange={() => toggleIds(statusOrderIds, allStatusSelected)}
                    data-testid={`group-select-status-${g.status}`}
                    title="Select all orders in this status"
                  />
                  <StatusPill status={g.status} />
                  <span className="text-[12px] text-zinc-500">{g.total} orders</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {g.routes.map(r => {
                  const sample = r.orders?.[0];
                  const next = sample ? getOutstationPrimaryNextStatus(sample) : null;
                  const canAdvance = next && canBulkAdvanceGroupStatus(g.status);
                  const routeIds = r.order_ids || [];
                  const allRouteSelected = routeIds.length > 0 && routeIds.every((id) => selected.has(id));
                  const someRouteSelected = routeIds.some((id) => selected.has(id));
                  const key = `${g.status}::${r.route}`;
                  const isOpen = expanded.has(key);
                  return (
                    <div key={r.route} className="border border-[var(--border-default)] rounded-sm overflow-hidden">
                      <div className="flex justify-between items-center px-3 py-2 gap-2">
                        <input
                          type="checkbox"
                          checked={allRouteSelected}
                          ref={(el) => { if (el) el.indeterminate = someRouteSelected && !allRouteSelected; }}
                          onChange={() => toggleIds(routeIds, allRouteSelected)}
                          data-testid={`group-select-route-${g.status}-${r.route.replace(/[^a-z]/gi, '')}`}
                          title="Select all orders on this route"
                        />
                        <button
                          onClick={() => toggleExpand(key)}
                          data-testid={`group-route-toggle-${g.status}-${r.route.replace(/[^a-z]/gi, '')}`}
                          className="flex items-center gap-2 text-left flex-1 hover:opacity-70">
                          <ChevronRight size={14} className={`text-zinc-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                          <span className="text-[13px]">{r.route}</span>
                          <span className="text-[11px] text-zinc-500">({r.count})</span>
                        </button>
                        {canAdvance && (
                          <button data-testid={`advance-all-${g.status}-${r.route.replace(/[^a-z]/gi, '')}`}
                            onClick={() => bulkAdvance(routeIds, next)}
                            className="text-[12px] px-2 py-1 bg-zinc-900 text-white rounded-sm hover:bg-zinc-800 whitespace-nowrap">
                            Advance all → {formatStatusLabel(next)}
                          </button>
                        )}
                      </div>
                      {isOpen && (
                        <div className="border-t border-[var(--border-default)] bg-zinc-50/60" data-testid={`group-route-orders-${g.status}-${r.route.replace(/[^a-z]/gi, '')}`}>
                          {(r.orders || []).map(o => (
                            <div key={o.id}
                              data-testid={`group-order-${o.tracking_id}`}
                              className="flex items-center gap-3 px-3 py-2 text-[12px] border-b border-[var(--border-default)] last:border-b-0 hover:bg-white">
                              <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)}
                                data-testid={`group-select-${o.tracking_id}`} />
                              <div className="flex items-center justify-between flex-1 cursor-pointer" onClick={() => nav(`/orders/${o.id}`)}>
                                <span className="mono font-semibold flex items-center gap-1">
                                  {o.tracking_id}
                                  <button type="button" onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(o.tracking_id); toast.success("Copied!"); }}
                                    className="text-zinc-300 hover:text-zinc-600 transition" title="Copy order ID">
                                    <Copy size={11} />
                                  </button>
                                </span>
                                <span className="text-zinc-500">{o.sender?.name} → {o.receiver?.name}</span>
                                <span className={`pill ${o.payment_mode === "COD" ? "bg-amber-50 text-amber-800 border-amber-300" : "bg-emerald-50 text-emerald-800 border-emerald-300"}`}>{o.payment_mode}</span>
                                <span className="mono">{o.weight_kg} kg</span>
                                <span className="mono">₹{o.fare?.total}</span>
                                <span className="text-zinc-500">{new Date(o.created_at).toLocaleString()}</span>
                                <ChevronRight size={13} className="text-zinc-400" />
                              </div>
                            </div>
                          ))}
                          {(r.orders || []).length === 0 && (
                            <div className="px-3 py-2 text-[12px] text-zinc-400">No orders in this route.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
          })}
          {filteredGroups.length === 0 && <div className="empty surface">No grouped orders.</div>}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bulkbar flex-wrap gap-2" data-testid="bulk-bar">
          <span className="text-[12px] text-zinc-300 font-semibold">{selected.size} selected</span>
          {bulkRecommended && (
            <span className="text-[11px] text-zinc-400">Recommended: {bulkRecommended}</span>
          )}
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            data-testid="bulk-status-select"
            className="h-8 text-[12px] border border-zinc-600 rounded-sm px-2 bg-zinc-800 text-white"
          >
            {OUTSTATION_BULK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatusLabel(s)}
                {s === getOutstationPrimaryNextStatus(selectedOrders[0]) ? " (recommended)" : ""}
              </option>
            ))}
          </select>
          <button data-testid="bulk-status-submit" onClick={runBulkStatusUpdate}
            className="text-[12px] bg-white text-zinc-900 px-3 py-1.5 rounded-sm font-medium">
            Update {selected.size} orders
          </button>
          <button data-testid="bulk-clear" onClick={() => setSelected(new Set())}
            className="text-[12px] text-zinc-400 px-2"><X size={12} /></button>
        </div>
      )}
    </div>
  );
}

function Select({ label, value, onChange, options, display, testid }) {
  return (
    <label className="flex items-center gap-2 text-[12px] text-zinc-600">
      <span className="text-zinc-500">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        data-testid={testid}
        className="h-8 text-[12px] border border-[var(--border-default)] rounded-sm px-2 bg-white">
        {options.map(o => <option key={o} value={o}>{display ? display(o) : o.replaceAll("_", " ")}</option>)}
      </select>
    </label>
  );
}


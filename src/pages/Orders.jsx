import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { BACKEND_URL } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { ALL_STATUSES, EXCEPTION_STATUSES } from "@/lib/status";
import { Search, X, Layers, ListFilter, ChevronRight, Download } from "lucide-react";
import { toast } from "sonner";

const STATUS_OPTIONS = ["ALL", ...ALL_STATUSES, ...EXCEPTION_STATUSES];

export default function Orders() {
  const nav = useNavigate();
  const [serviceMode, setServiceMode] = useState("OUTSTATION");
  const [status, setStatus] = useState("ALL");
  const [route, setRoute] = useState("ALL");
  const [payment, setPayment] = useState("ALL");
  const [assigned, setAssigned] = useState("ALL");
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [view, setView] = useState("list"); // list | grouped
  const [selected, setSelected] = useState(new Set());
  const [groups, setGroups] = useState([]);
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  async function loadList() {
    const params = { service_mode: serviceMode };
    if (status !== "ALL") params.status = status;
    if (route !== "ALL") params.route = route;
    if (payment !== "ALL") params.payment = payment;
    if (assigned !== "ALL") params.assigned = assigned === "ASSIGNED" ? "yes" : "no";
    if (q) params.q = q;
    const r = await api.get("/orders", { params });
    setOrders(r.data.orders);
    setSelected(new Set());
  }
  async function loadGroups() {
    const r = await api.get("/orders/grouped");
    setGroups(r.data.groups);
  }
  useEffect(() => { api.get("/orders/routes").then(r => setRoutes(r.data.routes)); }, []);
  useEffect(() => {
    if (view === "list") loadList();
    else loadGroups();
    // eslint-disable-next-line
  }, [serviceMode, status, route, payment, assigned, q, view]);

  const allSelected = orders.length > 0 && selected.size === orders.length;
  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(orders.map(o => o.id)));
  }
  function toggleRow(id) {
    const n = new Set(selected);
    n.has(id) ? n.delete(id) : n.add(id);
    setSelected(n);
  }

  async function bulkAdvance(orderIds, newStatus) {
    const results = await Promise.allSettled(
      orderIds.map((id) => api.post(`/orders/${id}/status`, { status: newStatus })),
    );
    const updated = results.filter((result) => result.status === "fulfilled").length;
    const skipped = results.length - updated;
    if (skipped) toast.warning(`Updated ${updated} · skipped ${skipped}`);
    else toast.success(`Updated ${updated} orders → ${newStatus}`);
    if (view === "list") loadList(); else loadGroups();
  }

  function exportCsv() {
    const params = new URLSearchParams({ service_mode: serviceMode });
    if (status !== "ALL") params.set("status", status);
    if (payment !== "ALL") params.set("payment", payment);
    if (q) params.set("q", q);
    const url = `${BACKEND_URL}/api/exports/orders.csv?${params.toString()}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${serviceMode.toLowerCase()}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    toast.success("Exporting orders…");
  }

  return (
    <div data-testid="orders-page">
      <PageHeader
        title="Orders"
        subtitle="Outstation & incity dispatch operations"
        actions={
          <div className="flex gap-2">
            <button data-testid="view-list" onClick={() => setView("list")} className={`chip ${view === "list" ? "chip-active" : ""}`}><ListFilter size={12} /> List</button>
            <button data-testid="view-grouped" onClick={() => setView("grouped")} className={`chip ${view === "grouped" ? "chip-active" : ""}`}><Layers size={12} /> Grouped</button>
            <button data-testid="export-orders-btn" onClick={exportCsv} className="chip">Export CSV</button>
          </div>
        }
      />

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
        <button data-testid="reset-filters" onClick={() => { setStatus("ALL"); setRoute("ALL"); setPayment("ALL"); setAssigned("ALL"); setQ(""); }}
          className="chip"><X size={12} /> Reset</button>
        <div className="ml-auto text-[12px] text-zinc-500">
          {view === "list" ? `${orders.length} orders` : `${groups.length} groups`}
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
              {orders.length === 0 && (
                <tr><td colSpan={10} className="empty">No orders matching filters.</td></tr>
              )}
              {orders.map(o => (
                <tr key={o.id} className="row-link" data-testid={`order-row-${o.tracking_id}`}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(o.id)} onChange={() => toggleRow(o.id)}
                      data-testid={`select-${o.tracking_id}`} />
                  </td>
                  <td onClick={() => nav(`/orders/${o.id}`)} className="mono text-[12px] font-semibold">{o.tracking_id}</td>
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
          {groups.map(g => (
            <div key={g.status} className="surface p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <StatusPill status={g.status} />
                  <span className="text-[12px] text-zinc-500">{g.total} orders</span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {g.routes.map(r => {
                  const nextStatusMap = {
                    BOOKED: "RIDER_ASSIGNED",
                    RIDER_ASSIGNED: "PICKED_UP",
                    PICKED_UP: "AT_ORIGIN_HUB",
                    AT_ORIGIN_HUB: "IN_TRANSIT",
                    IN_TRANSIT: "AT_DESTINATION_HUB",
                    AT_DESTINATION_HUB: "OUT_FOR_DELIVERY",
                    OUT_FOR_DELIVERY: "DELIVERED",
                    AWAITING_HUB_COLLECTION: "COLLECTED",
                  };
                  const next = nextStatusMap[g.status];
                  const canAdvance = !!next && !["BOOKED", "RIDER_ASSIGNED", "OUT_FOR_DELIVERY", "AWAITING_HUB_COLLECTION"].includes(g.status);
                  return (
                    <div key={r.route} className="flex justify-between items-center px-3 py-2 border border-[var(--border-default)] rounded-sm">
                      <div className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-zinc-400" />
                        <span className="text-[13px]">{r.route}</span>
                        <span className="text-[11px] text-zinc-500">({r.count})</span>
                      </div>
                      {canAdvance && (
                        <button data-testid={`advance-all-${g.status}-${r.route.replace(/[^a-z]/gi, '')}`}
                          onClick={() => bulkAdvance(r.order_ids, next)}
                          className="text-[12px] px-2 py-1 bg-zinc-900 text-white rounded-sm hover:bg-zinc-800">
                          Advance all → {next.replaceAll("_", " ")}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          {groups.length === 0 && <div className="empty surface">No grouped orders.</div>}
        </div>
      )}

      {selected.size > 0 && (
        <div className="bulkbar" data-testid="bulk-bar">
          <span className="text-[12px] text-zinc-300">{selected.size} selected</span>
          <button data-testid="bulk-status-btn" onClick={() => setBulkStatusOpen(true)}
            className="text-[12px] bg-zinc-700 text-white px-3 py-1.5 rounded-sm">Change status</button>
          <button data-testid="bulk-clear" onClick={() => setSelected(new Set())}
            className="text-[12px] text-zinc-400 px-2"><X size={12} /></button>
        </div>
      )}

      <BulkStatusModal
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        orderIds={Array.from(selected)}
        onUpdated={() => { setSelected(new Set()); loadList(); }}
      />
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

function BulkStatusModal({ open, onOpenChange, orderIds, onUpdated }) {
  const [status, setStatus] = useState("IN_TRANSIT");
  if (!open) return null;
  async function submit() {
    const results = await Promise.allSettled(
      orderIds.map((id) => api.post(`/orders/${id}/status`, { status })),
    );
    const updated = results.filter((result) => result.status === "fulfilled").length;
    const skipped = results.length - updated;
    if (skipped) {
      toast.warning(`Updated ${updated}, skipped ${skipped} (invalid transition)`);
    } else {
      toast.success(`Updated ${updated} orders → ${status}`);
    }
    onOpenChange(false);
    onUpdated?.();
  }
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="bulk-status-modal">
      <div className="surface w-[400px] p-5">
        <h3 className="text-lg font-semibold mb-3" style={{ fontFamily: "Outfit" }}>Bulk change status</h3>
        <p className="text-[12px] text-zinc-500 mb-3">Updating {orderIds.length} orders</p>
        <select value={status} onChange={e => setStatus(e.target.value)} data-testid="bulk-status-select"
          className="w-full h-9 text-sm border border-[var(--border-default)] rounded-sm px-2">
          {[...ALL_STATUSES, ...EXCEPTION_STATUSES].map(s => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
        </select>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={() => onOpenChange(false)} className="chip" data-testid="bulk-status-cancel">Cancel</button>
          <button onClick={submit} className="text-[12px] bg-zinc-900 text-white px-3 py-1.5 rounded-sm" data-testid="bulk-status-submit">Update {orderIds.length} orders</button>
        </div>
      </div>
    </div>
  );
}

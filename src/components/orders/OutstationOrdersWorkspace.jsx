import {
  Search,
  RefreshCw,
  Package,
  Copy,
  Share2,
  Printer,
  Truck,
  CreditCard,
  Navigation,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  CANONICAL_ORDER_STATUSES,
  canonicalOrderStatus,
  formatStatusLabel,
  getOutstationMilestoneLabels,
  getOutstationProgressIndex,
  statusBadgeClass,
  outstationStatusRequiresOtp,
} from "../../utils/orderStatusUtils";
import "./outstationOrders.css";

const DETAIL_TABS = [
  { id: "overview", label: "Overview" },
  { id: "package", label: "Package & Order" },
  { id: "financials", label: "Financials" },
  { id: "activity", label: "Activity" },
];

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

function formatTimeAgo(iso) {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  } catch {
    return "";
  }
}

function fmtMoney(n) {
  return n == null || Number.isNaN(Number(n))
    ? "—"
    : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtAddress(s) {
  const v = String(s || "").trim();
  return v || "—";
}

function fmtYesNo(v) {
  return v === true ? "Yes" : v === false ? "No" : "—";
}

function parcelHandlingTags(d) {
  const tags = [];
  if (d?.isFragile) tags.push("Fragile");
  if (d?.containsLiquid) tags.push("Liquid");
  if (d?.containsBattery) tags.push("Battery");
  return tags;
}

function OrderListCard({
  order,
  isSelected,
  isChecked,
  onSelect,
  onToggleCheck,
}) {
  const id = order.id ?? order.orderId;
  const status = canonicalOrderStatus(order.status);
  const payment = String(order.paymentType || "").toUpperCase();
  const riderLabel =
    order.pickupRiderId || order.deliveryRiderId || order.riderId
      ? `#${order.pickupRiderId || order.deliveryRiderId || order.riderId}`
      : "—";

  return (
    <div
      className={`os-order-card ${isSelected ? "selected" : ""} ${isChecked ? "checked" : ""}`}
      onClick={() => onSelect(order)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect(order);
      }}
    >
      <div className="os-order-card-top">
        <input
          type="checkbox"
          className="form-check-input flex-shrink-0 mt-1"
          checked={isChecked}
          onChange={(e) => onToggleCheck(id, e)}
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex-grow-1 min-w-0">
          <div className="d-flex justify-content-between align-items-start gap-1">
            <span className="os-order-id">#{id}</span>
            <span className="os-order-meta fw-semibold">{fmtMoney(order.totalAmount)}</span>
          </div>
          <div className="os-order-meta">{formatWhen(order.createdAt)}</div>
          <div className="os-order-meta">User #{order.userId ?? "—"}</div>
          <div className="os-badge-row">
            <span className={`os-mini-badge status-booked`}>
              {formatStatusLabel(status)}
            </span>
            {payment === "COD" ? (
              <span className="os-mini-badge status-cod">COD</span>
            ) : null}
          </div>
          <div className="os-order-meta d-flex align-items-center gap-1 mt-1">
            <Truck size={10} />
            Rider: {riderLabel}
            {order.createdAt ? (
              <span className="ms-auto">{formatTimeAgo(order.createdAt)}</span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailFieldGrid({ fields }) {
  return (
    <div className="os-field-grid">
      {fields.map(([label, value]) => (
        <div key={label}>
          <div className="os-field-label">{label}</div>
          <div className="os-field-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

export default function OutstationOrdersWorkspace({
  loading,
  error,
  onRefresh,
  serviceModeCounts,
  serviceModeTab,
  onServiceModeChange,
  search,
  onSearchChange,
  statusTab,
  onStatusTabChange,
  statusCounts,
  routeFilter,
  onRouteFilterChange,
  availableRoutes,
  modeFilteredCount,
  paymentFilter,
  onPaymentFilterChange,
  assignedToFilter,
  onAssignedToFilterChange,
  onClearFilters,
  hasActiveFilters,
  sortOrder,
  onSortOrderChange,
  statusGroups,
  collapsedGroups,
  onToggleGroupCollapse,
  filteredOrders,
  selectedId,
  selectedOrderIds,
  onToggleOrderSelection,
  onToggleSelectAll,
  onSelectOrder,
  detail,
  detailLoading,
  detailTab,
  onDetailTabChange,
  onNavigateOrder,
  primaryNextStatus,
  actionPanel,
  bulkBar,
}) {
  const allVisibleSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrderIds.has(o.id ?? o.orderId));

  const progressIndex = detail
    ? getOutstationProgressIndex(detail.status, detail.deliveryType)
    : -1;
  const milestoneLabels = detail
    ? getOutstationMilestoneLabels(detail.deliveryType)
    : [];

  const copyOrderId = () => {
    if (selectedId != null) {
      navigator.clipboard?.writeText(String(selectedId)).catch(() => {});
    }
  };

  return (
    <div className={`os-orders-page ${bulkBar ? "pb-5 mb-4" : ""}`}>
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2 px-1">
        <div>
          <h2 className="fw-bold mb-0" style={{ fontSize: "1.35rem" }}>
            Orders
          </h2>
        </div>
        <button
          type="button"
          className="btn btn-sm d-flex align-items-center gap-2 text-white border-0"
          style={{ backgroundColor: "#E51818", borderRadius: 8 }}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="alert alert-danger mb-2 py-2 small rounded-3">{error}</div>
      ) : null}

      <div className="os-orders-toolbar">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <div className="os-mode-tabs">
            {["INCITY", "OUTSTATION"].map((tab) => {
              const active = serviceModeTab === tab;
              const count = serviceModeCounts[tab] ?? 0;
              return (
                <button
                  key={tab}
                  type="button"
                  className={`os-mode-tab ${active ? "active" : ""}`}
                  onClick={() => onServiceModeChange(tab)}
                >
                  {tab === "INCITY" ? "Incity" : "Outstation"} ({count})
                </button>
              );
            })}
          </div>

          <div className="os-search-wrap">
            <Search size={14} />
            <input
              type="text"
              className="form-control form-control-sm"
              placeholder="Search Order ID, User ID, Rider ID…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="os-filter-row">
          <select
            className="form-select form-select-sm os-filter-select"
            value={statusTab}
            onChange={(e) => onStatusTabChange(e.target.value)}
          >
            <option value="All">All Statuses ({statusCounts.All ?? 0})</option>
            {CANONICAL_ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatusLabel(s)} ({statusCounts[s] ?? 0})
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm os-filter-select"
            value={routeFilter}
            onChange={(e) => onRouteFilterChange(e.target.value)}
          >
            <option value="All Routes">Route (Outstation)</option>
            {availableRoutes.map((route) => (
              <option key={route} value={route}>
                {route}
              </option>
            ))}
          </select>

          <select
            className="form-select form-select-sm os-filter-select"
            value={paymentFilter}
            onChange={(e) => onPaymentFilterChange(e.target.value)}
          >
            <option value="All">Payment (All)</option>
            <option value="COD">COD</option>
            <option value="PREPAID">Prepaid</option>
            <option value="ONLINE">Online</option>
          </select>

          <select
            className="form-select form-select-sm os-filter-select"
            value={assignedToFilter}
            onChange={(e) => onAssignedToFilterChange(e.target.value)}
          >
            <option value="All">Assigned To (All)</option>
            <option value="Unassigned">Unassigned</option>
            <option value="Assigned">Assigned</option>
          </select>

          {hasActiveFilters ? (
            <button
              type="button"
              className="btn btn-sm btn-link text-decoration-none text-muted p-0"
              onClick={onClearFilters}
            >
              Clear Filters
            </button>
          ) : null}
        </div>

        {availableRoutes.length > 0 ? (
          <div className="os-route-chips mt-2">
            <button
              type="button"
              className={`os-route-chip ${routeFilter === "All Routes" ? "active" : ""}`}
              onClick={() => onRouteFilterChange("All Routes")}
            >
              All routes ({modeFilteredCount})
            </button>
            {availableRoutes.map((route) => (
              <button
                key={route}
                type="button"
                className={`os-route-chip ${routeFilter === route ? "active" : ""}`}
                onClick={() => onRouteFilterChange(route)}
              >
                {route}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="os-workspace">
        {/* Left — order list */}
        <aside className="os-list-panel">
          <div className="os-list-header">
            <label className="d-flex align-items-center gap-2 mb-0 cursor-pointer">
              <input
                type="checkbox"
                className="form-check-input"
                checked={allVisibleSelected}
                onChange={onToggleSelectAll}
              />
              Select All
            </label>
            <select
              className="form-select form-select-sm border-0 bg-transparent p-0"
              style={{ width: "auto", fontSize: "0.75rem" }}
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value)}
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
            </select>
          </div>

          <div className="os-list-scroll custom-scrollbar">
            {loading ? (
              <div className="text-center py-4 text-muted small">Loading…</div>
            ) : statusGroups.length === 0 ? (
              <div className="text-center py-4 text-muted small">No orders in this view.</div>
            ) : (
              statusGroups.map(([status, groupOrders]) => {
                const collapsed = collapsedGroups.has(status);
                return (
                  <div key={status} className="os-status-group">
                    <div
                      className="os-status-group-header"
                      onClick={() => onToggleGroupCollapse(status)}
                      role="button"
                      tabIndex={0}
                    >
                      {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      <span className="os-status-group-title">
                        {formatStatusLabel(status).toUpperCase()} ({groupOrders.length})
                      </span>
                    </div>
                    {!collapsed
                      ? groupOrders.map((order) => {
                          const id = order.id ?? order.orderId;
                          return (
                            <OrderListCard
                              key={id}
                              order={order}
                              isSelected={selectedId === id}
                              isChecked={selectedOrderIds.has(id)}
                              onSelect={onSelectOrder}
                              onToggleCheck={onToggleOrderSelection}
                            />
                          );
                        })
                      : null}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center — order detail */}
        <section className="os-detail-panel">
          {!detail || selectedId == null ? (
            <div className="os-empty-state">
              <Package size={40} className="mb-2 opacity-50" />
              <p className="mb-0 small">Select an order from the list to view details</p>
            </div>
          ) : (
            <>
              <div className="os-detail-header">
                <div className="d-flex justify-content-between align-items-start gap-2">
                  <div>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-muted text-decoration-none mb-1"
                      onClick={() => onSelectOrder(null)}
                    >
                      ← Back to List
                    </button>
                    <div className="d-flex flex-wrap align-items-center gap-2">
                      <h5 className="fw-bold mb-0">Order #{selectedId}</h5>
                      <button
                        type="button"
                        className="btn btn-sm btn-light p-1"
                        onClick={copyOrderId}
                        title="Copy order ID"
                      >
                        <Copy size={14} />
                      </button>
                      <span
                        className={`status-badge status-${statusBadgeClass(detail.status)}`}
                        style={{ fontSize: 11 }}
                      >
                        {formatStatusLabel(detail.status)}
                      </span>
                      {detailLoading ? (
                        <span className="spinner-border spinner-border-sm text-secondary" />
                      ) : null}
                    </div>
                    <div className="small text-muted mt-1">
                      {formatWhen(detail.createdAt)} · User #{detail.userId ?? "—"} · Payment:{" "}
                      {detail.paymentType ?? "—"} · Delivery: {detail.deliveryType ?? "—"}
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <button type="button" className="btn btn-sm btn-light" title="Share">
                      <Share2 size={14} />
                    </button>
                    <button type="button" className="btn btn-sm btn-light" title="Print">
                      <Printer size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => onNavigateOrder(-1)}
                      title="Previous order"
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-light"
                      onClick={() => onNavigateOrder(1)}
                      title="Next order"
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              <div className="os-detail-scroll">
                <div className="os-stepper">
                  {milestoneLabels.map((label, index) => {
                    const isDone = progressIndex > index;
                    const isCurrent = progressIndex === index;
                    return (
                      <div
                        key={label}
                        className={`os-step ${isDone ? "done" : ""} ${isCurrent ? "current" : ""}`}
                      >
                        <div className="os-step-dot">{isDone ? "✓" : index + 1}</div>
                        <div className="os-step-label">{label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="os-detail-tabs">
                  {DETAIL_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`os-detail-tab ${detailTab === tab.id ? "active" : ""}`}
                      onClick={() => onDetailTabChange(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {detailTab === "overview" ? (
                  <>
                    <div className="mb-4">
                      <div className="os-section-title">Package & Order Details</div>
                      <DetailFieldGrid
                        fields={[
                          ["Description", fmtAddress(detail.packageContents)],
                          ["Declared Value", fmtMoney(detail.declaredValue)],
                          ["Pieces", detail.pieceCount ?? "—"],
                          ["Weight", detail.weight != null ? `${detail.weight} kg` : "—"],
                          ["Package Type", detail.vehicleName ?? "Box"],
                          ["Category", detail.categoryId ?? "—"],
                          ["Fragile", fmtYesNo(detail.isFragile)],
                          ["Liquid", fmtYesNo(detail.containsLiquid)],
                          ["Battery", fmtYesNo(detail.containsBattery)],
                          ["Prohibited Items", fmtYesNo(detail.prohibitedItemsAccepted)],
                          [
                            "Origin Hub",
                            detail.originHubCity
                              ? `${detail.originHubCity}${detail.originHubName ? ` (${detail.originHubName})` : ""}`
                              : detail.originHubId ?? "—",
                          ],
                          [
                            "Destination Hub",
                            detail.destinationHubCity
                              ? `${detail.destinationHubCity}${detail.destinationHubName ? ` (${detail.destinationHubName})` : ""}`
                              : detail.destinationHubId ?? "—",
                          ],
                        ]}
                      />
                    </div>

                    <div className="mb-4">
                      <div className="os-section-title">Rider Details</div>
                      <DetailFieldGrid
                        fields={[
                          [
                            "Pickup Rider",
                            detail.pickupRiderId
                              ? `#${detail.pickupRiderId}${detail.riderName && detail.pickupRiderId === detail.riderId ? ` — ${detail.riderName}` : ""}`
                              : "—",
                          ],
                          [
                            "Delivery Rider",
                            detail.deliveryRiderId ? `#${detail.deliveryRiderId}` : "—",
                          ],
                        ]}
                      />
                    </div>

                    <div>
                      <div className="os-section-title">Timeline</div>
                      {(detail.timelineEvents ?? []).length > 0 ? (
                        detail.timelineEvents.map((evt, i) => (
                          <div key={i} className="os-timeline-item">
                            <div className="os-timeline-dot" />
                            <div>
                              <div className="small fw-semibold">
                                {evt.title ?? evt.eventType ?? evt.status ?? "Event"}
                              </div>
                              <div className="text-muted" style={{ fontSize: "0.6875rem" }}>
                                {evt.description ?? evt.message ?? ""}
                              </div>
                              <div className="text-muted" style={{ fontSize: "0.625rem" }}>
                                {formatWhen(evt.createdAt ?? evt.timestamp)}
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="small text-muted">
                          <div className="os-timeline-item">
                            <div className="os-timeline-dot" />
                            <div>
                              <div className="small fw-semibold">Order Created</div>
                              <div className="text-muted" style={{ fontSize: "0.6875rem" }}>
                                {formatWhen(detail.createdAt)}
                              </div>
                            </div>
                          </div>
                          {canonicalOrderStatus(detail.status) === "BOOKED" ? (
                            <div className="os-timeline-item">
                              <div className="os-timeline-dot" style={{ background: "#94a3b8" }} />
                              <div className="small text-muted">
                                Order is waiting for rider assignment
                              </div>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </>
                ) : null}

                {detailTab === "package" ? (
                  <>
                    <div className="mb-4">
                      <div className="os-section-title d-flex align-items-center gap-2">
                        <Navigation size={14} /> Locations
                      </div>
                      <div className="row g-2">
                        <div className="col-md-6">
                          <div className="p-3 rounded-3 bg-light h-100">
                            <p className="text-muted mb-1 small">Pickup</p>
                            <p className="mb-1 small">{fmtAddress(detail.pickupAddress)}</p>
                            {detail.senderName ? (
                              <p className="mb-0 small text-muted">
                                {detail.senderName} · {detail.senderPhone ?? ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        <div className="col-md-6">
                          <div className="p-3 rounded-3 bg-light h-100">
                            <p className="text-muted mb-1 small">Drop</p>
                            <p className="mb-1 small">{fmtAddress(detail.dropAddress)}</p>
                            {detail.receiverName ? (
                              <p className="mb-0 small text-muted">
                                {detail.receiverName} · {detail.receiverPhone ?? ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="os-section-title d-flex align-items-center gap-2">
                      <Package size={14} /> Parcel details
                    </div>
                    <DetailFieldGrid
                      fields={[
                        ["Contents", fmtAddress(detail.packageContents)],
                        ["Weight", detail.weight != null ? `${detail.weight} kg` : "—"],
                        ["Pieces", detail.pieceCount ?? "—"],
                        ["Declared value", fmtMoney(detail.declaredValue)],
                        ["Delivery type", detail.deliveryType ?? "—"],
                        [
                          "Special handling",
                          parcelHandlingTags(detail).join(", ") || "—",
                        ],
                        ["Declaration confirmed", fmtYesNo(detail.parcelDeclarationAccepted)],
                      ]}
                    />
                  </>
                ) : null}

                {detailTab === "financials" ? (
                  <>
                    <div className="os-section-title d-flex align-items-center gap-2">
                      <CreditCard size={14} /> Amounts
                    </div>
                    {[
                      ["Subtotal", detail.subtotal],
                      ["GST", detail.gstAmount],
                      ["Platform fee", detail.platformFee],
                      ["Coupon", detail.couponAmount],
                      ["Total", detail.totalAmount],
                    ].map(([label, val]) => (
                      <div
                        key={label}
                        className="d-flex justify-content-between py-2 border-bottom small"
                      >
                        <span className="text-muted">{label}</span>
                        <span className="fw-semibold">{fmtMoney(val)}</span>
                      </div>
                    ))}
                    <div className="mt-3">
                      <DetailFieldGrid
                        fields={[
                          ["Payment type", detail.paymentType ?? "—"],
                          ["Payment status", detail.paymentStatus ?? "—"],
                          ["COD collected", fmtYesNo(detail.codAlreadyCollected)],
                          ["COD amount", fmtMoney(detail.codCollectedAmount)],
                        ]}
                      />
                    </div>
                  </>
                ) : null}

                {detailTab === "activity" ? (
                  <div>
                    <div className="os-section-title">Activity log</div>
                    {(detail.timelineEvents ?? []).length > 0 ? (
                      detail.timelineEvents.map((evt, i) => (
                        <div key={i} className="os-timeline-item">
                          <div className="os-timeline-dot" />
                          <div>
                            <div className="small fw-semibold">
                              {evt.title ?? evt.eventType ?? "Update"}
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.6875rem" }}>
                              {evt.description ?? evt.message ?? formatStatusLabel(evt.status)}
                            </div>
                            <div className="text-muted" style={{ fontSize: "0.625rem" }}>
                              {formatWhen(evt.createdAt ?? evt.timestamp)}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="small text-muted">No activity recorded yet.</p>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>

        {/* Right — take action */}
        <aside className="os-action-panel">
          <div className="os-action-header">Take Action</div>
          <div className="os-action-scroll">{actionPanel}</div>
          {detail ? (
            <div className="os-action-footer">
              <span>
                COD Status:{" "}
                {String(detail.paymentType || "").toUpperCase() === "COD"
                  ? detail.codAlreadyCollected
                    ? "Collected"
                    : "Pending"
                  : "N/A"}
              </span>
              <span>
                OTP Required:{" "}
                {primaryNextStatus && outstationStatusRequiresOtp(primaryNextStatus)
                  ? "Yes"
                  : "No"}
              </span>
            </div>
          ) : null}
        </aside>
      </div>

      {bulkBar}
    </div>
  );
}
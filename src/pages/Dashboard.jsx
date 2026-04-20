import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bike,
  CheckCircle2,
  Clock,
  DollarSign,
  MoreVertical,
  Package,
  RefreshCw,
  Users,
  Zap,
} from "lucide-react";
import { useDashboardData } from "../hooks/useDashboardData";
import {
  formatINR,
  formatPercent,
  formatRelativeTime,
} from "../utils/formatters";

const RANGE_OPTIONS = [
  { label: "Today", value: "TODAY" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
];

const Dashboard = () => {
  const [range, setRange] = useState("TODAY");

  const {
    summary,
    summaryLoading,
    summaryError,
    orderVolume,
    orderVolumeLoading,
    orderVolumeError,
    activity,
    activityLoading,
    activityError,
    retrySummaryAndOrderVolume,
    retryActivity,
    retryAll,
  } = useDashboardData(range);

  const kpis = [
    {
      label: "Total Orders",
      value: Number(summary.totalOrders || 0).toLocaleString(),
      icon: Package,
      color: "#E51818",
      sub: `${formatPercent(summary.completionRate)} completion`,
    },
    {
      label: "Gross Revenue",
      value: formatINR(summary.grossRevenue),
      icon: DollarSign,
      color: "#10B981",
      sub: `${formatINR(summary.avgOrderValue)} avg order value`,
    },
    {
      label: "Online Riders",
      value: Number(summary.onlineRiders || 0).toLocaleString(),
      icon: Bike,
      color: "#3B82F6",
      sub: `${summary.avgAssignmentEtaMinutes ?? 0} min avg ETA`,
    },
    {
      label: "Active Users",
      value: Number(summary.activeUsers || 0).toLocaleString(),
      icon: Users,
      color: "#8B5CF6",
      sub: `${formatPercent(summary.cancellationRate)} cancellation`,
    },
  ];

  const operationalStats = [
    {
      label: "Avg Assignment ETA",
      value: `${Number(summary.avgAssignmentEtaMinutes || 0).toFixed(1)} min`,
      icon: Clock,
      status: "good",
    },
    {
      label: "Cancellation Rate",
      value: formatPercent(summary.cancellationRate),
      icon: AlertTriangle,
      status: "warning",
    },
    {
      label: "Completion Rate",
      value: formatPercent(summary.completionRate),
      icon: CheckCircle2,
      status: "good",
    },
    {
      label: "Avg Order Value",
      value: formatINR(summary.avgOrderValue),
      icon: Zap,
      status: "good",
    },
  ];

  const peak = useMemo(() => {
    if (!Array.isArray(orderVolume) || orderVolume.length === 0) return 1;
    return Math.max(
      ...orderVolume.map((point) => {
        const value = Number(point?.value);
        return Number.isFinite(value) ? value : 0;
      }),
      1
    );
  }, [orderVolume]);

  const hasBlockingError = Boolean(summaryError || orderVolumeError || activityError);

  const statusClass = (status) => {
    const s = String(status || "").toUpperCase();
    if (s.includes("DELIVERED") || s.includes("COMPLETED")) return "active";
    if (s.includes("CANCEL")) return "cancelled";
    if (s.includes("PENDING")) return "pending";
    return "info";
  };

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Operational Overview</h2>
          <p className="text-muted small mb-0">Real-time metrics for YouDash fleet and orders.</p>
        </div>
        <div className="d-flex gap-2">
          {RANGE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setRange(option.value)}
              className={`btn small fw-bold px-3 py-2 border-0 rounded-3 ${
                range === option.value ? "text-white" : "btn-light text-muted"
              }`}
              style={{ backgroundColor: range === option.value ? "#E51818" : "" }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {hasBlockingError ? (
        <div
          className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3 rounded-4 border-0 shadow-sm"
          role="alert"
        >
          <span>{summaryError || orderVolumeError || activityError}</span>
          <button type="button" className="btn btn-sm btn-outline-danger rounded-pill" onClick={retryAll}>
            <RefreshCw size={14} className="me-1" />
            Retry All
          </button>
        </div>
      ) : null}

      <div className="row g-4 mb-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="col-12 col-sm-6 col-xl-3">
                <div className="dashboard-card h-100 border-0 shadow-sm">
                  <div className="skeleton-line w-25 mb-3" style={{ height: 32 }} />
                  <div className="skeleton-line w-50 mb-2" />
                  <div className="skeleton-line w-75 mb-2" />
                  <div className="skeleton-line w-50" />
                </div>
              </div>
            ))
          : kpis.map((kpi) => (
              <div key={kpi.label} className="col-12 col-sm-6 col-xl-3">
                <div className="dashboard-card h-100 border-0 shadow-sm">
                  <div className="d-flex justify-content-between mb-3">
                    <div
                      className="stats-icon-wrapper"
                      style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}
                    >
                      <kpi.icon size={24} />
                    </div>
                  </div>
                  <h3 className="fw-bold mb-1 fs-2">{kpi.value}</h3>
                  <p className="fw-bold text-dark small mb-0">{kpi.label}</p>
                  <p className="text-muted mb-0" style={{ fontSize: "10px" }}>
                    {kpi.sub}
                  </p>
                </div>
              </div>
            ))}
      </div>

      <div className="row g-3 mb-4">
        {summaryLoading
          ? Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="col-6 col-xl-3">
                <div className="dashboard-card border-0 shadow-sm py-3 px-3">
                  <div className="skeleton-line w-50 mb-2" />
                  <div className="skeleton-line w-75" />
                </div>
              </div>
            ))
          : operationalStats.map((stat) => (
              <div key={stat.label} className="col-6 col-xl-3">
                <div
                  className={`dashboard-card border-0 shadow-sm d-flex align-items-center gap-3 py-3 px-3 border-start border-4 ${
                    stat.status === "good" ? "border-success" : "border-warning"
                  }`}
                >
                  <stat.icon
                    size={22}
                    className={stat.status === "good" ? "text-success" : "text-warning"}
                  />
                  <div>
                    <p className="fw-bold fs-6 mb-0">{stat.value}</p>
                    <small className="text-muted" style={{ fontSize: "10px" }}>
                      {stat.label}
                    </small>
                  </div>
                </div>
              </div>
            ))}
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">
                Order Volume Trends - {RANGE_OPTIONS.find((x) => x.value === range)?.label}
              </h5>
              <button type="button" className="btn btn-link p-0 text-dark">
                <MoreVertical size={20} />
              </button>
            </div>

            {orderVolumeLoading ? (
              <div className="d-flex align-items-end justify-content-between px-2" style={{ height: "250px" }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="d-flex flex-column align-items-center gap-2 w-100">
                    <div className="skeleton-line w-75" />
                    <div className="skeleton-line w-50" style={{ height: 120 }} />
                    <div className="skeleton-line w-75" />
                  </div>
                ))}
              </div>
            ) : orderVolumeError ? (
              <div className="text-center py-5">
                <p className="text-muted mb-3 small">{orderVolumeError}</p>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={retrySummaryAndOrderVolume}>
                  Retry Chart
                </button>
              </div>
            ) : orderVolume.length === 0 ? (
              <p className="text-muted small text-center py-5 mb-0">No order volume data available for this range.</p>
            ) : (
              <div className="d-flex align-items-end justify-content-between px-2" style={{ height: "250px" }}>
                {orderVolume.map((point, i) => {
                  const value = Number(point?.value) || 0;
                  return (
                    <div key={`${point?.label || "pt"}-${i}`} className="d-flex flex-column align-items-center gap-2 w-100">
                      <span className="small fw-bold text-muted" style={{ fontSize: "10px" }}>
                        {value}
                      </span>
                      <div
                        className="w-50 rounded-top-3 transition-all"
                        style={{
                          height: `${(value / peak) * 200}px`,
                          backgroundColor: value === peak ? "#E51818" : "#E5181820",
                          minWidth: "24px",
                          borderRadius: "6px 6px 0 0",
                        }}
                      />
                      <small className="text-muted fw-bold text-center" style={{ fontSize: "10px" }}>
                        {point?.label || "-"}
                      </small>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="dashboard-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Live Activity Feed</h5>
              <button type="button" className="btn btn-sm btn-light" onClick={retryActivity}>
                Refresh
              </button>
            </div>

            {activityLoading ? (
              <div className="d-flex flex-column gap-3">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <div key={idx} className="d-flex align-items-center gap-3">
                    <div className="skeleton-line rounded-circle" style={{ width: 34, height: 34 }} />
                    <div className="w-100">
                      <div className="skeleton-line w-75 mb-2" />
                      <div className="skeleton-line w-50 mb-2" />
                      <div className="skeleton-line w-25" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityError ? (
              <div className="text-center py-4">
                <p className="text-muted small mb-3">{activityError}</p>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={retryActivity}>
                  Retry Feed
                </button>
              </div>
            ) : activity.length === 0 ? (
              <p className="text-muted small text-center py-5 mb-0">No live activity yet.</p>
            ) : (
              <div className="d-flex flex-column gap-4">
                {activity.map((item, idx) => {
                  const status = String(item?.status || "");
                  const statusType = statusClass(status);
                  return (
                    <div key={`${item?.displayOrderId || "item"}-${idx}`} className="d-flex align-items-center gap-3">
                      <div
                        className={`p-2 rounded-circle ${
                          statusType === "active"
                            ? "bg-success bg-opacity-10"
                            : statusType === "cancelled"
                              ? "bg-danger bg-opacity-10"
                              : "bg-warning bg-opacity-10"
                        }`}
                      >
                        <Clock
                          size={16}
                          className={
                            statusType === "active"
                              ? "text-success"
                              : statusType === "cancelled"
                                ? "text-danger"
                                : "text-warning"
                          }
                        />
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center gap-2">
                          <span className="fw-bold small text-truncate">
                            {item?.customerName || "Unknown Customer"}
                          </span>
                          <span className={`status-badge status-${statusType} p-1 px-2`} style={{ fontSize: "10px" }}>
                            {status || "UNKNOWN"}
                          </span>
                        </div>
                        <p className="mb-0 text-muted" style={{ fontSize: "11px" }}>
                          {item?.displayOrderId || "-"} • {item?.serviceMode || "-"} • {formatINR(item?.amount)}
                        </p>
                        <small className="text-muted" style={{ fontSize: "10px" }}>
                          {formatRelativeTime(item?.createdAt)}
                        </small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { opacity: 0.7; }
          50% { opacity: 0.35; }
          100% { opacity: 0.7; }
        }
        .skeleton-line {
          height: 12px;
          border-radius: 8px;
          background: #e5e7eb;
          animation: pulse 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;

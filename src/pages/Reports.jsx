import { useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Download,
  DollarSign,
  Bike,
  Package,
  RefreshCw,
} from "lucide-react";
import { useRevenueReport } from "../hooks/useRevenueReport";
import { formatINR, formatPercent } from "../utils/formatters";

const RANGE_OPTIONS = [
  { label: "Today", value: "TODAY" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
];

const CHART_STYLES = [
  { label: "Classic", value: "CLASSIC" },
  { label: "Capsule", value: "CAPSULE" },
  { label: "Glow", value: "GLOW" },
];

function formatCompactINR(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "₹0";
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (Math.abs(amount) >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}k`;
  }
  return `₹${amount.toFixed(0)}`;
}

const Reports = () => {
  const [timeRange, setTimeRange] = useState("THIS_WEEK");
  const [chartStyle, setChartStyle] = useState("CAPSULE");
  const { report, loading, error, retry } = useRevenueReport(timeRange);

  const displayTrend = useMemo(() => {
    const source = Array.isArray(report.trend) ? report.trend : [];
    const map = new Map();
    source.forEach((item) => {
      const rawLabel = String(item?.label ?? "").trim();
      const value = Number(item?.value) || 0;
      const key = rawLabel.toLowerCase();
      map.set(key, value);

      const dt = new Date(rawLabel);
      if (!Number.isNaN(dt.getTime())) {
        map.set(dt.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase(), value);
        map.set(String(dt.getDate()).toLowerCase(), value);
        map.set(`${String(dt.getHours()).padStart(2, "0")}:00`.toLowerCase(), value);
      }
    });

    if (timeRange === "TODAY") {
      const labels = ["00:00", "03:00", "06:00", "09:00", "12:00", "15:00", "18:00", "21:00"];
      return labels.map((label) => ({ label, value: map.get(label.toLowerCase()) ?? 0 }));
    }

    if (timeRange === "THIS_WEEK") {
      const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      return labels.map((label) => ({ label, value: map.get(label.toLowerCase()) ?? 0 }));
    }

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const labels = Array.from({ length: daysInMonth }, (_, i) => String(i + 1));
    return labels.map((label) => ({ label, value: map.get(label.toLowerCase()) ?? 0 }));
  }, [report.trend, timeRange]);

  const peak = useMemo(() => {
    if (!Array.isArray(displayTrend) || displayTrend.length === 0) return 1;
    return Math.max(
      ...displayTrend.map((d) => {
        const value = Number(d?.value);
        return Number.isFinite(value) ? value : 0;
      }),
      1
    );
  }, [displayTrend]);

  const chartTitle = RANGE_OPTIONS.find((x) => x.value === timeRange)?.label || "This Week";
  const showValueLabels = displayTrend.length <= 12 || timeRange === "THIS_MONTH";
  const hasTrendData = displayTrend.some((d) => Number(d?.value) > 0);
  const isScrollableTrend = timeRange === "THIS_MONTH" && displayTrend.length > 12;
  const pointWidth = timeRange === "THIS_MONTH" ? 42 : 56;
  const chartTrackWidth = Math.max(displayTrend.length * pointWidth, 420);

  return (
    <div className="container-fluid fade-in position-relative">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Reports & Analytics</h2>
          <p className="text-muted small mb-0">Revenue and performance insights from backend analytics APIs.</p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 shadow-sm bg-white"
          style={{ borderRadius: "10px" }}
          onClick={() => window.alert("Export integration can use this report payload.")}
        >
          <Download size={18} /> <span className="fw-bold">Export to CSV</span>
        </button>
      </div>

      <div className="dashboard-card border-0 shadow-sm mb-4 d-flex flex-column flex-md-row gap-3 p-3">
        <div className="flex-grow-1">
          <div
            className="btn btn-light w-100 d-flex justify-content-between align-items-center fw-bold text-muted py-2 pe-none"
            style={{ borderRadius: "8px" }}
          >
            <div className="d-flex align-items-center gap-2">
              <BarChart3 size={16} /> Revenue Report
            </div>
          </div>
        </div>

        <div className="dropdown flex-grow-1">
          <button
            type="button"
            className="btn btn-light w-100 d-flex justify-content-between align-items-center fw-bold text-muted py-2"
            data-bs-toggle="dropdown"
            style={{ borderRadius: "8px" }}
          >
            <div className="d-flex align-items-center gap-2">
              <Calendar size={16} /> {chartTitle}
            </div>
            <ChevronDown size={16} />
          </button>
          <ul className="dropdown-menu w-100 border-0 shadow-sm mt-1">
            {RANGE_OPTIONS.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  className="dropdown-item py-2 text-muted fw-bold"
                  onClick={() => setTimeRange(option.value)}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {error ? (
        <div
          className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3 rounded-4 border-0 shadow-sm"
          role="alert"
        >
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-outline-danger rounded-pill" onClick={retry}>
            <RefreshCw size={14} className="me-1" />
            Retry
          </button>
        </div>
      ) : null}

      <div className="row g-4 mb-4">
        <div className="col-12 col-xl-8">
          <div className="dashboard-card border-0 shadow-sm h-100">
            <div className="d-flex justify-content-between align-items-start mb-5">
              <div>
                <h5 className="fw-bold mb-1">Revenue Overview</h5>
                <span className="small text-muted">{chartTitle} Analytics</span>
              </div>
              <div className="text-end">
                <h3 className="fw-bold m-0 text-dark">{loading ? "—" : formatINR(report.totalRevenue)}</h3>
                <span className="small text-muted">Total Revenue</span>
              </div>
            </div>

            <div className="d-flex flex-wrap gap-2 mb-3">
              {CHART_STYLES.map((style) => (
                <button
                  key={style.value}
                  type="button"
                  className={`btn btn-sm fw-bold rounded-pill px-3 ${
                    chartStyle === style.value ? "text-white border-0" : "btn-light text-muted"
                  }`}
                  style={{ backgroundColor: chartStyle === style.value ? "#E51818" : undefined }}
                  onClick={() => setChartStyle(style.value)}
                >
                  {style.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="d-flex align-items-end justify-content-between pt-5 mt-auto px-2" style={{ height: "220px" }}>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="d-flex flex-column align-items-center gap-3 w-100">
                    <div className="skeleton-line w-50" style={{ height: 130 }} />
                    <div className="skeleton-line w-75" />
                  </div>
                ))}
              </div>
            ) : displayTrend.length === 0 ? (
              <p className="text-muted small text-center py-5 mb-0">No trend data for this range.</p>
            ) : (
              <div className={`${isScrollableTrend ? "overflow-auto" : ""} pt-2`}>
                <div
                  className={`d-flex align-items-end px-2 ${isScrollableTrend ? "gap-2" : "justify-content-between gap-1"}`}
                  style={{ minWidth: isScrollableTrend ? `${chartTrackWidth}px` : undefined, height: "230px" }}
                >
                  {displayTrend.map((data, index) => {
                    const value = Number(data?.value) || 0;
                    const barHeight = Math.max((value / peak) * 100, hasTrendData ? 6 : 0);
                    const showLabel = showValueLabels;
                    return (
                      <div
                        key={`${data?.label || "point"}-${index}`}
                        className="d-flex flex-column align-items-center gap-2"
                        style={{
                          width: isScrollableTrend ? pointWidth : "100%",
                          minWidth: isScrollableTrend ? pointWidth : undefined,
                          cursor: "pointer",
                        }}
                        title={`${data?.label || "Point"}: ${formatINR(value)}`}
                      >
                        <div
                          className={`position-relative w-100 d-flex align-items-end ${
                            chartStyle === "CAPSULE" ? "rounded-pill" : "rounded-top-3"
                          }`}
                          style={{
                            height: "180px",
                            backgroundColor: chartStyle === "GLOW" ? "#f3f4f6" : "#f8fafc",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            className={`w-100 transition-all ${
                              chartStyle === "CAPSULE" ? "rounded-pill" : "rounded-top-3"
                            }`}
                            style={{
                              height: `${barHeight}%`,
                              minHeight: hasTrendData ? 3 : 0,
                              background:
                                chartStyle === "CLASSIC"
                                  ? "#E51818"
                                  : chartStyle === "CAPSULE"
                                    ? "linear-gradient(180deg, #ff6b6b 0%, #E51818 100%)"
                                    : "linear-gradient(180deg, #ff8a8a 0%, #E51818 65%, #b90f0f 100%)",
                              boxShadow: chartStyle === "GLOW" ? "0 6px 14px rgba(229,24,24,0.28)" : "none",
                            }}
                          />
                          {chartStyle === "GLOW" ? (
                            <div
                              className="position-absolute top-0 start-0 end-0"
                              style={{
                                height: 1,
                                background:
                                  "repeating-linear-gradient(to right, rgba(100,116,139,0.2) 0px, rgba(100,116,139,0.2) 12px, transparent 12px, transparent 20px)",
                              }}
                            />
                          ) : null}
                        </div>
                        {showLabel ? (
                          <div
                            className={`px-1 py-0 fw-bold rounded-2 text-nowrap ${
                              value > 0 ? "text-danger" : "text-muted"
                            }`}
                            style={{ fontSize: timeRange === "THIS_MONTH" ? 8 : 9, lineHeight: "10px" }}
                          >
                            {formatCompactINR(value)}
                          </div>
                        ) : (
                          <div style={{ height: 10 }} />
                        )}
                        <span className="small text-muted fw-bold text-nowrap" style={{ fontSize: 10 }}>
                          {data?.label || "-"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="col-12 col-xl-4">
          <div className="row g-4">
            <div className="col-12">
              <div className="dashboard-card border-0 shadow-sm bg-primary-red text-white p-4" style={{ backgroundColor: "#E51818" }}>
                <DollarSign size={24} className="mb-3 opacity-75" />
                <h3 className="fw-bold m-0">{loading ? "—" : `${Number(report.rushMultiplier || 0).toFixed(2)}x`}</h3>
                <p className="small opacity-75 mb-0">Rush Multiplier</p>
              </div>
            </div>
            <div className="col-12">
              <div className="dashboard-card border-0 shadow-sm bg-white p-4">
                <Package size={24} className="mb-3 text-primary-red" />
                <h3 className="fw-bold m-0 text-dark">{loading ? "—" : formatPercent(report.completionRate)}</h3>
                <p className="small text-muted mb-0">Successful Completion Rate</p>
              </div>
            </div>
            <div className="col-12">
              <div className="dashboard-card border-0 shadow-sm bg-white p-4">
                <Bike size={24} className="mb-3 text-warning" />
                <h3 className="fw-bold m-0 text-dark">
                  {loading ? "—" : `${Number(report.avgAssignmentEtaMinutes || 0).toFixed(1)} min`}
                </h3>
                <p className="small text-muted mb-0">Avg Assignment ETA</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-card border-0 shadow-sm overflow-hidden p-0">
        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
          <h6 className="fw-bold m-0">Top Sources</h6>
          {!loading ? (
            <span className="text-muted small">{report.topSources.length} rows</span>
          ) : null}
        </div>
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="bg-light">
              <tr>
                <th className="px-4 py-3 small text-muted border-0">SOURCE</th>
                <th className="px-3 py-3 small text-muted border-0">VOLUME</th>
                <th className="px-3 py-3 small text-muted border-0">REVENUE</th>
                <th className="px-4 py-3 small text-muted border-0 text-end">CONVERSION</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-3 border-0">
                      <div className="skeleton-line w-75" />
                    </td>
                    <td className="px-3 py-3 border-0">
                      <div className="skeleton-line w-50" />
                    </td>
                    <td className="px-3 py-3 border-0">
                      <div className="skeleton-line w-50" />
                    </td>
                    <td className="px-4 py-3 border-0">
                      <div className="skeleton-line w-25 ms-auto" />
                    </td>
                  </tr>
                ))
              ) : report.topSources.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-5 text-muted small">
                    No top source data available.
                  </td>
                </tr>
              ) : (
                report.topSources.map((row, idx) => (
                  <tr key={`${row?.source || row?.name || "source"}-${idx}`}>
                    <td className="px-4 py-3 small fw-bold border-0">
                      {row?.source || row?.name || `Source ${idx + 1}`}
                    </td>
                    <td className="px-3 py-3 small border-0">{Number(row?.volume || 0).toLocaleString()}</td>
                    <td className="px-3 py-3 small fw-bold border-0">{formatINR(row?.revenue || 0)}</td>
                    <td className="px-4 py-3 small border-0 text-end text-success fw-bold">
                      {formatPercent(row?.conversionRate || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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

export default Reports;

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Bike,
  Search,
  MoreVertical,
  MapPin,
  FileCheck,
  UserPlus,
  Phone,
  TrendingUp,
  ShieldAlert,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { riderService, unwrapList } from "../services/apiService";

function normalizeRider(r, source) {
  const approvalStatus = String(r?.approvalStatus ?? "PENDING").toUpperCase();
  return {
    id: r.id,
    name: r.name ?? "—",
    phone: r.phone ?? "",
    vehicleType: r.vehicleType ?? "—",
    isAvailable: Boolean(r.isAvailable),
    rating: r.rating != null && r.rating !== "" ? Number(r.rating) : null,
    approvalStatus,
    source,
  };
}

function riderInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  const one = parts[0] || "?";
  return one.slice(0, 2).toUpperCase();
}

function statusBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved" || s === "active") return "active";
  if (s === "pending") return "pending";
  if (s === "rejected") return "cancelled";
  return "info";
}

const Riders = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const [pendingRiders, setPendingRiders] = useState([]);
  const [availableRiders, setAvailableRiders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState(null);

  const loadRiders = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [pRes, aRes] = await Promise.all([
        riderService.getPendingRiders(),
        riderService.getAvailableRiders(),
      ]);
      setPendingRiders(unwrapList(pRes).map((r) => normalizeRider(r, "pending")));
      setAvailableRiders(
        unwrapList(aRes).map((r) => normalizeRider(r, "available"))
      );
    } catch (e) {
      const msg =
        e?.response?.data?.message || e?.message || "Failed to load riders.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRiders();
  }, [loadRiders]);

  const mergedList = useMemo(
    () => [...pendingRiders, ...availableRiders],
    [pendingRiders, availableRiders]
  );

  const avgRating = useMemo(() => {
    const nums = availableRiders
      .map((r) => r.rating)
      .filter((n) => typeof n === "number" && !Number.isNaN(n));
    if (nums.length === 0) return null;
    return nums.reduce((a, b) => a + b, 0) / nums.length;
  }, [availableRiders]);

  const baseList = useMemo(() => {
    if (activeTab === "Pending") return pendingRiders;
    if (activeTab === "Available") return availableRiders;
    return mergedList;
  }, [activeTab, pendingRiders, availableRiders, mergedList]);

  const q = search.trim().toLowerCase();
  const filteredRiders = baseList.filter((rider) => {
    if (!q) return true;
    return (
      rider.name.toLowerCase().includes(q) ||
      String(rider.id).toLowerCase().includes(q) ||
      rider.phone.toLowerCase().includes(q) ||
      String(rider.vehicleType).toLowerCase().includes(q)
    );
  });

  const handleApprove = async (id) => {
    setActionId(id);
    try {
      await riderService.approveRider(id);
      await loadRiders();
    } catch (e) {
      window.alert(
        e?.response?.data?.message || e?.message || "Could not approve rider."
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm("Reject this rider application?")) return;
    setActionId(id);
    try {
      await riderService.rejectRider(id);
      await loadRiders();
    } catch (e) {
      window.alert(
        e?.response?.data?.message || e?.message || "Could not reject rider."
      );
    } finally {
      setActionId(null);
    }
  };

  const tabs = ["All", "Pending", "Available"];

  return (
    <div className="container-fluid fade-in">
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Rider Management</h2>
          <p className="text-muted small mb-0">
            {loading
              ? "Loading riders…"
              : "Pending approvals and available fleet (from API)."}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
          style={{
            backgroundColor: "#E51818",
            color: "white",
            borderRadius: "10px",
          }}
        >
          <UserPlus size={18} /> <span>Onboard New Rider</span>
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div
            className="dashboard-card border-0 bg-primary-red text-white"
            style={{ backgroundColor: "#E51818" }}
          >
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-white bg-opacity-25 p-2 rounded-3">
                <Bike size={20} />
              </div>
              <span className="small opacity-75 fw-bold">Available riders</span>
            </div>
            <h4 className="fw-bold mb-0">{availableRiders.length}</h4>
            <small className="opacity-75" style={{ fontSize: "10px" }}>
              Currently available for assignments
            </small>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success">
                <FileCheck size={20} />
              </div>
              <span className="small text-muted fw-bold">Pending approval</span>
            </div>
            <h4 className="fw-bold mb-0">{pendingRiders.length}</h4>
            <small className="text-muted" style={{ fontSize: "10px" }}>
              Awaiting your approval
            </small>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-warning bg-opacity-10 p-2 rounded-3 text-warning">
                <TrendingUp size={20} />
              </div>
              <span className="small text-muted fw-bold">Avg rating</span>
            </div>
            <h4 className="fw-bold mb-0">
              {avgRating != null ? avgRating.toFixed(1) : "—"}
            </h4>
            <small className="text-muted" style={{ fontSize: "10px" }}>
              From available riders
            </small>
          </div>
        </div>
      </div>

      {error ? (
        <div
          className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3"
          role="alert"
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadRiders}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white">
        <div className="p-4 border-bottom d-flex flex-column flex-md-row gap-4">
          <div className="d-flex gap-2 overflow-auto custom-scrollbar">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className="btn p-0 px-3 py-2 rounded-pill small fw-bold transition-all border-0"
                style={{
                  minWidth: "88px",
                  backgroundColor: activeTab === tab ? "#E51818" : "#F1F5F9",
                  color: activeTab === tab ? "#fff" : "#64748B",
                  boxShadow:
                    activeTab === tab ? "0 2px 8px rgba(229,24,24,0.35)" : "none",
                }}
              >
                {tab}
                {tab === "Pending" && (
                  <span className="ms-1 opacity-75">
                    ({pendingRiders.length})
                  </span>
                )}
                {tab === "Available" && (
                  <span className="ms-1 opacity-75">
                    ({availableRiders.length})
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="search-container flex-grow-1">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search by name, phone, or vehicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2"
              style={{ borderRadius: "10px" }}
            />
          </div>
        </div>

        <div className="row g-0">
          <div className="col-12">
            <div className="table-responsive">
              <table className="table mb-0 table-hover">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 text-muted small border-0">
                      RIDER
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">
                      CONTACT
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">
                      VEHICLE
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">
                      RATING
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">
                      STATUS
                    </th>
                    <th className="px-3 py-3 text-muted small border-0">
                      AVAILABLE
                    </th>
                    <th className="px-4 py-3 text-muted small border-0 text-end">
                      ACTIONS
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-5 text-muted small"
                      >
                        Loading riders…
                      </td>
                    </tr>
                  ) : filteredRiders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="text-center py-5 text-muted small"
                      >
                        No riders in this view.
                      </td>
                    </tr>
                  ) : (
                    filteredRiders.map((rider) => {
                      const isPending =
                        rider.source === "pending" ||
                        rider.approvalStatus === "PENDING";
                      const busy = actionId === rider.id;
                      return (
                        <tr key={`${rider.source}-${rider.id}`} className="align-middle">
                          <td className="px-4 py-3 border-0">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white small"
                                style={{
                                  width: 40,
                                  height: 40,
                                  minWidth: 40,
                                  background:
                                    "linear-gradient(135deg,#E51818,#ff6b6b)",
                                  fontSize: "12px",
                                }}
                              >
                                {riderInitials(rider.name)}
                              </div>
                              <div>
                                <p className="mb-0 fw-bold small">{rider.name}</p>
                                <small
                                  className="text-muted d-flex align-items-center gap-1"
                                  style={{ fontSize: "10px" }}
                                >
                                  <MapPin size={10} /> ID {rider.id}
                                </small>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 border-0 small text-muted">
                            <span className="d-flex align-items-center gap-1">
                              <Phone size={10} /> {rider.phone || "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-0 small text-muted">
                            {rider.vehicleType}
                          </td>
                          <td className="px-3 py-3 border-0 small">
                            <span className="text-warning fw-bold">
                              ★{" "}
                              {rider.rating != null && !Number.isNaN(rider.rating)
                                ? rider.rating
                                : "—"}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-0 small">
                            <span
                              className={`status-badge status-${statusBadgeClass(
                                rider.approvalStatus
                              )} p-1 px-3`}
                              style={{ fontSize: "11px" }}
                            >
                              {rider.approvalStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-0 small text-muted">
                            {rider.isAvailable ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 border-0 text-end">
                            {isPending ? (
                              <div className="d-flex justify-content-end gap-2 flex-wrap">
                                <button
                                  type="button"
                                  className="btn btn-sm d-flex align-items-center gap-1 rounded-3 text-white"
                                  style={{
                                    backgroundColor: "#059669",
                                    minWidth: "88px",
                                  }}
                                  disabled={busy}
                                  onClick={() => handleApprove(rider.id)}
                                >
                                  <CheckCircle size={14} /> Approve
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1 rounded-3"
                                  style={{ minWidth: "88px" }}
                                  disabled={busy}
                                  onClick={() => handleReject(rider.id)}
                                >
                                  <XCircle size={14} /> Reject
                                </button>
                              </div>
                            ) : (
                              <div className="dropdown">
                                <button
                                  className="btn btn-light p-2 rounded-3 border-0"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                >
                                  <MoreVertical size={16} />
                                </button>
                                <ul
                                  className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2"
                                  style={{ borderRadius: "12px" }}
                                >
                                  <li>
                                    <span className="dropdown-item-text small text-muted py-2">
                                      Approved riders are managed in the rider
                                      app. Use pending list for approve/reject.
                                    </span>
                                  </li>
                                  <li>
                                    <button
                                      type="button"
                                      className="dropdown-item py-2 small rounded-3 text-muted d-flex align-items-center gap-2"
                                      disabled
                                    >
                                      <ShieldAlert size={16} /> Suspend (API
                                      pending)
                                    </button>
                                  </li>
                                </ul>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Riders;

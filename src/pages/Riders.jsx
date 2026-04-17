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
  Eye,
  X,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  CreditCard,
  Calendar,
  AlertTriangle,
  User,
  Star,
  ChevronRight,
} from "lucide-react";
import { riderService, unwrapList } from "../services/apiService";

function normalizeRider(r, source) {
  const approvalStatus = String(r?.approvalStatus ?? "PENDING").toUpperCase();
  return {
    ...r, // Keep all original API fields
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
  const [selectedRider, setSelectedRider] = useState(null);

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
    if (!window.confirm("Approve this rider application?")) return;
    setActionId(id);
    try {
      await riderService.approveRider(id);
      await loadRiders();
      setSelectedRider(null);
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
      setSelectedRider(null);
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
          className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm fw-bold"
          style={{
            backgroundColor: "#E51818",
            color: "white",
            borderRadius: "12px",
            border: "none",
            height: "44px"
          }}
        >
          <UserPlus size={18} /> <span>Onboard New Rider</span>
        </button>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div
            className="dashboard-card border-0 bg-primary-red text-white shadow-sm"
            style={{ backgroundColor: "#E51818", borderRadius: "16px" }}
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
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10" style={{ borderRadius: "16px" }}>
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
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10" style={{ borderRadius: "16px" }}>
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
          className="alert alert-danger mb-4 d-flex align-items-center justify-content-between gap-3 shadow-sm"
          style={{ borderRadius: "12px" }}
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            onClick={loadRiders}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white" style={{ borderRadius: "20px" }}>
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
                    activeTab === tab ? "0 4px 12px rgba(229,24,24,0.3)" : "none",
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
          <div className="search-container flex-grow-1 position-relative">
            <Search size={18} className="text-muted position-absolute" style={{ left: "16px", top: "50%", transform: "translateY(-50%)" }} />
            <input
              type="text"
              placeholder="Search by name, phone, or vehicle…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2 shadow-none"
              style={{ borderRadius: "12px", height: "44px" }}
            />
          </div>
        </div>

        <div className="row g-0">
          <div className="col-12">
            <div className="table-responsive">
              <table className="table mb-0 table-hover">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 text-muted small border-0 fw-bold">
                      RIDER
                    </th>
                    <th className="px-3 py-3 text-muted small border-0 fw-bold">
                      CONTACT
                    </th>
                    <th className="px-3 py-3 text-muted small border-0 fw-bold">
                      VEHICLE
                    </th>
                    <th className="px-3 py-3 text-muted small border-0 fw-bold">
                      RATING
                    </th>
                    <th className="px-3 py-3 text-muted small border-0 fw-bold">
                      STATUS
                    </th>
                    <th className="px-3 py-3 text-muted small border-0 fw-bold">
                      AVAILABLE
                    </th>
                    <th className="px-4 py-3 text-muted small border-0 text-end fw-bold">
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
                        <div className="spinner-border spinner-border-sm me-2 text-danger" role="status"></div>
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
                      return (
                        <tr key={`${rider.source}-${rider.id}`} className="align-middle" style={{ cursor: "pointer" }} onClick={() => setSelectedRider(rider)}>
                          <td className="px-4 py-3 border-0">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
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
                                <p className="mb-0 fw-bold small text-dark">{rider.name}</p>
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
                              )} p-1 px-3 fw-bold`}
                              style={{ fontSize: "10px", borderRadius: "20px" }}
                            >
                              {rider.approvalStatus}
                            </span>
                          </td>
                          <td className="px-3 py-3 border-0 small text-muted">
                            {rider.isAvailable ? "Yes" : "No"}
                          </td>
                          <td className="px-4 py-3 border-0 text-end">
                            <button
                              type="button"
                              className="btn btn-light btn-sm rounded-3 shadow-none border-0 p-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedRider(rider);
                              }}
                            >
                              <Eye size={18} className="text-muted" />
                            </button>
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

      {/* Rider Detail Full-screen Overlay */}
      {selectedRider && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 fade-in"
          style={{
            zIndex: 1060,
            overflowY: "auto",
            backgroundColor: "#F8F9FB",
            display: "block"
          }}
        >
          {/* Top Sticky Header */}
          <div className="bg-white border-bottom px-4 py-3 sticky-top shadow-sm" style={{ zIndex: 1100 }}>
            <div className="container-fluid d-flex justify-content-between align-items-center px-0">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold text-white shadow-sm"
                  style={{
                    width: 48,
                    height: 48,
                    minWidth: 48,
                    background: "linear-gradient(135deg,#E51818,#ff6b6b)",
                    fontSize: "16px",
                  }}
                >
                  {riderInitials(selectedRider.name)}
                </div>
                <div>
                  <h5 className="fw-bold mb-0 d-flex align-items-center gap-2">
                    {selectedRider.name}
                    <span
                      className={`status-badge status-${statusBadgeClass(
                        selectedRider.approvalStatus
                      )} p-1 px-2 fw-bold`}
                      style={{ fontSize: "10px", borderRadius: "10px" }}
                    >
                      {selectedRider.approvalStatus}
                    </span>
                  </h5>
                  <small className="text-muted">Rider ID: {selectedRider.id} • {selectedRider.phone}</small>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                {selectedRider.approvalStatus === "PENDING" && (
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-sm fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                      style={{ backgroundColor: "#059669", color: "white", height: "40px" }}
                      disabled={actionId === selectedRider.id}
                      onClick={() => handleApprove(selectedRider.id)}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger fw-bold px-4 rounded-3 d-flex align-items-center gap-2"
                      style={{ height: "40px" }}
                      disabled={actionId === selectedRider.id}
                      onClick={() => handleReject(selectedRider.id)}
                    >
                      <XCircle size={16} /> Reject
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className="btn btn-light rounded-circle shadow-sm border-0 d-flex align-items-center justify-content-center p-0"
                  style={{ width: "40px", height: "40px" }}
                  onClick={() => setSelectedRider(null)}
                >
                  <X size={20} className="text-muted" />
                </button>
              </div>
            </div>
          </div>

          <div className="container-fluid py-4 pb-5 px-4" style={{ maxWidth: "1200px" }}>
            <div className="row g-4">
              {/* Left Column: Basic Info & Profile */}
              <div className="col-12 col-lg-4">
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border-0">
                  <h6 className="fw-bold mb-3 text-uppercase opacity-50 small letter-spacing-1">Personal Details</h6>

                  <div className="d-flex flex-column gap-3">
                    {[
                      { icon: Phone, label: "Phone Number", val: selectedRider.phone },
                      { icon: User, label: "Full Name", val: selectedRider.name },
                      { icon: MapPin, label: "Location/City", val: selectedRider.city || "—" },
                      { icon: Calendar, label: "Joined Date", val: selectedRider.createdAt ? new Date(selectedRider.createdAt).toLocaleDateString() : "Pending Registration" },
                    ].map((item, idx) => (
                      <div key={idx} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ backgroundColor: "#F8F9FA" }}>
                        <div className="bg-white p-2 rounded-2 shadow-sm">
                          <item.icon size={16} className="text-danger" />
                        </div>
                        <div>
                          <p className="text-muted mb-0" style={{ fontSize: "10px" }}>{item.label}</p>
                          <p className="fw-bold small mb-0">{item.val}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 p-3 rounded-4 text-white shadow-sm" style={{ background: "linear-gradient(135deg, #1e293b, #334155)" }}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <p className="small opacity-75 mb-1">Rider Rating</p>
                        <h3 className="fw-bold mb-0 text-warning">★ {selectedRider.rating || "New"}</h3>
                      </div>
                      <div className="bg-white bg-opacity-20 p-2 rounded-3">
                        <Star size={24} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-4 shadow-sm p-4 border-0">
                  <h6 className="fw-bold mb-3 text-uppercase opacity-50 small letter-spacing-1">Emergency Contact</h6>
                  <div className="p-3 rounded-4 border-dashed" style={{ backgroundColor: "#FEF2F2", border: "2px dashed #FECACA" }}>
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="bg-white p-2 rounded-3 text-danger shadow-sm">
                        <AlertTriangle size={20} />
                      </div>
                      <div>
                        <p className="fw-bold mb-0 text-danger">{selectedRider.emergencyContactName || "Not Provided"}</p>
                        <small className="text-muted">Primary Emergency Contact</small>
                      </div>
                    </div>
                    <div className="d-flex flex-column gap-2">
                      <p className="mb-0 small d-flex align-items-center gap-2">
                        <Phone size={12} className="text-muted" />
                        <span className="fw-bold">{selectedRider.emergencyContactPhone || selectedRider.emergencyContactNumber || "—"}</span>
                      </p>
                      <p className="mb-0 small d-flex align-items-center gap-2 text-muted">
                        <User size={12} /> Relation: {selectedRider.emergencyContactRelation || "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Documents & Vehicle */}
              <div className="col-12 col-lg-8">
                {/* Vehicle Details */}
                <div className="bg-white rounded-4 shadow-sm p-4 mb-4 border-0">
                  <h6 className="fw-bold mb-3 text-uppercase opacity-50 small letter-spacing-1">Vehicle Information</h6>
                  <div className="row g-3">
                    {[
                      { label: "Vehicle Type", val: selectedRider.vehicleType, icon: Bike },
                      { label: "Vehicle Model", val: selectedRider.vehicleModel || "—", icon: CreditCard },
                      { label: "Vehicle Number", val: selectedRider.vehicleNumber || "—", icon: ShieldCheck },
                      { label: "Registration State", val: selectedRider.vehicleState || "—", icon: FileText },
                    ].map((v, i) => (
                      <div key={i} className="col-12 col-sm-6">
                        <div className="p-3 rounded-4 d-flex align-items-center gap-3 border" style={{ backgroundColor: "#FDFDFD" }}>
                          <div className="bg-danger bg-opacity-10 p-2 rounded-3 text-danger">
                            <v.icon size={20} />
                          </div>
                          <div>
                            <p className="text-muted mb-0" style={{ fontSize: "10px" }}>{v.label}</p>
                            <p className="fw-bold mb-0 small">{v.val}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Uploaded Documents */}
                <div className="bg-white rounded-4 shadow-sm p-4 border-0">
                  <h6 className="fw-bold mb-4 text-uppercase opacity-50 small letter-spacing-1">Onboarding Documents</h6>
                  <div className="row g-4">
                    {[
                      { label: "Selfie Image", url: selectedRider.selfieUrl || selectedRider.profileImage },
                      { label: "DRIVING LICENSE", url: selectedRider.licenseImageUrl || selectedRider.licenseImage },
                      { label: "AADHAR CARD", url: selectedRider.aadharImageUrl || selectedRider.aadharCardImage },
                      { label: "PAN CARD", url: selectedRider.panImageUrl || selectedRider.panCardImage },
                      { label: "Vehicle Registration", url: selectedRider.vehicleRegistrationImage },
                    ].filter(doc => doc.url).length === 0 ? (
                      <div className="col-12 text-center py-5">
                        <div className="mb-3 text-muted opacity-25">
                          <ImageIcon size={64} />
                        </div>
                        <p className="text-muted">No documents uploaded by the rider.</p>
                      </div>
                    ) : (
                      [
                        { label: "Selfie Image", url: selectedRider.selfieUrl || selectedRider.profileImage },
                        { label: "Driving License", url: selectedRider.licenseImageUrl || selectedRider.licenseImage },
                        { label: "Aadhar Card", url: selectedRider.aadharImageUrl || selectedRider.aadharCardImage },
                        { label: "PAN Card", url: selectedRider.panImageUrl || selectedRider.panCardImage },
                        { label: "Vehicle Registration", url: selectedRider.vehicleRegistrationImage },
                      ].filter(doc => doc.url).map((doc, i) => (
                        <div key={i} className="col-12 col-md-6">
                          <div className="card border-0 shadow-sm overflow-hidden rounded-4 h-100">
                            <div className="bg-light p-2 text-center border-bottom">
                              <span className="fw-bold text-uppercase small opacity-75" style={{ fontSize: "10px" }}>{doc.label}</span>
                            </div>
                            <div className="position-relative group" style={{ height: "220px", cursor: "zoom-in" }}>
                              <img
                                src={doc.url}
                                alt={doc.label}
                                className="w-100 h-100 object-fit-cover transition-all"
                                onClick={() => window.open(doc.url, "_blank")}
                              />
                              <div className="position-absolute bottom-0 start-0 w-100 p-2 bg-dark bg-opacity-50 opacity-0 group-hover-opacity-100 transition-all">
                                <small className="text-white">Click to view full size</small>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .status-badge.active { background-color: #D1FAE5; color: #059669; }
        .status-badge.pending { background-color: #FEF3C7; color: #D97706; }
        .status-badge.cancelled { background-color: #FEE2E2; color: #DC2626; }
        .status-badge.info { background-color: #DBEAFE; color: #2563EB; }
        
        .letter-spacing-1 { letter-spacing: 1px; }
        .border-dashed { border: 2px dashed #E5E7EB; }
        
        .transition-all { transition: all 0.3s ease; }
        .group:hover img { transform: scale(1.05); }
        .group-hover-opacity-100 { opacity: 1 !important; }
        
        .container-fluid { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default Riders;

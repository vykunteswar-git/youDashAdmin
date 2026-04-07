import { useState, useEffect } from "react";
import {
  Bike,
  Search,
  MoreVertical,
  Eye,
  MapPin,
  FileCheck,
  UserPlus,
  Phone,
  Mail,
  TrendingUp,
  ArrowRight,
  ShieldAlert,
  PowerOff
} from "lucide-react";

const Riders = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Active");

  const [riders, setRiders] = useState([
    { id: "RDR001", name: "Rahul Kumar", status: "Active", deliveries: 452, rating: 4.8, city: "Hyderabad", phone: "+91 88776 54321", currentOrder: "#RD4522" },
    { id: "RDR002", name: "Ajay Singh", status: "Active", deliveries: 120, rating: 4.5, city: "Chennai", phone: "+91 88776 54322", currentOrder: "#RD4521" },
    { id: "RDR003", name: "Suresh Rao", status: "Active", deliveries: 85, rating: 4.9, city: "Bangalore", phone: "+91 88776 54323", currentOrder: "Waiting..." },
    { id: "RDR004", name: "Vikas Patil", status: "Pending", deliveries: 0, rating: 0.0, city: "Pune", phone: "+91 88776 54324", currentOrder: "Documents pending" },
    { id: "RDR005", name: "Manish Verma", status: "Inactive", deliveries: 25, rating: 3.8, city: "Delhi", phone: "+91 88776 54325", currentOrder: "Offline" },
  ]);

  const toggleStatus = (id) => {
    setRiders(riders.map(r => r.id === id ? { ...r, status: r.status === 'Active' ? 'Inactive' : 'Active' } : r));
  };

  const forceOffline = (id) => {
    setRiders(riders.map(r => r.id === id ? { ...r, status: 'Inactive', currentOrder: "Forced Offline" } : r));
    alert("Rider forced offline safely.");
  };

  const handleVerify = (id) => {
    setRiders(riders.map(r => r.id === id ? { ...r, status: 'Active' } : r));
  };

  const triggerReverification = (id) => {
    setRiders(riders.map(r => r.id === id ? { ...r, status: 'Pending', currentOrder: "Documents Revoked" } : r));
    alert("Triggered KYC re-verification on Rider App.");
  };

  const suspendRider = (id) => {
    setRiders(riders.map(r => r.id === id ? { ...r, status: 'Suspended', currentOrder: "Account Blocked" } : r));
    alert("Rider suspended for 24 hours.");
  };

  const filteredRiders = riders.filter(rider =>
    (rider.name.toLowerCase().includes(search.toLowerCase()) || rider.id.toLowerCase().includes(search.toLowerCase())) &&
    (activeTab === "All" || rider.status === activeTab)
  );

  return (
    <div className="container-fluid fade-in">
      {/* Header Section */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Rider Management</h2>
          <p className="text-muted small mb-0">Monitor your delivery fleet performance and verify documents.</p>
        </div>
        <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
          <UserPlus size={18} /> <span>Onboard New Rider</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      <div className="row g-4 mb-4">
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-primary-red text-white" style={{ backgroundColor: '#E51818' }}>
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-white bg-opacity-25 p-2 rounded-3">
                <Bike size={20} />
              </div>
              <span className="small opacity-75 fw-bold">Active Riders</span>
            </div>
            <h4 className="fw-bold mb-0">842</h4>
            <small className="opacity-75" style={{ fontSize: '10px' }}>Current fleet size across cities</small>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success">
                <FileCheck size={20} />
              </div>
              <span className="small text-muted fw-bold">Pending Verification</span>
            </div>
            <h4 className="fw-bold mb-0">12</h4>
            <small className="text-muted" style={{ fontSize: '10px' }}>Riders awaiting document approval</small>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10">
            <div className="d-flex align-items-center gap-3 mb-2">
              <div className="bg-warning bg-opacity-10 p-2 rounded-3 text-warning">
                <TrendingUp size={20} />
              </div>
              <span className="small text-muted fw-bold">Avg Experience</span>
            </div>
            <h4 className="fw-bold mb-0">8.2 / 10</h4>
            <small className="text-muted" style={{ fontSize: '10px' }}>Service quality index this month</small>
          </div>
        </div>
      </div>

      {/* Filter and Content */}
      <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white">
        <div className="p-4 border-bottom d-flex flex-column flex-md-row gap-4">
          <div className="d-flex gap-2 overflow-auto custom-scrollbar">
            {["All", "Active", "Pending", "Inactive", "Suspended"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`btn p-0 px-3 py-1 rounded-pill small fw-bold transition-all border ${activeTab === tab ? 'bg-secondary text-white' : 'bg-light text-muted'}`}
                style={{ minWidth: '80px' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="search-container flex-grow-1">
            <Search size={18} className="text-muted" />
            <input
              type="text"
              placeholder="Search by rider name or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-control bg-light border-0 ps-5 py-2"
              style={{ borderRadius: '10px' }}
            />
          </div>
        </div>

        <div className="row g-0">
          <div className="col-12">
            <div className="table-responsive">
              <table className="table mb-0 table-hover">
                <thead className="bg-light">
                  <tr>
                    <th className="px-4 py-3 text-muted small border-0">RIDER</th>
                    <th className="px-3 py-3 text-muted small border-0">CONTACT</th>
                    <th className="px-3 py-3 text-muted small border-0">DELIVERIES</th>
                    <th className="px-3 py-3 text-muted small border-0">RATING</th>
                    <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                    <th className="px-4 py-3 text-muted small border-0 text-end">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRiders.map(rider => (
                    <tr key={rider.id} className="align-middle">
                      <td className="px-4 py-3 border-0">
                        <div className="d-flex align-items-center gap-3">
                          <div className="bg-light p-1 rounded-circle" style={{ width: '40px', height: '40px', border: '2px solid rgba(0,0,0,0.05)' }}>
                            <img src={`https://i.pravatar.cc/150?u=${rider.id}`} alt={rider.name} className="w-100 h-100 rounded-circle object-fit-cover" />
                          </div>
                          <div>
                            <p className="mb-0 fw-bold small">{rider.name}</p>
                            <small className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                              <MapPin size={10} /> {rider.city}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-0 small text-muted">
                        <div className="d-flex flex-column">
                          <span className="d-flex align-items-center gap-1"><Phone size={10} /> {rider.phone}</span>
                          <span className="d-flex align-items-center gap-1 text-primary-red" style={{ fontSize: '10px', color: '#E51818' }}>Live: {rider.currentOrder}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-0 small text-muted">
                        <div className="d-flex align-items-center gap-2 fw-bold text-dark">
                          {rider.deliveries} <span className="p-1 px-2 bg-success bg-opacity-10 text-success rounded-pill" style={{ fontSize: '8px' }}>Top 5%</span>
                        </div>
                      </td>
                      <td className="px-3 py-3 border-0 small">
                        <div className="d-flex align-items-center gap-1 text-warning fw-bold">
                          ★ {rider.rating}
                        </div>
                      </td>
                      <td className="px-3 py-3 border-0 small">
                        <span className={`status-badge status-${rider.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '11px' }}>{rider.status}</span>
                      </td>
                      <td className="px-4 py-3 border-0 text-end">
                        <div className="dropdown">
                          <button className="btn btn-light p-2 rounded-3 border-0" data-bs-toggle="dropdown"><MoreVertical size={16} /></button>
                          <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                            <li><h6 className="dropdown-header text-muted small fw-bold">EXECUTIVE CONTROLS</h6></li>
                            <li><button className="dropdown-item py-2 small rounded-3 fw-bold text-danger d-flex align-items-center gap-2" onClick={() => suspendRider(rider.id)}><ShieldAlert size={16} /> Suspend Account (24hr)</button></li>
                            <li><button className="dropdown-item py-2 small rounded-3 fw-bold text-warning d-flex align-items-center gap-2" onClick={() => forceOffline(rider.id)}><PowerOff size={16} /> Force Offline Shift</button></li>
                            <li><button className="dropdown-item py-2 small rounded-3 d-flex align-items-center gap-2" onClick={() => triggerReverification(rider.id)}><FileCheck size={16} /> Require KYC Re-verify</button></li>
                            <li><hr className="dropdown-divider opacity-25" /></li>
                            <li><button className="dropdown-item py-2 small rounded-3" onClick={() => handleVerify(rider.id)}>Manually Verify Doc</button></li>
                            <li><button className="dropdown-item py-2 small rounded-3" onClick={() => toggleStatus(rider.id)}>Toggle Activity State</button></li>
                          </ul>
                        </div>
                      </td>
                    </tr>
                  ))}
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

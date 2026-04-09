import { useState } from "react";
import {
  Search,
  MoreVertical,
  Plus,
  Eye,
  ChevronRight,
  Clock,
  Navigation,
  Package,
  Filter,
  ArrowDownToLine,
  MapPin,
  X,
  User,
  Phone,
  CreditCard
} from "lucide-react";

const Orders = () => {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [orders, setOrders] = useState([
    { id: "ORD001", user: "Gowtham Akhil", type: "Express", status: "Delivered", pick: "Hyd, Telangana", drop: "Ban, Karnataka", time: "Oct 20, 2024", rider: "Rahul Kumar", amount: 450 },
    { id: "ORD002", user: "Jane Smith", type: "Standard", status: "Active", pick: "Che, Tamil Nadu", drop: "Mum, Maharashtra", time: "Oct 21, 2024", rider: "Ajay Singh", amount: 1200 },
    { id: "ORD003", user: "Mike Johnson", type: "Insurance", status: "Pending", pick: "Del, Delhi", drop: "Pun, Maharashtra", time: "Oct 22, 2024", rider: "Not Assigned", amount: 850 },
    { id: "ORD004", user: "Emily Davis", type: "Express", status: "Cancelled", pick: "Hyd, Telangana", drop: "Sec, Telangana", time: "Oct 23, 2024", rider: "Not Assigned", amount: 200 },
    { id: "ORD005", user: "Chris Brown", type: "Insurance", status: "Active", pick: "Ban, Karnataka", drop: "Koc, Kerala", time: "Oct 24, 2024", rider: "Suresh Rao", amount: 1450 },
  ]);

  const updateStatus = (id, newStatus) => {
    setOrders(orders.map(o => o.id === id ? { ...o, status: newStatus } : o));
    // If we're updating from within the full screen detail, sync the selectedOrder state
    if (selectedOrder && selectedOrder.id === id) {
      setSelectedOrder({ ...selectedOrder, status: newStatus });
    }
  };

  const handleCreate = () => {
    const user = window.prompt("Customer Name:");
    if (!user) return;
    const newOrder = {
      id: `ORD00${orders.length + 1}`,
      user,
      type: "Express",
      status: "Pending",
      pick: "Current Location",
      drop: "Destination",
      time: "Just now",
      rider: "Not Assigned",
      amount: 500
    };
    setOrders([newOrder, ...orders]);
  };

  const tabs = ["All", "Active", "Pending", "Delivered", "Cancelled"];

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.id.toLowerCase().includes(search.toLowerCase()) || order.user.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "All" || order.status === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <>
      <div className="container-fluid fade-in position-relative">
        {/* Header Section */}
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
          <div>
            <h2 className="fw-bold mb-1">Order Management</h2>
            <p className="text-muted small mb-0">Track, manage and analyze all delivery orders in real-time.</p>
          </div>
          <div className="d-flex gap-2">
            <button className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 small border-0 shadow-sm" style={{ backgroundColor: 'white', borderRadius: '10px' }}>
              <ArrowDownToLine size={18} /> <span className="fw-bold">Export CSV</span>
            </button>
            <button
              onClick={handleCreate}
              className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
              style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}
            >
              <Plus size={18} /> <span>Create Order</span>
            </button>
          </div>
        </div>

        {/* Tabs Row */}
        <div className="d-flex gap-3 mb-4 overflow-auto pb-2 custom-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`btn border-0 px-4 py-2 small rounded-pill transition-all ${activeTab === tab ? 'bg-primary-red text-white' : 'bg-white text-muted shadow-sm'}`}
              style={{ backgroundColor: activeTab === tab ? '#E51818' : '#FFFFFF', minWidth: '100px' }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search and Filters */}
        <div className="dashboard-card mb-4 border-0">
          <div className="d-flex flex-column flex-md-row gap-3">
            <div className="search-container flex-grow-1">
              <Search size={18} className="text-muted" />
              <input
                type="text"
                placeholder="Search by Order ID or User name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-control bg-light border-0 ps-5 py-2"
                style={{ borderRadius: '10px' }}
              />
            </div>
            <button className="btn btn-light px-4 d-flex align-items-center gap-2 border-0 fw-bold text-muted" style={{ borderRadius: '10px' }}>
              <Filter size={18} /> <span>Filters</span>
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm">
          <div className="table-responsive">
            <table className="table mb-0 table-hover">
              <thead className="bg-light">
                <tr>
                  <th className="px-4 py-3 text-muted small border-0">ORDER ID</th>
                  <th className="px-3 py-3 text-muted small border-0">USER</th>
                  <th className="px-3 py-3 text-muted small border-0">ROUTE</th>
                  <th className="px-3 py-3 text-muted small border-0">SERVICE</th>
                  <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                  <th className="px-3 py-3 text-muted small border-0 text-end">AMOUNT</th>
                  <th className="px-4 py-3 text-muted small border-0"></th>
                </tr>
              </thead>
              <tbody className="border-0">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="align-middle cursor-pointer hover-bg-light" onClick={() => setSelectedOrder(order)}>
                    <td className="px-4 py-3 border-0">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold small">{order.id}</span>
                        <div className="p-1 rounded-circle bg-light d-flex align-items-center justify-content-center text-muted">
                          <Eye size={12} />
                        </div>
                      </div>
                      <small className="text-muted" style={{ fontSize: '10px' }}><Clock size={10} className="me-1" /> {order.time}</small>
                    </td>
                    <td className="px-3 py-3 border-0 small fw-bold">{order.user}</td>
                    <td className="px-3 py-3 border-0">
                      <div className="d-flex align-items-center gap-2 small text-muted">
                        <MapPin size={12} className="text-danger" /> <span>{order.pick}</span>
                        <ChevronRight size={10} />
                        <MapPin size={12} className="text-success" /> <span>{order.drop}</span>
                      </div>
                      <small className="text-muted" style={{ fontSize: '10px' }}>Rider: {order.rider}</small>
                    </td>
                    <td className="px-3 py-3 border-0">
                      <span className={`badge rounded-pill p-1 px-3 ${order.type === 'Express' ? 'bg-primary-red opacity-75' : 'bg-info opacity-75'}`} style={{ fontSize: '10px', backgroundColor: order.type === 'Express' ? '#E51818' : '#3B82F6' }}>{order.type}</span>
                    </td>
                    <td className="px-3 py-3 border-0">
                      <span className={`status-badge status-${order.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '11px' }}>{order.status}</span>
                    </td>
                    <td className="px-3 py-3 border-0 text-end fw-bold small">₹{order.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 border-0 text-end" onClick={(e) => e.stopPropagation()}>
                      <div className="dropdown">
                        <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown"><MoreVertical size={18} /></button>
                        <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                          {["Active", "Pending", "Delivered", "Cancelled"].map(st => (
                            <li key={st}><button className="dropdown-item py-2 small rounded-3" onClick={() => updateStatus(order.id, st)}>Mark as {st}</button></li>
                          ))}
                        </ul>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="d-flex justify-content-between align-items-center mt-4 pb-4">
          <p className="text-muted small mb-0">Showing 1 to {filteredOrders.length} of {orders.length} results</p>
          <div className="d-flex gap-2">
            <button className="btn btn-light px-3 py-1 small rounded-3 border">Prev</button>
            <button className="btn btn-primary-red px-3 py-1 small rounded-3" style={{ backgroundColor: '#E51818', color: 'white' }}>Next</button>
          </div>
        </div>
      </div>

      {/* FULL SCREEN ORDER DETAILS VIEW */}
      {selectedOrder && (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-light fade-in" style={{ zIndex: 1050, overflowY: 'auto' }}>
          <div className="bg-white shadow-sm sticky-top px-3 py-3 d-flex justify-content-between align-items-center mb-4 border-bottom">
            <div className="container-fluid d-flex justify-content-between align-items-center">
              <div>
                <h4 className="fw-bold mb-1 d-flex align-items-center gap-3">
                  Order #{selectedOrder.id}
                  <span className={`status-badge status-${selectedOrder.status.toLowerCase()} p-1 px-3 fs-6`}>{selectedOrder.status}</span>
                </h4>
                <p className="text-muted small mb-0"><Clock size={12} className="me-1" /> Ordered on {selectedOrder.time} by <span className="fw-bold">{selectedOrder.user}</span></p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <div className="dropdown">
                  <button className="btn btn-outline-danger d-flex align-items-center gap-2 fw-bold border" data-bs-toggle="dropdown" style={{ borderRadius: '10px' }}>
                    Executive Action <ChevronRight size={16} />
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                    <li><h6 className="dropdown-header text-muted small fw-bold">FORCE OVERRIDE LIMITS</h6></li>
                    <li><button className="dropdown-item py-2 small rounded-3 fw-bold text-success" onClick={() => updateStatus(selectedOrder.id, "Delivered")}>Mark Complete (Force)</button></li>
                    <li><button className="dropdown-item py-2 small rounded-3 fw-bold text-danger" onClick={() => updateStatus(selectedOrder.id, "Cancelled")}>Kill Order (Force Cancel)</button></li>
                    <li><hr className="dropdown-divider opacity-25" /></li>
                    <li><h6 className="dropdown-header text-muted small fw-bold">STANDARD STATUS</h6></li>
                    {["Active", "Pending"].map(st => (
                      <li key={st}><button className="dropdown-item py-2 small rounded-3" onClick={() => updateStatus(selectedOrder.id, st)}>Mark as {st}</button></li>
                    ))}
                  </ul>
                </div>
                <button className="btn btn-light rounded-circle p-2 d-flex align-items-center justify-content-center bg-danger text-white border-0 shadow-sm" onClick={() => setSelectedOrder(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>
          </div>

          <div className="container-fluid pb-5 px-sm-4">
            <div className="row g-4">
              {/* Left Column - Route & Details */}
              <div className="col-12 col-lg-8">
                <div className="dashboard-card border-0 shadow-sm p-4 mb-4">
                  <h5 className="fw-bold mb-4 d-flex align-items-center gap-2"><Navigation size={20} className="text-primary-red" /> Delivery Route Status</h5>

                  <div className="d-flex flex-column gap-5 position-relative ms-2 mt-4">
                    <div className="position-absolute border-start border-2 dashed-border opacity-50" style={{ left: '15px', top: '20px', bottom: '20px', zIndex: 0, borderColor: '#CBD5E1' }}></div>

                    <div className="d-flex gap-4 position-relative z-1 align-items-start">
                      <div className="bg-white rounded-circle border border-2 border-danger d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                        <MapPin size={16} className="text-danger" />
                      </div>
                      <div className="flex-grow-1">
                        <p className="fw-bold mb-1">Pickup Information</p>
                        <div className="p-3 bg-light rounded-3 d-flex flex-column gap-2 mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white text-muted border px-2 py-1 small">Sender</span>
                            <span className="fw-bold small">{selectedOrder.user}</span>
                          </div>
                          <span className="text-muted small">{selectedOrder.pick}</span>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex gap-4 position-relative z-1 align-items-start">
                      <div className="bg-white rounded-circle border border-2 border-success d-flex align-items-center justify-content-center shadow-sm" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                        <MapPin size={16} className="text-success" />
                      </div>
                      <div className="flex-grow-1">
                        <p className="fw-bold mb-1">Dropoff Information</p>
                        <div className="p-3 bg-light rounded-3 d-flex flex-column gap-2">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-white text-muted border px-2 py-1 small">Receiver</span>
                            <span className="fw-bold small">Unknown Confirmed Contact</span>
                          </div>
                          <span className="text-muted small">{selectedOrder.drop}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="dashboard-card border-0 shadow-sm p-4">
                  <h5 className="fw-bold mb-4 d-flex align-items-center gap-2"><Package size={20} className="text-primary-red" /> Package Integrity Details</h5>
                  <div className="row g-4 pt-2">
                    <div className="col-sm-6 col-md-3">
                      <p className="text-muted small mb-1">Service Tier</p>
                      <span className={`badge rounded-pill p-1 px-3 ${selectedOrder.type === 'Express' ? 'bg-primary-red opacity-75' : 'bg-info opacity-75'}`} style={{ fontSize: '10px', backgroundColor: selectedOrder.type === 'Express' ? '#E51818' : '#3B82F6' }}>{selectedOrder.type} Delivery</span>
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <p className="text-muted small mb-1">Weight Estimate</p>
                      <p className="fw-bold m-0"><span className="fs-5">3.5</span> kg</p>
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <p className="text-muted small mb-1">Fragile Content</p>
                      <p className="fw-bold m-0 badge bg-success text-white px-2 py-1">No risk detected</p>
                    </div>
                    <div className="col-sm-6 col-md-3">
                      <p className="text-muted small mb-1">Packaging Info</p>
                      <p className="fw-bold m-0 d-flex align-items-center gap-1"><Package size={14} /> Courier Bag</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Rider & Payment */}
              <div className="col-12 col-lg-4 d-flex flex-column gap-4">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0 d-flex align-items-center gap-2"><User size={20} className="text-primary-red" /> Assigned Delivery Agent</h5>
                  <button className="btn btn-link p-0 text-muted small fw-bold" onClick={() => {
                    const newRider = window.prompt("Enter new Rider ID to force assign:");
                    if (newRider) {
                      const updatedOrders = orders.map(o => o.id === selectedOrder.id ? { ...o, rider: newRider } : o);
                      setOrders(updatedOrders);
                      setSelectedOrder({ ...selectedOrder, rider: newRider });
                    }
                  }}>↻ Re-assign</button>
                </div>

                {selectedOrder.rider !== "Not Assigned" ? (
                  <div className="d-flex flex-column gap-3">
                    <div className="d-flex align-items-center gap-3 bg-light p-3 rounded-3 border">
                      <div className="bg-white shadow-sm rounded-circle p-2 text-primary-red d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}>
                        <User size={24} />
                      </div>
                      <div className="flex-grow-1">
                        <p className="fw-bold mb-0 fs-6">{selectedOrder.rider}</p>
                        <p className="text-warning small mb-0 fw-bold">⭐ 4.8 <span className="text-muted opacity-75">/ 500+ Trips</span></p>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button className="btn btn-light flex-grow-1 border-0 fw-bold text-muted rounded-3 shadow-sm py-2"><MapPin size={16} className="me-2 text-primary-red" /> Track</button>
                      <button className="btn btn-primary-red flex-grow-1 text-white fw-bold rounded-3 shadow-sm py-2" style={{ backgroundColor: '#E51818' }}><Phone size={16} className="me-2" /> Call</button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted bg-light rounded-3 border border-dashed">
                    <Clock size={36} className="mb-3 opacity-25" />
                    <p className="mb-1 fw-bold text-dark">Locating nearby Riders</p>
                    <p className="small mb-0 opacity-75">Our algorithm is pairing the closest agent.</p>
                    <div className="spinner-border text-danger mt-3" role="status" style={{ width: '1.5rem', height: '1.5rem' }}></div>
                  </div>
                )}
              </div>

              <div className="dashboard-card border-0 shadow-sm p-4 flex-grow-1">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold m-0 d-flex align-items-center gap-2"><CreditCard size={20} className="text-primary-red" /> Billing Summary</h5>
                  <button className="btn btn-link p-0 text-muted small fw-bold" onClick={() => {
                    const newPrice = window.prompt("Enter overridden final price (Admin override ensures refund/charge offsets):");
                    if (newPrice && !isNaN(newPrice)) {
                      const updatedAmount = parseFloat(newPrice);
                      const updatedOrders = orders.map(o => o.id === selectedOrder.id ? { ...o, amount: updatedAmount } : o);
                      setOrders(updatedOrders);
                      setSelectedOrder({ ...selectedOrder, amount: updatedAmount });
                    }
                  }}>✎ Override</button>
                </div>

                <div className="p-3 bg-light rounded-3 mb-4">
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small fw-bold">Base Fare ({selectedOrder.type})</span>
                    <span className="small fw-bold">₹{Math.max(selectedOrder.amount - 150, 0)}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted small fw-bold">Distance Rate (12km)</span>
                    <span className="small fw-bold">₹100</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
                    <span className="text-muted small fw-bold">Taxes & Insurance</span>
                    <span className="small fw-bold">₹50</span>
                  </div>
                  <div className="d-flex justify-content-between pt-2">
                    <span className="fw-bold text-dark">Gross Total</span>
                    <span className="fw-bold fs-5 text-primary-red" style={{ color: '#E51818' }}>₹{selectedOrder.amount}</span>
                  </div>
                </div>

                <div className="d-flex align-items-center justify-content-center gap-2 p-3 border border-success bg-white text-success rounded-3 fw-bold shadow-sm">
                  <CreditCard size={18} /> Prepaid via UPI
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Orders;

import { useState } from "react";
import {
    Ticket,
    Plus,
    Search,
    Tag,
    Clock,
    MapPin,
    CheckCircle2,
    XCircle,
    MoreVertical,
    Percent,
    Banknote,
    Navigation
} from "lucide-react";

const Promotions = () => {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("Active");

    const [coupons, setCoupons] = useState([
        { id: "PROMO01", code: "WELCOME50", type: "Flat", value: 50, status: "Active", uses: 452, limit: 1000, expiry: "2024-12-31", zone: "Global" },
        { id: "PROMO02", code: "HYDERABAD20", type: "Percentage", value: 20, status: "Active", uses: 120, limit: 500, expiry: "2024-11-15", zone: "Hyderabad" },
        { id: "PROMO03", code: "FESTIVAL100", type: "Flat", value: 100, status: "Expired", uses: 500, limit: 500, expiry: "2024-10-31", zone: "Global" },
        { id: "PROMO04", code: "RIDERDELIP", type: "Percentage", value: 10, status: "Active", uses: 45, limit: 200, expiry: "2024-12-01", zone: "Delhi" },
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newCoupon, setNewCoupon] = useState({ code: "", type: "Flat", value: "", limit: "", expiry: "", zone: "Global" });

    const toggleStatus = (id) => {
        setCoupons(coupons.map(c => c.id === id ? { ...c, status: c.status === 'Active' ? 'Paused' : 'Active' } : c));
    };

    const handleCreateOpen = () => {
        setNewCoupon({ code: "", type: "Flat", value: "", limit: "", expiry: "", zone: "Global" });
        setIsModalOpen(true);
    };

    const handleSubmit = () => {
        if (!newCoupon.code || !newCoupon.value) return alert("Please fill code and value.");

        setCoupons([{
            id: `PROMO0${coupons.length + 1}`,
            code: newCoupon.code.toUpperCase(),
            type: newCoupon.type,
            value: Number(newCoupon.value),
            status: "Active",
            uses: 0,
            limit: Number(newCoupon.limit) || "Unlimited",
            expiry: newCoupon.expiry || "No Expiry",
            zone: newCoupon.zone
        }, ...coupons]);

        setIsModalOpen(false);
    };

    const filteredCoupons = coupons.filter(c =>
        c.code.toLowerCase().includes(search.toLowerCase()) &&
        (activeTab === "All" || c.status === activeTab)
    );

    return (
        <div className="container-fluid fade-in position-relative">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Promotions & Coupons</h2>
                    <p className="text-muted small mb-0">Create and manage discount codes, referral bonuses, and targeted offers.</p>
                </div>
                <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }} onClick={handleCreateOpen}>
                    <Plus size={18} /> <span>Create Campaign</span>
                </button>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 shadow-sm bg-white border-start border-4 border-danger">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <div className="bg-danger bg-opacity-10 p-2 rounded-3 text-danger"><Ticket size={20} /></div>
                            <span className="small text-muted fw-bold">Active Campaigns</span>
                        </div>
                        <h4 className="fw-bold mb-0">{coupons.filter(c => c.status === 'Active').length}</h4>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 shadow-sm bg-white border-start border-4 border-success">
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success"><Tag size={20} /></div>
                            <span className="small text-muted fw-bold">Total Redemptions</span>
                        </div>
                        <h4 className="fw-bold mb-0">{coupons.reduce((acc, curr) => acc + curr.uses, 0)}</h4>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 shadow-sm bg-primary-red text-white" style={{ backgroundColor: '#E51818' }}>
                        <div className="d-flex align-items-center gap-3 mb-2">
                            <div className="bg-white bg-opacity-25 p-2 rounded-3"><Banknote size={20} /></div>
                            <span className="small opacity-75 fw-bold">Discount Value Burn</span>
                        </div>
                        <h4 className="fw-bold mb-0">₹45,200</h4>
                    </div>
                </div>
            </div>

            <div className="dashboard-card p-0 border-0 shadow-sm overflow-hidden bg-white">
                <div className="p-4 border-bottom d-flex flex-column flex-md-row gap-4">
                    <div className="d-flex gap-2 overflow-auto custom-scrollbar">
                        {["All", "Active", "Paused", "Expired"].map(tab => (
                            <button key={tab} onClick={() => setActiveTab(tab)} className={`btn p-0 px-4 py-2 rounded-pill small fw-bold transition-all border ${activeTab === tab ? 'bg-secondary text-white border-secondary' : 'bg-light text-muted border-0'}`}>
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="search-container flex-grow-1">
                        <Search size={18} className="text-muted" />
                        <input type="text" placeholder="Search promo codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-control bg-light border-0 ps-5 py-2" style={{ borderRadius: '10px' }} />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table hover-bg-light mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small text-muted border-0">PROMO CODE</th>
                                <th className="px-3 py-3 small text-muted border-0">DISCOUNT</th>
                                <th className="px-3 py-3 small text-muted border-0">USAGE / LIMIT</th>
                                <th className="px-3 py-3 small text-muted border-0">TARGET ZONE</th>
                                <th className="px-3 py-3 small text-muted border-0">STATUS</th>
                                <th className="px-4 py-3 small text-muted border-0 text-end">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredCoupons.map((coupon) => (
                                <tr key={coupon.id} className="align-middle border-bottom border-light">
                                    <td className="px-4 py-3 border-0">
                                        <div className="d-flex align-items-center gap-3">
                                            <div className="p-2 bg-danger bg-opacity-10 text-danger rounded-3"><Ticket size={16} /></div>
                                            <div>
                                                <p className="mb-0 fw-bold">{coupon.code}</p>
                                                <small className="text-muted" style={{ fontSize: '10px' }}><Clock size={10} className="me-1" /> Exp: {coupon.expiry}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-0 fw-bold">
                                        {coupon.type === "Percentage" ? <span className="text-primary-red">{coupon.value}% OFF</span> : <span className="text-primary-red">₹{coupon.value} FLAT</span>}
                                    </td>
                                    <td className="px-3 py-3 border-0 small text-muted">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="progress flex-grow-1" style={{ height: '6px', maxWidth: '80px' }}>
                                                <div className={`progress-bar ${coupon.uses >= coupon.limit ? 'bg-danger' : 'bg-success'}`} style={{ width: `${(coupon.uses / (coupon.limit === 'Unlimited' ? coupon.uses + 1 : coupon.limit)) * 100}%` }}></div>
                                            </div>
                                            <span className="fw-bold">{coupon.uses} <span className="fw-normal opacity-50">/ {coupon.limit}</span></span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-0 small text-muted d-flex align-items-center gap-1 mt-2">
                                        <Navigation size={12} className={coupon.zone === 'Global' ? 'text-primary' : 'text-danger'} /> {coupon.zone}
                                    </td>
                                    <td className="px-3 py-3 border-0">
                                        <span className={`status-badge status-${coupon.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '10px' }}>{coupon.status}</span>
                                    </td>
                                    <td className="px-4 py-3 border-0 text-end">
                                        {coupon.status !== 'Expired' && (
                                            <button className="btn btn-light p-2 rounded-3 border-0" onClick={() => toggleStatus(coupon.id)} title={coupon.status === 'Active' ? 'Pause Campaign' : 'Resume Campaign'}>
                                                {coupon.status === 'Active' ? <XCircle size={16} className="text-warning" /> : <CheckCircle2 size={16} className="text-success" />}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '500px' }}>
                        <h4 className="fw-bold mb-4 d-flex align-items-center gap-2"><Ticket className="text-danger" /> New Promo Campaign</h4>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Promo Code</label>
                                <input type="text" className="form-control bg-light border-0 py-2 text-uppercase fw-bold text-danger" placeholder="e.g. SUMMER50" value={newCoupon.code} onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-sm-6">
                                <label className="form-label small text-muted fw-bold">Discount Type</label>
                                <select className="form-select bg-light border-0 py-2" value={newCoupon.type} onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value })} style={{ borderRadius: '10px' }}>
                                    <option value="Flat">Flat Amount (₹)</option>
                                    <option value="Percentage">Percentage (%)</option>
                                </select>
                            </div>

                            <div className="col-sm-6">
                                <label className="form-label small text-muted fw-bold">Discount Value</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-0">{newCoupon.type === 'Flat' ? '₹' : '%'}</span>
                                    <input type="number" className="form-control bg-light border-0 py-2" placeholder="50" value={newCoupon.value} onChange={(e) => setNewCoupon({ ...newCoupon, value: e.target.value })} />
                                </div>
                            </div>

                            <div className="col-sm-6">
                                <label className="form-label small text-muted fw-bold">Usage Limit (Optional)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 1000 users" value={newCoupon.limit} onChange={(e) => setNewCoupon({ ...newCoupon, limit: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-sm-6">
                                <label className="form-label small text-muted fw-bold">Expiry Date</label>
                                <input type="date" className="form-control bg-light border-0 py-2" value={newCoupon.expiry} onChange={(e) => setNewCoupon({ ...newCoupon, expiry: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Target Zone Restriction</label>
                                <select className="form-select bg-light border-0 py-2" value={newCoupon.zone} onChange={(e) => setNewCoupon({ ...newCoupon, zone: e.target.value })} style={{ borderRadius: '10px' }}>
                                    <option value="Global">Global (All Zones)</option>
                                    <option value="Hyderabad">Hyderabad Only</option>
                                    <option value="Bangalore">Bangalore Only</option>
                                    <option value="Delhi">Delhi Only</option>
                                </select>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4 pt-3 border-top">
                            <button className="btn btn-light flex-grow-1 py-2 fw-bold rounded-3" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-2 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleSubmit}>Launch Campaign</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Promotions;

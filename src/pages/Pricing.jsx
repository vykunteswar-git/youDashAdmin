import { useState } from "react";
import {
    DollarSign,
    Settings,
    CheckCircle2,
    Zap,
    ShieldCheck,
    Truck,
    MapPin,
    Plus,
    MoreVertical,
    TrendingUp,
    Clock,
    Sliders,
    Calendar,
    X,
    Edit,
    Trash2
} from "lucide-react";

const Pricing = () => {
    const [plans, setPlans] = useState([
        { id: 1, name: "Express", base: 45, perKm: 12, wait: 2, icon: Zap, color: "#E51818", active: true },
        { id: 2, name: "Standard", base: 30, perKm: 8, wait: 1, icon: Truck, color: "#3B82F6", active: true },
        { id: 3, name: "Insurance", base: 60, perKm: 15, wait: 5, icon: ShieldCheck, color: "#F59E0B", active: false }
    ]);

    const [activePlan, setActivePlan] = useState("Express");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState(null);
    const [newPlan, setNewPlan] = useState({ name: "", base: "", perKm: "", wait: "", color: "#E51818" });

    const handleAddOpen = () => {
        setEditingPlanId(null);
        setNewPlan({ name: "", base: "", perKm: "", wait: "", color: "#E51818" });
        setIsModalOpen(true);
    };

    const handleEditOpen = (plan) => {
        setEditingPlanId(plan.id);
        setNewPlan({ name: plan.name, base: plan.base, perKm: plan.perKm, wait: plan.wait, color: plan.color });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this pricing plan?")) {
            setPlans(plans.filter(p => p.id !== id));
        }
    };

    const toggleActive = (id) => {
        setPlans(plans.map(p => p.id === id ? { ...p, active: !p.active } : p));
    };

    const handleSubmit = () => {
        if (!newPlan.name || newPlan.base === "" || newPlan.perKm === "" || newPlan.wait === "") {
            return alert("Please fill all fields");
        }
        if (editingPlanId) {
            setPlans(plans.map(p => p.id === editingPlanId ? {
                ...p,
                name: newPlan.name,
                base: parseFloat(newPlan.base),
                perKm: parseFloat(newPlan.perKm),
                wait: parseFloat(newPlan.wait),
                color: newPlan.color
            } : p));
        } else {
            setPlans([...plans, {
                id: plans.length + Math.random(),
                name: newPlan.name,
                base: parseFloat(newPlan.base),
                perKm: parseFloat(newPlan.perKm),
                wait: parseFloat(newPlan.wait),
                icon: Zap, // Default generic icon
                color: newPlan.color,
                active: true
            }]);
        }
        setIsModalOpen(false);
        setEditingPlanId(null);
    };

    return (
        <div className="container-fluid fade-in position-relative">
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Pricing Configuration</h2>
                    <p className="text-muted small mb-0">Manage base rates, mileage fees, and surcharge triggers.</p>
                </div>
                <div className="d-flex gap-2">
                    <button onClick={handleAddOpen} className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                        <Plus size={18} /> <span>Create Setup</span>
                    </button>
                </div>
            </div>

            <div className="row g-4 mb-4">
                {plans.map((plan) => (
                    <div key={plan.id} className="col-12 col-md-4">
                        <div
                            onClick={() => plan.active && setActivePlan(plan.name)}
                            className={`dashboard-card h-100 border-0 shadow-sm transition-all position-relative ${activePlan === plan.name ? 'border border-primary-red' : ''} ${!plan.active ? 'opacity-75 grayscale' : 'cursor-pointer'}`}
                            style={{ borderColor: activePlan === plan.name && plan.active ? '#E51818' : '' }}
                        >
                            <div className="d-flex justify-content-between mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <div className="p-2 bg-light rounded-3 d-inline-block" style={{ color: plan.active ? plan.color : '#64748B' }}>
                                        <plan.icon size={28} />
                                    </div>
                                    <div className={`badge ${plan.active ? 'bg-success' : 'bg-secondary'} rounded-pill`} style={{ fontSize: '10px' }}>
                                        {plan.active ? 'ACTIVE' : 'INACTIVE'}
                                    </div>
                                </div>

                                <div className="dropdown">
                                    <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown" onClick={(e) => e.stopPropagation()}>
                                        <MoreVertical size={20} />
                                    </button>
                                    <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                                        <li>
                                            <button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small" onClick={(e) => { e.stopPropagation(); handleEditOpen(plan); }}>
                                                <Edit size={16} /> Edit Setup
                                            </button>
                                        </li>
                                        <li>
                                            <button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small" onClick={(e) => { e.stopPropagation(); toggleActive(plan.id); }}>
                                                <TrendingUp size={16} /> Mark as {plan.active ? 'Inactive' : 'Active'}
                                            </button>
                                        </li>
                                        <li><hr className="dropdown-divider opacity-50" /></li>
                                        <li>
                                            <button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}>
                                                <Trash2 size={16} /> Delete Plan
                                            </button>
                                        </li>
                                    </ul>
                                </div>
                            </div>

                            <h5 className="fw-bold mb-1">{plan.name} Delivery</h5>
                            <p className="text-muted small mb-4">Base Fare + Per Km + Surcharges</p>

                            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light">
                                <span className="text-muted small fw-bold">Base Fare</span>
                                <span className="fw-bold small text-dark">₹{plan.base}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom border-light">
                                <span className="text-muted small fw-bold">Price per Km</span>
                                <span className="fw-bold small text-dark">₹{plan.perKm}</span>
                            </div>
                            <div className="d-flex justify-content-between pb-2">
                                <span className="text-muted small fw-bold">Wait fee / min</span>
                                <span className="fw-bold small text-dark">₹{plan.wait}</span>
                            </div>

                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4 pb-5">
                {/* Dynamic Pricing Sliders */}
                <div className="col-12 col-xl-8">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Sliders size={20} className="text-primary-red" /> Dynamic Surge Configuration
                        </h5>
                        <div className="d-flex flex-column gap-5 py-4 px-2">
                            <div className="w-100">
                                <div className="d-flex justify-content-between mb-2">
                                    <label className="fw-bold small">Peak Hour Multiplier (1.0x - 3.0x)</label>
                                    <span className="p-1 px-3 bg-primary-red text-white rounded-pill fw-bold" style={{ fontSize: '10px', backgroundColor: '#E51818' }}>1.5x</span>
                                </div>
                                <input type="range" className="form-range custom-range" min="10" max="30" defaultValue="15" />
                                <div className="d-flex justify-content-between mt-1 opacity-50 small" style={{ fontSize: '10px' }}>
                                    <span>1.0x (Normal)</span>
                                    <span>2.0x (Peak)</span>
                                    <span>3.0x (High Demand)</span>
                                </div>
                            </div>

                            <div className="w-100">
                                <div className="d-flex justify-content-between mb-2">
                                    <label className="fw-bold small">Rain/Weather Surcharge (Flat ₹)</label>
                                    <span className="p-1 px-3 bg-secondary text-white rounded-pill fw-bold" style={{ fontSize: '10px' }}>₹45</span>
                                </div>
                                <input type="range" className="form-range" min="0" max="100" defaultValue="45" />
                            </div>

                            <div className="w-100">
                                <div className="d-flex justify-content-between mb-2">
                                    <label className="fw-bold small">Weight Surcharge (per 5kg)</label>
                                    <span className="p-1 px-3 bg-info text-white rounded-pill fw-bold" style={{ fontSize: '10px' }}>₹12</span>
                                </div>
                                <input type="range" className="form-range" min="0" max="50" defaultValue="12" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Night / Holiday Surcharges */}
                <div className="col-12 col-xl-4 h-100">
                    <div className="dashboard-card border-0 shadow-sm h-100 d-flex flex-column">
                        <h5 className="fw-bold mb-4">Special Surcharges</h5>
                        <div className="d-flex flex-column gap-3 mb-4">
                            {[
                                { label: "Night Shift (11PM - 5AM)", value: "Fixed ₹50", icon: Clock },
                                { label: "Public Holiday Charge", value: "1.2x Multiplier", icon: Calendar },
                                { label: "Out of Station Entry Tax", value: "Realtime", icon: MapPin }
                            ].map((item, i) => (
                                <div key={i} className="p-3 border rounded-3 d-flex align-items-center justify-content-between">
                                    <div className="d-flex align-items-center gap-3">
                                        <item.icon size={18} className="text-primary-red" />
                                        <div>
                                            <p className="mb-0 fw-bold small">{item.label}</p>
                                            <small className="text-muted" style={{ fontSize: '10px' }}>{item.value}</small>
                                        </div>
                                    </div>
                                    <div className="form-check form-switch">
                                        <input className="form-check-input" type="checkbox" defaultChecked style={{ width: '36px', height: '18px' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary-red w-100 mt-auto py-3 fw-bold rounded-3 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white' }}>Update Rates</button>
                    </div>
                </div>
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '450px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingPlanId ? "Edit Delivery Setup" : "Create Delivery Setup"}</h4>
                            <button className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center" onClick={() => setIsModalOpen(false)}>
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Plan Name</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Hyperlocal" value={newPlan.name} onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Base Price (₹)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 50" value={newPlan.base} onChange={(e) => setNewPlan({ ...newPlan, base: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Price Per Km (₹)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 10" value={newPlan.perKm} onChange={(e) => setNewPlan({ ...newPlan, perKm: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Waiting Fee/min (₹)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 2" value={newPlan.wait} onChange={(e) => setNewPlan({ ...newPlan, wait: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Theme Color</label>
                                <input type="color" className="form-control form-control-color bg-light border-0 py-2 w-100" value={newPlan.color} onChange={(e) => setNewPlan({ ...newPlan, color: e.target.value })} style={{ borderRadius: '10px', height: '40px' }} />
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleSubmit}>{editingPlanId ? "Save Changes" : "Save Plan"}</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Pricing;

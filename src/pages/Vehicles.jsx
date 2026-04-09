import { useState } from "react";
import {
    Truck,
    Bike,
    Car,
    Plus,
    MoreVertical,
    Settings,
    Trash2,
    Edit,
    CheckCircle2,
    XCircle,
    TrendingUp,
    Package,
    X,
    Image
} from "lucide-react";

const Vehicles = () => {
    const [vehicles, setVehicles] = useState([
        { id: 1, type: "Motorcycle", capacity: "20kg", basePrice: 40, active: true, icon: Bike, orders: 1240, riders: 450 },
        { id: 2, type: "Mini-Truck", capacity: "500kg", basePrice: 200, active: true, icon: Truck, orders: 480, riders: 120 },
        { id: 3, type: "Large-Truck", capacity: "2000kg", basePrice: 850, active: true, icon: Truck, orders: 120, riders: 45 },
        { id: 4, type: "Sedan / Car", capacity: "100kg", basePrice: 120, active: false, icon: Car, orders: 0, riders: 0 },
    ]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicleId, setEditingVehicleId] = useState(null);
    const [newVehicle, setNewVehicle] = useState({ name: "", type: "Motorcycle", perKm: "", basePrice: "", maxWeight: "" });

    const toggleVehicle = (id) => {
        setVehicles(vehicles.map(v => v.id === id ? { ...v, active: !v.active } : v));
    };

    const handleAddOpen = () => {
        setEditingVehicleId(null);
        setNewVehicle({ name: "", type: "Motorcycle", perKm: "", basePrice: "", maxWeight: "" });
        setIsModalOpen(true);
    };

    const handleEditOpen = (v) => {
        let typeVal = "Motorcycle";
        if (v.icon === Truck) typeVal = v.type.includes("Mini") ? "Mini-Truck" : "Large-Truck";
        if (v.icon === Car) typeVal = "Sedan / Car";

        setNewVehicle({
            name: v.type, // Using v.type as the display name
            type: typeVal,
            maxWeight: v.capacity,
            basePrice: v.basePrice,
            perKm: 15 // Mock default as perKm is not saved
        });
        setEditingVehicleId(v.id);
        setIsModalOpen(true);
    };

    const handleAddSubmit = () => {
        if (!newVehicle.name || !newVehicle.basePrice || !newVehicle.maxWeight || !newVehicle.perKm) {
            return alert("Please fill all required fields");
        }

        let icon = Bike;
        if (newVehicle.type.includes("Truck")) icon = Truck;
        if (newVehicle.type.includes("Car") || newVehicle.type.includes("Sedan")) icon = Car;

        if (editingVehicleId) {
            setVehicles(vehicles.map(v => v.id === editingVehicleId ? {
                ...v,
                type: newVehicle.name,
                capacity: newVehicle.maxWeight,
                basePrice: parseInt(newVehicle.basePrice),
                icon: icon
            } : v));
        } else {
            const v = {
                id: vehicles.length + Math.random(),
                type: newVehicle.name,
                capacity: newVehicle.maxWeight,
                basePrice: parseInt(newVehicle.basePrice),
                active: true,
                icon: icon,
                orders: 0,
                riders: 0
            };
            setVehicles([...vehicles, v]);
        }

        setIsModalOpen(false);
        setEditingVehicleId(null);
        setNewVehicle({ name: "", type: "Motorcycle", perKm: "", basePrice: "", maxWeight: "" });
    };

    const handleDeleteType = (id) => {
        if (window.confirm("Are you sure you want to remove this vehicle type?")) {
            setVehicles(vehicles.filter(v => v.id !== id));
        }
    };

    return (
        <>
            <div className="container-fluid fade-in">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                    <div>
                        <h2 className="fw-bold mb-1">Vehicle Management</h2>
                        <p className="text-muted small mb-0">Configure fleet types, capacities, and base pricing structures.</p>
                    </div>
                    <button
                        onClick={handleAddOpen}
                        className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm"
                        style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}
                    >
                        <Plus size={18} /> <span>Add New Type</span>
                    </button>
                </div>

                <div className="row g-4 mb-4">
                    {vehicles.map((v) => (
                        <div key={v.id} className="col-12 col-md-6 col-xl-3">
                            <div className={`dashboard-card h-100 border-0 shadow-sm transition-all ${v.active ? 'border-success' : 'opacity-75 grayscale'}`} style={{ borderBottom: v.active ? '4px solid #10B981' : '4px solid #64748B' }}>
                                <div className="d-flex justify-content-between mb-4">
                                    <div className={`p-3 rounded-3 ${v.active ? 'bg-primary-red bg-opacity-10 text-primary-red' : 'bg-light text-muted'}`}>
                                        <v.icon size={32} />
                                    </div>
                                    <div className="dropdown">
                                        <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown"><MoreVertical size={20} /></button>
                                        <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                                            <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small" onClick={() => handleEditOpen(v)}><Edit size={16} /> Edit Details</button></li>

                                            <li><hr className="dropdown-divider opacity-50" /></li>
                                            <li><button className="dropdown-item d-flex align-items-center gap-2 rounded-3 py-2 small text-danger" onClick={() => handleDeleteType(v.id)}><Trash2 size={16} /> Remove Type</button></li>
                                        </ul>
                                    </div>
                                </div>

                                <h4 className="fw-bold mb-1">{v.type}</h4>
                                <p className="text-muted small mb-3">Capacity: <span className="fw-bold text-dark">{v.capacity}</span></p>

                                <div className="d-flex gap-3 mb-4">
                                    <div className="flex-grow-1 p-2 bg-light rounded-3 text-center">
                                        <p className="mb-0 text-muted" style={{ fontSize: '10px' }}>Orders</p>
                                        <p className="mb-0 fw-bold small">{v.orders.toLocaleString()}</p>
                                    </div>
                                    <div className="flex-grow-1 p-2 bg-light rounded-3 text-center">
                                        <p className="mb-0 text-muted" style={{ fontSize: '10px' }}>Active Riders</p>
                                        <p className="mb-0 fw-bold small">{v.riders}</p>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center justify-content-between border-top pt-3 mt-auto">
                                    <div className="d-flex align-items-center gap-2">
                                        <span className="small text-muted">Base Price:</span>
                                        <span className="fw-bold small">₹{v.basePrice}</span>
                                    </div>
                                    <div className="form-check form-switch p-0">
                                        <input
                                            className="form-check-input ms-0"
                                            type="checkbox"
                                            checked={v.active}
                                            onChange={() => toggleVehicle(v.id)}
                                            style={{ width: '40px', height: '20px' }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Add New Placeholder Card */}
                    <div className="col-12 col-md-6 col-xl-3">
                        <div
                            onClick={handleAddOpen}
                            className="dashboard-card h-100 border-0 bg-light bg-opacity-50 border-2 border-dashed d-flex flex-column align-items-center justify-content-center p-5 text-center cursor-pointer transition-all hover-scale"
                            style={{ borderColor: '#E2E8F0' }}
                        >
                            <div className="p-3 bg-white rounded-circle shadow-sm mb-3">
                                <Plus size={32} className="text-muted" />
                            </div>
                            <h5 className="text-muted fw-bold mb-1">Add Fleet Type</h5>
                            <p className="text-muted small">Configure a new vehicle category for operations.</p>
                        </div>
                    </div>
                </div>


            </div>

            {/* Add New Vehicle Modal Overlay */}
            {isModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '500px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingVehicleId ? "Edit Vehicle Details" : "Add New Vehicle"}</h4>
                            <button className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center" onClick={() => setIsModalOpen(false)}>
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Vehicle Name</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Premium Sedan" value={newVehicle.name} onChange={(e) => setNewVehicle({ ...newVehicle, name: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Vehicle Type</label>
                                <select className="form-select bg-light border-0 py-2" value={newVehicle.type} onChange={(e) => setNewVehicle({ ...newVehicle, type: e.target.value })} style={{ borderRadius: '10px' }}>
                                    <option>Motorcycle</option>
                                    <option>Mini-Truck</option>
                                    <option>Large-Truck</option>
                                    <option>Sedan / Car</option>
                                </select>
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Max Weight Capacity</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. 50kg" value={newVehicle.maxWeight} onChange={(e) => setNewVehicle({ ...newVehicle, maxWeight: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Base Charge (₹)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 100" value={newVehicle.basePrice} onChange={(e) => setNewVehicle({ ...newVehicle, basePrice: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Price per Km (₹)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 15" value={newVehicle.perKm} onChange={(e) => setNewVehicle({ ...newVehicle, perKm: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Upload Vehicle Image</label>
                                <div className="p-4 border border-dashed rounded-3 text-center cursor-pointer hover-bg-light transition-all" style={{ borderColor: '#CBD5E1' }}>
                                    <Image size={32} className="text-muted mb-2 mx-auto d-block" />
                                    <p className="small text-muted mb-0">Click to browse or drag and drop image here</p>
                                </div>
                            </div>
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleAddSubmit}>{editingVehicleId ? "Save Changes" : "Save Vehicle"}</button>
                        </div>
                    </div>
                </div>
            )
            }
        </>
    );
};

export default Vehicles;

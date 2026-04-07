import { useState } from "react";
import {
    MapPin,
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Map,
    Truck,
    Building,
    Navigation,
    X
} from "lucide-react";

const ZoneSetup = () => {
    const [activeTab, setActiveTab] = useState("In-City");
    const [zones, setZones] = useState([
        { id: 1, name: "Hyderabad Central Core", type: "In-City", baseRegion: "Hyderabad", limitKm: 25, active: true },
        { id: 2, name: "Bangalore Suburbs Area", type: "In-City", baseRegion: "Bangalore", limitKm: 40, active: true },
        { id: 3, name: "Delhi NCR Bound", type: "In-City", baseRegion: "Delhi", limitKm: 45, active: false },
        { id: 4, name: "Southern Express Route", type: "City-to-City", baseRegion: "Hyderabad to Chennai", limitKm: 650, active: true },
        { id: 5, name: "Western Highway Transit", type: "City-to-City", baseRegion: "Mumbai to Pune", limitKm: 150, active: true }
    ]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingZoneId, setEditingZoneId] = useState(null);
    const [newZone, setNewZone] = useState({ name: "", type: "In-City", baseRegion: "", limitKm: "" });

    const filteredZones = zones.filter(z => z.type === activeTab);

    const handleAddOpen = () => {
        setEditingZoneId(null);
        setNewZone({ name: "", type: activeTab, baseRegion: "", limitKm: "" });
        setIsModalOpen(true);
    };

    const handleEditOpen = (zone) => {
        setEditingZoneId(zone.id);
        setNewZone({ name: zone.name, type: zone.type, baseRegion: zone.baseRegion, limitKm: zone.limitKm });
        setIsModalOpen(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to permanently delete this operation zone?")) {
            setZones(zones.filter(z => z.id !== id));
        }
    };

    const toggleActive = (id) => {
        setZones(zones.map(z => z.id === id ? { ...z, active: !z.active } : z));
    };

    const handleSubmit = () => {
        if (!newZone.name || !newZone.baseRegion || !newZone.limitKm) return alert("Please fill all fields");

        if (editingZoneId) {
            setZones(zones.map(z => z.id === editingZoneId ? {
                ...z,
                name: newZone.name,
                type: newZone.type,
                baseRegion: newZone.baseRegion,
                limitKm: parseFloat(newZone.limitKm)
            } : z));
        } else {
            setZones([...zones, {
                id: zones.length + 1,
                name: newZone.name,
                type: newZone.type,
                baseRegion: newZone.baseRegion,
                limitKm: parseFloat(newZone.limitKm),
                active: true
            }]);
        }
        setIsModalOpen(false);
        setEditingZoneId(null);
    };

    return (
        <div className="container-fluid fade-in position-relative">
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Operational Zones</h2>
                    <p className="text-muted small mb-0">Configure operating areas and operational radius bounds.</p>
                </div>
                <button onClick={handleAddOpen} className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                    <Plus size={18} /> <span>Create Zone</span>
                </button>
            </div>

            {/* Analytics Mini-Cards */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-6 col-lg-4">
                    <div className="dashboard-card border-0 shadow-sm p-4 d-flex align-items-center gap-4">
                        <div className="p-3 bg-light rounded-3 text-primary-red" style={{ color: '#E51818' }}>
                            <Building size={24} />
                        </div>
                        <div>
                            <p className="text-muted small fw-bold mb-1">Active In-City Zones</p>
                            <h4 className="fw-bold mb-0">{zones.filter(z => z.type === 'In-City' && z.active).length} Configured</h4>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                    <div className="dashboard-card border-0 shadow-sm p-4 d-flex align-items-center gap-4">
                        <div className="p-3 bg-light rounded-3 text-success">
                            <Truck size={24} />
                        </div>
                        <div>
                            <p className="text-muted small fw-bold mb-1">Outstation Networks</p>
                            <h4 className="fw-bold mb-0">{zones.filter(z => z.type === 'City-to-City' && z.active).length} Connected</h4>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-lg-4">
                    <div className="dashboard-card border-0 shadow-sm p-4 d-flex align-items-center gap-4">
                        <div className="p-3 bg-light rounded-3 text-warning">
                            <Map size={24} />
                        </div>
                        <div>
                            <p className="text-muted small fw-bold mb-1">Coverage Radius (Avg)</p>
                            <h4 className="fw-bold mb-0">~{Math.round(zones.reduce((acc, curr) => acc + curr.limitKm, 0) / zones.length || 0)} KM</h4>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="d-flex gap-4 border-bottom mb-4">
                <button
                    className={`btn pb-3 px-0 border-0 ${activeTab === 'In-City' ? 'fw-bold border-bottom border-2 border-danger text-danger' : 'text-muted'}`}
                    onClick={() => setActiveTab('In-City')}
                    style={{ borderRadius: 0, boxShadow: 'none' }}
                >
                    <Building size={18} className="me-2 d-none d-sm-inline" />
                    Hyperlocal (In-City)
                </button>
                <button
                    className={`btn pb-3 px-0 border-0 ${activeTab === 'City-to-City' ? 'fw-bold border-bottom border-2 border-danger text-danger' : 'text-muted'}`}
                    onClick={() => setActiveTab('City-to-City')}
                    style={{ borderRadius: 0, boxShadow: 'none' }}
                >
                    <Navigation size={18} className="me-2 d-none d-sm-inline" />
                    Out-of-Station (City-to-City)
                </button>
            </div>

            {/* Zones List Grid */}
            <div className="row g-4 mb-5">
                {filteredZones.map((zone) => (
                    <div key={zone.id} className="col-12 col-md-6 col-xl-4">
                        <div className={`dashboard-card h-100 border-0 shadow-sm transition-all ${!zone.active ? 'opacity-75 grayscale' : 'hover-bg-light'}`}>
                            <div className="d-flex justify-content-between mb-3 align-items-start">
                                <div>
                                    <h5 className="fw-bold mb-1">{zone.name}</h5>
                                    <span className={`badge ${zone.active ? 'bg-success' : 'bg-secondary'} rounded-pill`} style={{ fontSize: '10px' }}>
                                        {zone.active ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                                <div className="dropdown">
                                    <button className="btn btn-link p-0 text-muted" data-bs-toggle="dropdown"><MoreVertical size={20} /></button>
                                    <ul className="dropdown-menu dropdown-menu-end border-0 shadow-lg p-2" style={{ borderRadius: '12px' }}>
                                        <li><button className="dropdown-item d-flex align-items-center gap-2 py-2 small" onClick={() => handleEditOpen(zone)}><Edit size={16} /> Edit Limits</button></li>
                                        <li><button className="dropdown-item d-flex align-items-center gap-2 py-2 small" onClick={() => toggleActive(zone.id)}><Map size={16} /> Mark {zone.active ? 'Inactive' : 'Active'}</button></li>
                                        <li><hr className="dropdown-divider opacity-50" /></li>
                                        <li><button className="dropdown-item d-flex align-items-center gap-2 py-2 small text-danger" onClick={() => handleDelete(zone.id)}><Trash2 size={16} /> Delete Zone</button></li>
                                    </ul>
                                </div>
                            </div>

                            <div className="d-flex flex-column gap-3 mt-4">
                                <div className="p-3 bg-light rounded-3">
                                    <p className="text-muted small fw-bold mb-1 text-uppercase" style={{ fontSize: '10px' }}>Base Location Hub</p>
                                    <p className="fw-bold mb-0 d-flex align-items-center gap-2"><MapPin size={16} className="text-primary-red" /> {zone.baseRegion}</p>
                                </div>

                                <div className="p-3 bg-light rounded-3">
                                    <p className="text-muted small fw-bold mb-1 text-uppercase" style={{ fontSize: '10px' }}>Service Radius / Limit</p>
                                    <p className="fw-bold mb-0 text-dark fs-5">{zone.limitKm} <span className="fs-6 text-muted fw-normal">KM</span></p>
                                </div>
                            </div>

                            <div className="mt-4 pt-3 border-top">
                                <small className="text-muted">Type: {zone.type} Network</small>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredZones.length === 0 && (
                    <div className="col-12 py-5 text-center text-muted">
                        <Map size={48} className="mb-3 opacity-25 mx-auto" />
                        <p className="fw-bold">No operation zones found for {activeTab}</p>
                        <p className="small">Create a new boundary setup to start accepting orders locally or globally.</p>
                    </div>
                )}
            </div>

            {/* Modal Overlay */}
            {isModalOpen && (
                <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 1050, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
                    <div className="bg-white rounded-4 p-4 shadow-lg fade-in" style={{ width: '100%', maxWidth: '450px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h4 className="fw-bold mb-0">{editingZoneId ? "Edit Operational Zone" : "Configure New Zone"}</h4>
                            <button className="btn btn-light p-2 rounded-circle border-0 d-flex justify-content-center align-items-center" onClick={() => setIsModalOpen(false)}>
                                <X size={20} className="text-muted" />
                            </button>
                        </div>

                        <div className="row g-3">
                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Zone Type</label>
                                <select className="form-select bg-light border-0 py-2 fw-bold" value={newZone.type} onChange={(e) => setNewZone({ ...newZone, type: e.target.value })} style={{ borderRadius: '10px' }}>
                                    <option value="In-City">Hyperlocal (In-City)</option>
                                    <option value="City-to-City">Out-of-Station (City-to-City)</option>
                                </select>
                            </div>

                            <div className="col-12">
                                <label className="form-label small text-muted fw-bold">Zone Name/Identifier</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Hyderabad Outer Ring Road" value={newZone.name} onChange={(e) => setNewZone({ ...newZone, name: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Base Region/City</label>
                                <input type="text" className="form-control bg-light border-0 py-2" placeholder="e.g. Mumbai" value={newZone.baseRegion} onChange={(e) => setNewZone({ ...newZone, baseRegion: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="col-12 col-md-6">
                                <label className="form-label small text-muted fw-bold">Allowed Radius (KM)</label>
                                <input type="number" className="form-control bg-light border-0 py-2" placeholder="e.g. 50" value={newZone.limitKm} onChange={(e) => setNewZone({ ...newZone, limitKm: e.target.value })} style={{ borderRadius: '10px' }} />
                            </div>
                        </div>

                        <div className="bg-light p-3 mt-4 rounded-3 text-center border dashed-border text-muted small">
                            Orders exceeding the {newZone.limitKm || "specified"} KM limit in {newZone.baseRegion || "this"} area will be automatically blocked in the system.
                        </div>

                        <div className="d-flex gap-3 mt-4">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3" onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="btn btn-primary-red flex-grow-1 py-3 fw-bold text-white shadow-sm rounded-3" style={{ backgroundColor: '#E51818' }} onClick={handleSubmit}>{editingZoneId ? "Update Zone" : "Save Zone"}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ZoneSetup;

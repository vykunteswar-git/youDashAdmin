import { useState, useEffect } from "react";
import {
    Map as MapIcon,
    Search,
    Bike,
    Package,
    Navigation,
    ArrowRight,
    MoreVertical,
    Crosshair,
    Clock,
    Layers,
    MapPin,
    Plus
} from "lucide-react";

const LiveTracking = () => {
    const [activeTab, setActiveTab] = useState("Riders");
    const [search, setSearch] = useState("");

    const activeRiders = [
        { id: "RDR001", name: "Rahul Kumar", status: "On Trip", orderId: "#RD4522", city: "Hyderabad", pos: { x: 45, y: 35 } },
        { id: "RDR002", name: "Ajay Singh", status: "Heading to Pickup", orderId: "#RD4521", city: "Chennai", pos: { x: 60, y: 70 } },
        { id: "RDR003", name: "Suresh Rao", status: "Idle", orderId: "N/A", city: "Bangalore", pos: { x: 30, y: 80 } },
        { id: "RDR004", name: "Manish Verma", status: "On Trip", orderId: "#RD4525", city: "Delhi", pos: { x: 80, y: 20 } },
    ];

    return (
        <div className="container-fluid fade-in h-100 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Live Fleet Tracking</h2>
                    <p className="text-muted small mb-0">Real-time visualization of riders and parcel movements.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-white header-shadow px-3 py-2 d-flex align-items-center gap-2">
                        <Layers size={16} /> <span>Traffic Layer</span>
                    </button>
                    <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                        <Crosshair size={18} /> <span>Center Map</span>
                    </button>
                </div>
            </div>

            <div className="row g-4 flex-grow-1 overflow-hidden">
                {/* Left Control Panel */}
                <div className="col-12 col-xl-3 h-100 overflow-auto custom-scrollbar">
                    <div className="dashboard-card p-0 border-0 shadow-sm h-100 d-flex flex-column">
                        {/* Tabs */}
                        <div className="d-flex border-bottom">
                            {["Riders", "Orders"].map(tab => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`btn flex-grow-1 py-3 small fw-bold border-0 transition-all rounded-0 ${activeTab === tab ? 'border-bottom border-primary-red border-3 text-primary-red' : 'text-muted'}`}
                                    style={{ borderBottom: activeTab === tab ? '3px solid #E51818' : '' }}
                                >
                                    {tab}
                                </button>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="p-3">
                            <div className="search-container">
                                <Search size={16} className="text-muted" />
                                <input
                                    type="text"
                                    placeholder={`Search active ${activeTab.toLowerCase()}...`}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="form-control bg-light border-0 ps-5 py-2 small"
                                    style={{ borderRadius: '8px' }}
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-grow-1 overflow-auto custom-scrollbar p-1">
                            {activeRiders.map(rider => (
                                <div key={rider.id} className="p-3 border-bottom hover-bg-light transition-all cursor-pointer rounded-3 m-2 border">
                                    <div className="d-flex justify-content-between align-items-center mb-1">
                                        <span className="fw-bold small">{rider.name}</span>
                                        <span className="text-muted small" style={{ fontSize: '10px' }}>{rider.id}</span>
                                    </div>
                                    <div className="d-flex align-items-center gap-1 mb-2">
                                        <div className={`p-1 rounded-circle bg-${rider.status === 'Idle' ? 'secondary' : 'success'}`} style={{ width: '6px', height: '6px', backgroundColor: rider.status === 'Idle' ? '#64748B' : '#10B981' }}></div>
                                        <span className="text-muted" style={{ fontSize: '10px' }}>{rider.status}</span>
                                    </div>
                                    {rider.status !== 'Idle' && (
                                        <div className="p-2 bg-light rounded-3 d-flex justify-content-between align-items-center">
                                            <div className="d-flex align-items-center gap-2 text-primary-red" style={{ color: '#E51818' }}>
                                                <Package size={12} />
                                                <span className="fw-bold" style={{ fontSize: '10px' }}>{rider.orderId}</span>
                                            </div>
                                            <button className="btn btn-link p-0 text-muted"><ArrowRight size={14} /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Map Visualization (Mock) */}
                <div className="col-12 col-xl-9 h-100">
                    <div className="dashboard-card p-0 border-0 shadow-sm h-100 overflow-hidden position-relative bg-light">
                        {/* Real Map Image Background for Demo */}
                        <div
                            className="w-100 h-100 position-absolute"
                            style={{
                                backgroundImage: "url('https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1600&h=1200')", // Premium Static Map Illustration
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                opacity: 0.6,
                                filter: 'grayscale(100%) contrast(1.1) brightness(1.2)'
                            }}
                        />

                        {/* Fallback pattern if image fails or needs more detail */}
                        <svg className="w-100 h-100 position-absolute" style={{ top: 0, left: 0, opacity: 0.15 }}>
                            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#64748B" strokeWidth="0.5" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#grid)" />
                        </svg>

                        {/* Floating Rider Markers */}
                        {activeRiders.map(rider => (
                            <div
                                key={rider.id}
                                className="position-absolute transition-all cursor-pointer"
                                style={{
                                    left: `${rider.pos.x}%`,
                                    top: `${rider.pos.y}%`,
                                    transform: 'translate(-50%, -100%)'
                                }}
                            >
                                {/* Tooltip */}
                                <div className="bg-white px-2 py-1 rounded shadow-lg border text-nowrap mb-2 scale-hover" style={{ fontSize: '10px' }}>
                                    <strong>{rider.name}</strong> - {rider.status}
                                </div>
                                {/* Marker */}
                                <div className="p-2 rounded-circle bg-white shadow-lg d-flex align-items-center justify-content-center text-primary-red" style={{ backgroundColor: '#FFFFFF', color: '#E51818', border: '2px solid #E51818' }}>
                                    {rider.status === 'Idle' ? <Bike size={18} /> : <Package size={18} />}
                                </div>
                            </div>
                        ))}

                        {/* Order Clusters (Static mockup markers) */}
                        <div className="position-absolute" style={{ left: '15%', top: '25%' }}>
                            <div className="p-1 px-2 rounded-pill bg-primary-red text-white shadow-sm fw-bold" style={{ fontSize: '10px', backgroundColor: '#E51818' }}>14 Orders</div>
                            <div className="bg-primary-red opacity-10 rounded-circle" style={{ width: '80px', height: '80px', transform: 'translate(-30px, -20px)', backgroundColor: '#E51818' }}></div>
                        </div>

                        {/* Map Controls */}
                        <div className="position-absolute bottom-0 end-0 m-4 d-flex flex-column gap-2 text-dark">
                            <button className="btn btn-white shadow rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}><Plus size={20} /></button>
                            <button className="btn btn-white shadow rounded-circle p-3 d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px' }}><Search size={20} /></button>
                        </div>

                        {/* Bottom Legend Overlay */}
                        <div className="position-absolute bottom-0 start-0 m-4 p-3 bg-white bg-opacity-90 backdrop-blur rounded-3 shadow-sm border d-none d-md-flex gap-4 small" style={{ backdropFilter: 'blur(8px)' }}>
                            <div className="d-flex align-items-center gap-2">
                                <div className="p-1 bg-success rounded-circle"></div> <span>On Trip</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="p-1 bg-warning rounded-circle"></div> <span>Heading to Pickup</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                                <div className="p-1 bg-secondary rounded-circle"></div> <span>Idle</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LiveTracking;

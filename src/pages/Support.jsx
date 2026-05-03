/* Route commented out in src/routes/AppRoutes.jsx — re-enable when support/ticket admin API is ready. */

import { useState } from "react";
import {
    LifeBuoy,
    Search,
    MessageCircle,
    Phone,
    Clock,
    Filter,
    CheckCircle2,
    MessageSquare,
    Send,
    MoreVertical,
    User,
    Star,
    ArrowRight
} from "lucide-react";

/* TODO(Backend): No /admin/... support or ticket endpoints on deployed OpenAPI; tickets are mock. Wire when matching admin APIs exist. */

const Support = () => {
    const [activeTicket, setActiveTicket] = useState(null);
    const [search, setSearch] = useState("");

    const tickets = [
        { id: "TKT-4521", user: "Gowtham Akhil", subject: "Parcel Delay Hyderabad", status: "Critical", time: "12 mins ago", msg: "Where is my parcel? It shows out for delivery since 8 AM." },
        { id: "TKT-4522", user: "Jane Smith", subject: "Wrong Payment Collected", status: "Medium", time: "45 mins ago", msg: "Rider collected 50 extra for shipping" },
        { id: "TKT-4523", user: "Rahul (Rider)", subject: "Bike Breakdown on Trip", status: "High", time: "1 hour ago", msg: "Bike tire punctured near main road." },
        { id: "TKT-4524", user: "Mike Johnson", subject: "Refund for Cancelled Order", status: "Low", time: "3 hours ago", msg: "Order not fulfilled but amount deducted" },
    ];

    return (
        <div className="container-fluid fade-in h-100 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Support Resolution Center</h2>
                    <p className="text-muted small mb-0">Manage customer tickets, rider emergencies, and manual resolutions.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 small" style={{ borderRadius: '10px' }}>
                        <Star size={18} /> <span>Client feedback</span>
                    </button>
                    <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                        <LifeBuoy size={18} /> <span>Internal Support Log</span>
                    </button>
                </div>
            </div>

            <div className="row g-4 flex-grow-1 overflow-hidden">
                {/* Ticket List */}
                <div className="col-12 col-xl-4 h-100 overflow-auto custom-scrollbar">
                    <div className="dashboard-card p-0 border-0 shadow-sm h-100 d-flex flex-column">
                        <div className="p-3 border-bottom">
                            <div className="search-container">
                                <Search size={16} className="text-muted" />
                                <input type="text" placeholder="Search by ticket ID or name..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-control bg-light border-0 ps-5 py-2 small" style={{ borderRadius: '10px' }} />
                            </div>
                        </div>
                        <div className="flex-grow-1 overflow-auto custom-scrollbar">
                            {tickets.map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => setActiveTicket(t)}
                                    className={`p-3 border-bottom cursor-pointer transition-all hover-bg-light ${activeTicket?.id === t.id ? 'bg-primary-red bg-opacity-5 border-start border-primary-red border-3' : ''}`}
                                    style={{ borderLeft: activeTicket?.id === t.id ? '3px solid #E51818' : '' }}
                                >
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <span className="fw-bold small">{t.id}</span>
                                        <span className={`status-badge status-${t.status.toLowerCase() === 'critical' ? 'cancelled' : t.status.toLowerCase() === 'high' ? 'pending' : 'info'} p-1 px-3`} style={{ fontSize: '10px' }}>{t.status}</span>
                                    </div>
                                    <h6 className="fw-bold mb-1 small">{t.subject}</h6>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small className="text-muted" style={{ fontSize: '10px' }}>{t.user} • {t.time}</small>
                                        <ArrowRight size={14} className="text-muted opacity-50" />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-light py-3 small fw-bold border-top">View Resolved Tickets</button>
                    </div>
                </div>

                {/* Resolution Panel */}
                <div className="col-12 col-xl-8 h-100">
                    {activeTicket ? (
                        <div className="dashboard-card p-0 border-0 shadow-sm h-100 d-flex flex-column bg-white">
                            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="p-2 bg-light rounded-circle"><User size={20} className="text-primary-red" /></div>
                                    <div>
                                        <h6 className="mb-0 fw-bold">{activeTicket.user}</h6>
                                        <small className="text-muted" style={{ fontSize: '10px' }}>{activeTicket.id} • Customer Profile Linked</small>
                                    </div>
                                </div>
                                <div className="d-flex gap-2">
                                    <button className="btn btn-outline-info p-2 rounded-3 border-0 small d-flex align-items-center gap-2"><Phone size={16} /> Call now</button>
                                    <button className="btn btn-outline-success p-2 rounded-3 border-0 small d-flex align-items-center gap-2"><CheckCircle2 size={16} /> Close Ticket</button>
                                    <button className="btn btn-link p-0 text-muted"><MoreVertical size={20} /></button>
                                </div>
                            </div>

                            {/* Chat content mockup */}
                            <div className="flex-grow-1 p-4 bg-light overflow-auto custom-scrollbar d-flex flex-column gap-3">
                                <div className="d-flex gap-3 max-w-75">
                                    <div className="p-3 bg-white shadow-sm rounded-3 rounded-bottom-start rounded-0 position-relative">
                                        {activeTicket.msg}
                                        <small className="position-absolute bottom-0 end-0 m-1 me-2 text-muted" style={{ fontSize: '8px' }}>10:14 AM</small>
                                    </div>
                                </div>
                                <div className="d-flex gap-3 align-self-end text-end max-w-75">
                                    <div className="p-3 bg-primary-red text-white shadow-sm rounded-3 rounded-bottom-end rounded-0 position-relative" style={{ backgroundColor: '#E51818' }}>
                                        I am looking into this, Gowtham. Give me 2 mins to track the rider's live position.
                                        <small className="position-absolute bottom-0 start-0 m-1 ms-2 text-white opacity-50" style={{ fontSize: '8px' }}>10:16 AM</small>
                                    </div>
                                </div>
                            </div>

                            <div className="p-3 border-top d-flex gap-3 align-items-center">
                                <div className="p-2 bg-light rounded-3 text-muted cursor-pointer"><Settings size={20} /></div>
                                <div className="flex-grow-1 position-relative">
                                    <input type="text" className="form-control bg-light border-0 py-3 pe-5 fs-6" placeholder="Type resolution or message..." style={{ borderRadius: '12px' }} />
                                    <button className="btn btn-primary-red position-absolute top-50 end-0 translate-middle-y me-2 p-2 rounded-3" style={{ backgroundColor: '#E51818', color: 'white' }}>
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="dashboard-card border-0 shadow-sm h-100 d-flex flex-column align-items-center justify-content-center text-center p-5 opacity-50">
                            <div className="p-4 bg-light rounded-circle mb-4"><MessageSquare size={64} className="text-muted" /></div>
                            <h4 className="fw-bold">No Ticket Selected</h4>
                            <p className="text-muted small">Select a ticket from the left panel to begin resolution.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Support;

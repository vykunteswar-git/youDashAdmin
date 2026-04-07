import { useState } from "react";
import {
    Bell,
    Send,
    Users,
    Bike,
    Settings,
    Plus,
    Image,
    MoreVertical,
    Search,
    ChevronRight,
    Clock,
    UserPlus
} from "lucide-react";

const Notifications = () => {
    const [target, setTarget] = useState("All Users");
    const [message, setMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    const handleSend = () => {
        if (!message) return alert("Please enter a message!");
        setIsSending(true);
        setTimeout(() => {
            setIsSending(false);
            setMessage("");
            alert(`Notification sent to ${target}!`);
        }, 1500);
    };

    const history = [
        { title: "Diwali Offer 🎉", target: "All Users", sent: "Oct 20, 2024", type: "Promotional", status: "Sent" },
        { title: "Rider Payout Delayed ⚠️", target: "All Riders", sent: "Oct 21, 2024", type: "Operational", status: "Sent" },
        { title: "Update App Version 3.4.1", target: "All Users", sent: "Oct 22, 2024", type: "System", status: "Scheduled" },
        { title: "City Shutdown Notice", target: "Hyderabad Riders", sent: "Oct 23, 2024", type: "Critical", status: "Draft" },
    ];

    return (
        <div className="container-fluid fade-in">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Push Notifications</h2>
                    <p className="text-muted small mb-0">Compose and broadcast messages to users, riders, or select segments.</p>
                </div>
                <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                    <UserPlus size={18} /> <span>Audience Segments</span>
                </button>
            </div>

            <div className="row g-4">
                {/* Compose Module */}
                <div className="col-12 col-xl-5">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <h5 className="fw-bold mb-4 d-flex align-items-center gap-2">
                            <Plus size={20} className="text-primary-red" /> Compose Broadcast
                        </h5>
                        <div className="d-flex flex-column gap-3 mb-4">
                            <div>
                                <label className="form-label small text-muted fw-bold">Target Audience</label>
                                <div className="d-flex gap-2 flex-wrap">
                                    {["All Users", "All Riders", "By City", "Specific ID"].map(opt => (
                                        <button
                                            key={opt}
                                            onClick={() => setTarget(opt)}
                                            className={`btn p-1 px-3 rounded-pill small fw-bold border transition-all ${target === opt ? 'bg-primary-red text-white' : 'bg-light text-muted'}`}
                                            style={{ minWidth: '100px', backgroundColor: target === opt ? '#E51818' : '' }}
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-2">
                                <label className="form-label small text-muted fw-bold">Notification Title</label>
                                <input type="text" className="form-control bg-light border-0 py-2 fs-6" placeholder="e.g. Free Delivery Alert!" style={{ borderRadius: '10px' }} />
                            </div>

                            <div className="mt-2">
                                <label className="form-label small text-muted fw-bold">Message Content</label>
                                <textarea
                                    className="form-control bg-light border-0 p-3 fs-6"
                                    rows="4"
                                    placeholder="Write your broadcast message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    style={{ borderRadius: '12px' }}
                                ></textarea>
                                <div className="text-end mt-1 small text-muted opacity-75">{message.length} / 120 chars</div>
                            </div>

                            <div className="p-3 border rounded-3 d-flex align-items-center justify-content-between mb-4">
                                <div className="d-flex align-items-center gap-2 small text-muted">
                                    <Image size={16} /> <span>Attach Banner Image (Optional)</span>
                                </div>
                                <button className="btn btn-link p-0 text-primary-red fw-bold small" style={{ color: '#E51818' }}>Upload</button>
                            </div>
                        </div>

                        <div className="d-flex gap-2">
                            <button className="btn btn-light flex-grow-1 py-3 fw-bold rounded-3 shadow-sm">Save Draft</button>
                            <button
                                onClick={handleSend}
                                disabled={isSending}
                                className="btn btn-primary-red flex-grow-1 py-3 fw-bold rounded-3 shadow-sm d-flex align-items-center justify-content-center gap-2"
                                style={{ backgroundColor: '#E51818', color: 'white' }}
                            >
                                {isSending ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Module */}
                <div className="col-12 col-xl-7 h-100">
                    <div className="dashboard-card border-0 shadow-sm h-100 p-0 overflow-hidden d-flex flex-column">
                        <div className="p-4 border-bottom d-flex justify-content-between align-items-center">
                            <h5 className="fw-bold mb-0">Notification History</h5>
                            <div className="search-container">
                                <Search size={16} className="text-muted" />
                                <input type="text" placeholder="Search logs..." className="form-control bg-light border-0 ps-5 py-2 small" style={{ borderRadius: '8px' }} />
                            </div>
                        </div>
                        <div className="flex-grow-1 overflow-auto custom-scrollbar">
                            <div className="table-responsive">
                                <table className="table mb-0 table-hover">
                                    <thead className="bg-light">
                                        <tr>
                                            <th className="px-4 py-3 text-muted small border-0">TITLE</th>
                                            <th className="px-3 py-3 text-muted small border-0">TARGET</th>
                                            <th className="px-3 py-3 text-muted small border-0">TYPE</th>
                                            <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                                            <th className="px-4 py-3 text-muted small border-0 text-end">DATE</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((h, i) => (
                                            <tr key={i} className="align-middle">
                                                <td className="px-4 py-3 border-0 small fw-bold">{h.title}</td>
                                                <td className="px-3 py-3 border-0 small text-muted">{h.target}</td>
                                                <td className="px-3 py-3 border-0 small">
                                                    <span className="p-1 px-2 bg-light border rounded small" style={{ fontSize: '10px' }}>{h.type}</span>
                                                </td>
                                                <td className="px-3 py-3 border-0">
                                                    <span className={`status-badge status-${h.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '11px' }}>{h.status}</span>
                                                </td>
                                                <td className="px-4 py-3 border-0 text-end small text-muted">{h.sent}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <button className="btn btn-light w-100 py-3 small fw-bold border-top">View All Notification Logs</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Notifications;

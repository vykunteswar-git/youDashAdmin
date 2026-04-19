import { useState } from "react";
import {
    ShieldCheck,
    Search,
    Download,
    User,
    Settings,
    Ticket,
    Bike,
    Package,
    ChevronDown,
    AlertOctagon,
    CreditCard
} from "lucide-react";

/* TODO(Backend): No /admin/... audit-log endpoints on deployed OpenAPI; log rows are mock. Wire when matching admin APIs exist. */


const actionTypeConfig = {
    "Order Override": { icon: Package, color: "#E51818", bg: "#fef2f2" },
    "Rider Suspended": { icon: Bike, color: "#F59E0B", bg: "#fffbeb" },
    "Coupon Created": { icon: Ticket, color: "#8B5CF6", bg: "#F5F3FF" },
    "Config Changed": { icon: Settings, color: "#3B82F6", bg: "#EFF6FF" },
    "Payment Override": { icon: CreditCard, color: "#10B981", bg: "#ECFDF5" },
    "Rider Verified": { icon: ShieldCheck, color: "#10B981", bg: "#ECFDF5" },
    "Category Deleted": { icon: AlertOctagon, color: "#EF4444", bg: "#FEE2E2" },
    "User Banned": { icon: User, color: "#6B7280", bg: "#F3F4F6" },
};

const AuditLogs = () => {
    const [search, setSearch] = useState("");
    const [filterType, setFilterType] = useState("All");

    const logs = [
        { id: "AUD-001", actor: "Admin User", action: "Order Override", target: "ORD004", detail: "Force closed with status 'Cancelled'. Reason: Rider MIA.", time: "Today, 5:12 PM" },
        { id: "AUD-002", actor: "Admin User", action: "Rider Suspended", target: "RDR002 — Ajay Singh", detail: "24hr suspension triggered. Reason: Complaint abuse.", time: "Today, 4:55 PM" },
        { id: "AUD-003", actor: "Admin User", action: "Config Changed", target: "Settings — Killswitch", detail: "Booking globally paused. Reason: Server maintenance window.", time: "Today, 3:30 PM" },
        { id: "AUD-004", actor: "Admin User", action: "Coupon Created", target: "SUMMER50 Campaign", detail: "Flat ₹50 discount. Usage limit: 1000. Zone: Global.", time: "Today, 2:18 PM" },
        { id: "AUD-005", actor: "Admin User", action: "Payment Override", target: "ORD002 — Jane Smith", detail: "Price manually adjusted from ₹1200 to ₹850.", time: "Today, 1:44 PM" },
        { id: "AUD-006", actor: "Admin User", action: "Rider Verified", target: "RDR004 — Vikas Patil", detail: "KYC documents manually approved by admin.", time: "Today, 11:10 AM" },
        { id: "AUD-007", actor: "Admin User", action: "Category Deleted", target: "Suitcase / Luggage", detail: "Category and all content links permanently removed.", time: "Yesterday, 6:45 PM" },
        { id: "AUD-008", actor: "Admin User", action: "User Banned", target: "USR-00181 — Unknown", detail: "User account disabled on fraud detection.", time: "Yesterday, 4:22 PM" },
    ];

    const allTypes = ["All", ...Object.keys(actionTypeConfig)];

    const filteredLogs = logs.filter(log =>
        (log.actor + log.action + log.target + log.detail).toLowerCase().includes(search.toLowerCase()) &&
        (filterType === "All" || log.action === filterType)
    );

    return (
        <div className="container-fluid fade-in position-relative">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Security Audit Ledger</h2>
                    <p className="text-muted small mb-0">Tamper-proof log of all administrative actions across the system.</p>
                </div>
                <button className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 py-2 bg-white shadow-sm" style={{ borderRadius: '10px' }} onClick={() => alert("Exporting compliance report...")}>
                    <Download size={18} /> <span className="fw-bold small">Export Report</span>
                </button>
            </div>

            {/* Filters */}
            <div className="dashboard-card border-0 shadow-sm mb-4 d-flex flex-column flex-md-row gap-3 p-3">
                <div className="search-container flex-grow-1">
                    <Search size={18} className="text-muted" />
                    <input type="text" placeholder="Search actor, action, target..." value={search} onChange={(e) => setSearch(e.target.value)} className="form-control bg-light border-0 ps-5 py-2" style={{ borderRadius: '10px' }} />
                </div>
                <div className="dropdown">
                    <button className="btn btn-light fw-bold d-flex align-items-center gap-2 py-2 px-4 border-0" data-bs-toggle="dropdown" style={{ borderRadius: '10px' }}>
                        <ShieldCheck size={16} className="text-muted" /> {filterType} <ChevronDown size={14} />
                    </button>
                    <ul className="dropdown-menu border-0 shadow-sm mt-1 p-2" style={{ borderRadius: '12px', minWidth: '220px' }}>
                        {allTypes.map(t => (
                            <li key={t}>
                                <button className={`dropdown-item py-2 small rounded-3 fw-bold ${filterType === t ? 'text-danger' : 'text-muted'}`} onClick={() => setFilterType(t)}>
                                    {t}
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="dashboard-card border-0 shadow-sm p-0 overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small text-muted border-0">LOG ID</th>
                                <th className="px-3 py-3 small text-muted border-0">ACTOR</th>
                                <th className="px-3 py-3 small text-muted border-0">ACTION TYPE</th>
                                <th className="px-3 py-3 small text-muted border-0">TARGET / DETAIL</th>
                                <th className="px-4 py-3 small text-muted border-0 text-end">TIMESTAMP</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => {
                                const config = actionTypeConfig[log.action] || { icon: Settings, color: "#6B7280", bg: "#F3F4F6" };
                                const Icon = config.icon;
                                return (
                                    <tr key={log.id} className="align-middle border-bottom border-light">
                                        <td className="px-4 py-3 border-0">
                                            <span className="fw-bold small text-muted">{log.id}</span>
                                        </td>
                                        <td className="px-3 py-3 border-0">
                                            <div className="d-flex align-items-center gap-2">
                                                <div className="rounded-circle bg-danger bg-opacity-10 d-flex align-items-center justify-content-center" style={{ width: '30px', height: '30px' }}>
                                                    <User size={14} className="text-danger" />
                                                </div>
                                                <span className="small fw-bold">{log.actor}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-3 border-0">
                                            <span className="d-flex align-items-center gap-2 fw-bold small p-1 px-3 rounded-3" style={{ backgroundColor: config.bg, color: config.color, width: 'fit-content' }}>
                                                <Icon size={13} /> {log.action}
                                            </span>
                                        </td>
                                        <td className="px-3 py-3 border-0" style={{ maxWidth: '320px' }}>
                                            <p className="fw-bold small mb-0">{log.target}</p>
                                            <small className="text-muted" style={{ fontSize: '10px' }}>{log.detail}</small>
                                        </td>
                                        <td className="px-4 py-3 border-0 text-end">
                                            <span className="small text-muted">{log.time}</span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-3 border-top d-flex justify-content-between align-items-center">
                    <span className="small text-muted">Showing {filteredLogs.length} of {logs.length} records</span>
                    <button className="btn btn-link small fw-bold p-0 text-danger">Load Older Logs →</button>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;

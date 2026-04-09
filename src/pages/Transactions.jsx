import { useState } from "react";
import {
    DollarSign,
    Search,
    MoreVertical,
    History,
    TrendingUp,
    ArrowDownToLine,
    ArrowUpRight,
    ArrowDownRight,
    Filter,
    ChevronRight,
    CreditCard,
    Wallet,
    Briefcase
} from "lucide-react";

const Transactions = () => {
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState("All");

    const transactions = [
        { id: "TXN10245", user: "Gowtham Akhil", type: "Recharge", status: "Successful", amount: 1500, time: "Oct 20, 2024", method: "UPI" },
        { id: "TXN10246", rider: "Rahul Kumar", type: "Payout", status: "Successful", amount: 4500, time: "Oct 21, 2024", method: "Bank Transfer" },
        { id: "TXN10247", user: "Jane Smith", type: "Order Pay", status: "Pending", amount: 1200, time: "Oct 22, 2024", method: "Card" },
        { id: "TXN10248", user: "Mike Johnson", type: "Refund", status: "Failed", amount: 850, time: "Oct 23, 2024", method: "Wallet" },
        { id: "TXN10249", rider: "Suresh Rao", type: "Payout", status: "Successful", amount: 3200, time: "Oct 24, 2024", method: "Bank Transfer" },
    ];

    return (
        <div className="container-fluid fade-in">
            {/* Header Section */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Financial Transactions</h2>
                    <p className="text-muted small mb-0">Record of all user payments, rider payouts, and system settlements.</p>
                </div>
                <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary d-flex align-items-center gap-2 px-3 py-2 small" style={{ borderRadius: '10px' }}>
                        <ArrowDownToLine size={18} /> <span>Download Report</span>
                    </button>
                    <button className="btn btn-primary-red d-flex align-items-center gap-2 px-4 shadow-sm" style={{ backgroundColor: '#E51818', color: 'white', borderRadius: '10px' }}>
                        <Briefcase size={18} /> <span>Create Payout</span>
                    </button>
                </div>
            </div>

            {/* KPI Stats Grid */}
            <div className="row g-4 mb-4">
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10 h-100">
                        <div className="d-flex justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-success bg-opacity-10 p-2 rounded-3 text-success">
                                    <TrendingUp size={20} />
                                </div>
                                <span className="small text-muted fw-bold">Total Volume</span>
                            </div>
                            <div className="d-flex align-items-center gap-1 small text-success fw-bold">
                                <ArrowUpRight size={14} /> <span>+14.2%</span>
                            </div>
                        </div>
                        <h4 className="fw-bold mb-0">₹1,24,560</h4>
                        <small className="text-muted" style={{ fontSize: '10px' }}>Total settlement volume this month</small>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10 h-100">
                        <div className="d-flex justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-primary-red bg-opacity-10 p-2 rounded-3 text-primary-red" style={{ color: '#E51818' }}>
                                    <DollarSign size={20} />
                                </div>
                                <span className="small text-muted fw-bold">Active Payouts</span>
                            </div>
                        </div>
                        <h4 className="fw-bold mb-0">₹42,850</h4>
                        <small className="text-muted" style={{ fontSize: '10px' }}>Rider payouts pending processing</small>
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="dashboard-card border-0 bg-white shadow-sm border border-secondary border-opacity-10 h-100">
                        <div className="d-flex justify-content-between mb-2">
                            <div className="d-flex align-items-center gap-2">
                                <div className="bg-info bg-opacity-10 p-2 rounded-3 text-info">
                                    <CreditCard size={20} />
                                </div>
                                <span className="small text-muted fw-bold">Payment Gateway</span>
                            </div>
                        </div>
                        <h4 className="fw-bold mb-0">₹81,710</h4>
                        <small className="text-muted" style={{ fontSize: '10px' }}>Revenue currently in transit / escrow</small>
                    </div>
                </div>
            </div>

            {/* Tabs and Content */}
            <div className="dashboard-card p-0 overflow-hidden border-0 shadow-sm bg-white">
                <div className="p-4 border-bottom d-flex flex-column flex-md-row gap-4 align-items-center">
                    <div className="d-flex gap-2 overflow-auto custom-scrollbar flex-shrink-0">
                        {["All", "Payouts", "Recharges", "Order Pay", "Refunds"].map(tab => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`btn p-0 px-3 py-2 rounded-3 small fw-bold transition-all border ${activeTab === tab ? 'bg-primary-red text-white' : 'bg-light text-muted'}`}
                                style={{ minWidth: '100px', backgroundColor: activeTab === tab ? '#E51818' : '' }}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    <div className="search-container flex-grow-1">
                        <Search size={18} className="text-muted" />
                        <input
                            type="text"
                            placeholder="Search by Transaction ID or Name..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="form-control bg-light border-0 ps-5 py-2 small"
                            style={{ borderRadius: '10px' }}
                        />
                    </div>
                </div>

                <div className="table-responsive">
                    <table className="table mb-0 table-hover">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 text-muted small border-0">TRANSACTION</th>
                                <th className="px-3 py-3 text-muted small border-0">PARTY</th>
                                <th className="px-3 py-3 text-muted small border-0">TYPE</th>
                                <th className="px-3 py-3 text-muted small border-0">METHOD</th>
                                <th className="px-3 py-3 text-muted small border-0">STATUS</th>
                                <th className="px-3 py-3 text-muted small border-0 text-end">AMOUNT</th>
                                <th className="px-4 py-3 text-muted small border-0"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.filter(txn => activeTab === "All" || txn.type.includes(activeTab.slice(0, -1))).map(txn => (
                                <tr key={txn.id} className="align-middle">
                                    <td className="px-4 py-3 border-0 small fw-bold">
                                        {txn.id}
                                        <small className="text-muted d-block" style={{ fontSize: '10px' }}>{txn.time}</small>
                                    </td>
                                    <td className="px-3 py-3 border-0 small text-muted">
                                        {txn.user || txn.rider}
                                        <span className="p-1 px-2 bg-light border rounded-pill ms-2" style={{ fontSize: '8px' }}>{txn.user ? 'Customer' : 'Rider'}</span>
                                    </td>
                                    <td className="px-3 py-3 border-0 small">
                                        <div className={`d-flex align-items-center gap-1 ${txn.type === 'Payout' ? 'text-danger' : 'text-success'}`}>
                                            {txn.type === 'Payout' ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                                            <span>{txn.type}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-0 small text-muted">
                                        <div className="d-flex align-items-center gap-2">
                                            <Wallet size={12} /> {txn.method}
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-0">
                                        <span className={`status-badge status-${txn.status.toLowerCase() === 'successful' ? 'active' : txn.status.toLowerCase()} p-1 px-3`} style={{ fontSize: '11px' }}>{txn.status}</span>
                                    </td>
                                    <td className="px-3 py-3 border-0 text-end fw-bold small">₹{txn.amount.toLocaleString()}</td>
                                    <td className="px-4 py-3 border-0 text-end">
                                        <button className="btn btn-link p-0 text-muted"><ChevronRight size={18} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;

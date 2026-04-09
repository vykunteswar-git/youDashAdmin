import { useState } from "react";
import {
    BarChart3,
    TrendingUp,
    Download,
    Calendar,
    DollarSign,
    Package,
    Bike,
    MapPin,
    ChevronDown
} from "lucide-react";

const Reports = () => {
    const [reportType, setReportType] = useState("Revenue"); // Revenue, Orders, Riders, Zones
    const [timeRange, setTimeRange] = useState("This Week"); // Today, This Week, This Month

    // Mock Data for Bar Chart
    const chartData = [
        { label: "Mon", value: 65, height: "65%" },
        { label: "Tue", value: 85, height: "85%" },
        { label: "Wed", value: 45, height: "45%" },
        { label: "Thu", value: 90, height: "90%" },
        { label: "Fri", value: 110, height: "100%" }, // Peak
        { label: "Sat", value: 95, height: "88%" },
        { label: "Sun", value: 60, height: "60%" }
    ];

    return (
        <div className="container-fluid fade-in position-relative">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
                <div>
                    <h2 className="fw-bold mb-1">Reports & Analytics</h2>
                    <p className="text-muted small mb-0">Generate, view, and export operational metrics across the ecosystem.</p>
                </div>
                <button className="btn btn-outline-secondary d-flex align-items-center gap-2 px-4 shadow-sm bg-white" style={{ borderRadius: '10px' }} onClick={() => alert("Aggregating CSV data for download...")}>
                    <Download size={18} /> <span className="fw-bold">Export to CSV</span>
                </button>
            </div>

            {/* Control Panel */}
            <div className="dashboard-card border-0 shadow-sm mb-4 d-flex flex-column flex-md-row gap-3 p-3">
                <div className="dropdown flex-grow-1">
                    <button className="btn btn-light w-100 d-flex justify-content-between align-items-center fw-bold text-muted py-2" data-bs-toggle="dropdown" style={{ borderRadius: '8px' }}>
                        <div className="d-flex align-items-center gap-2"><BarChart3 size={16} /> {reportType} Report</div>
                        <ChevronDown size={16} />
                    </button>
                    <ul className="dropdown-menu w-100 border-0 shadow-sm mt-1">
                        <li><button className="dropdown-item py-2 fw-bold" onClick={() => setReportType("Revenue")}>Revenue & Payouts</button></li>
                        <li><button className="dropdown-item py-2 fw-bold" onClick={() => setReportType("Orders")}>Order Volume</button></li>
                        <li><button className="dropdown-item py-2 fw-bold" onClick={() => setReportType("Riders")}>Rider Performance</button></li>
                        <li><button className="dropdown-item py-2 fw-bold" onClick={() => setReportType("Zones")}>Zone Density</button></li>
                    </ul>
                </div>

                <div className="dropdown flex-grow-1">
                    <button className="btn btn-light w-100 d-flex justify-content-between align-items-center fw-bold text-muted py-2" data-bs-toggle="dropdown" style={{ borderRadius: '8px' }}>
                        <div className="d-flex align-items-center gap-2"><Calendar size={16} /> {timeRange}</div>
                        <ChevronDown size={16} />
                    </button>
                    <ul className="dropdown-menu w-100 border-0 shadow-sm mt-1">
                        <li><button className="dropdown-item py-2 text-muted fw-bold" onClick={() => setTimeRange("Today")}>Today</button></li>
                        <li><button className="dropdown-item py-2 text-muted fw-bold" onClick={() => setTimeRange("This Week")}>This Week</button></li>
                        <li><button className="dropdown-item py-2 text-muted fw-bold" onClick={() => setTimeRange("This Month")}>This Month</button></li>
                    </ul>
                </div>
            </div>

            <div className="row g-4 mb-4">
                <div className="col-12 col-xl-8">
                    <div className="dashboard-card border-0 shadow-sm h-100">
                        <div className="d-flex justify-content-between align-items-start mb-5">
                            <div>
                                <h5 className="fw-bold mb-1">{reportType} Overview</h5>
                                <span className="small text-muted">{timeRange} Analytics</span>
                            </div>
                            <div className="text-end">
                                <h3 className="fw-bold m-0 text-dark">
                                    {reportType === "Revenue" ? "₹4,25,000" : reportType === "Orders" ? "1,240" : reportType === "Riders" ? "92% active" : "Hyperlocal"}
                                </h3>
                                <span className="small fw-bold text-success d-flex align-items-center justify-content-end gap-1"><TrendingUp size={12} /> +14% vs last period</span>
                            </div>
                        </div>

                        {/* Pure CSS Bar Chart */}
                        <div className="d-flex align-items-end justify-content-between pt-5 mt-auto px-2" style={{ height: '220px' }}>
                            {chartData.map((data, index) => (
                                <div key={index} className="d-flex flex-column align-items-center gap-3 w-100 transition-all hover-opacity-75 group" style={{ cursor: 'pointer' }}>
                                    <div className="position-relative w-50 bg-light rounded-top-3 d-flex align-items-end" style={{ height: '180px' }}>
                                        <div className="w-100 rounded-top-3 transition-all group-hover:bg-danger" style={{ height: data.height, backgroundColor: '#E51818' }}></div>
                                        <div className="position-absolute w-100 text-center opacity-0 group-hover:opacity-100 transition-all fw-bold small" style={{ top: '-25px' }}>{data.value}k</div>
                                    </div>
                                    <span className="small text-muted fw-bold">{data.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="col-12 col-xl-4">
                    <div className="row g-4">
                        <div className="col-12">
                            <div className="dashboard-card border-0 shadow-sm bg-primary-red text-white p-4" style={{ backgroundColor: '#E51818' }}>
                                <DollarSign size={24} className="mb-3 opacity-75" />
                                <h3 className="fw-bold m-0">2.4x</h3>
                                <p className="small opacity-75 mb-0">ROAS Multiplier</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="dashboard-card border-0 shadow-sm bg-white p-4">
                                <Package size={24} className="mb-3 text-primary-red" />
                                <h3 className="fw-bold m-0 text-dark">98.2%</h3>
                                <p className="small text-muted mb-0">Successful Completion Rate</p>
                            </div>
                        </div>
                        <div className="col-12">
                            <div className="dashboard-card border-0 shadow-sm bg-white p-4">
                                <Bike size={24} className="mb-3 text-warning" />
                                <h3 className="fw-bold m-0 text-dark">14 Mins</h3>
                                <p className="small text-muted mb-0">Avg Assignment ETA</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-card border-0 shadow-sm overflow-hidden p-0">
                <div className="p-4 border-bottom">
                    <h6 className="fw-bold m-0">Raw Data SetPreview (Top 5)</h6>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="px-4 py-3 small text-muted border-0">METRIC ID</th>
                                <th className="px-3 py-3 small text-muted border-0">SOURCE</th>
                                <th className="px-3 py-3 small text-muted border-0">VOLUME</th>
                                <th className="px-3 py-3 small text-muted border-0">CONVERSION</th>
                                <th className="px-4 py-3 small text-muted border-0 text-end">STATUS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5].map(id => (
                                <tr key={id}>
                                    <td className="px-4 py-3 small fw-bold border-0">MET-{4500 + id}</td>
                                    <td className="px-3 py-3 small text-muted border-0 d-flex align-items-center gap-2"><MapPin size={12} /> Zone {id}</td>
                                    <td className="px-3 py-3 small fw-bold border-0">{(500 / id).toFixed(0)}</td>
                                    <td className="px-3 py-3 small text-success fw-bold border-0">+{(2.4 * id).toFixed(1)}%</td>
                                    <td className="px-4 py-3 border-0 text-end"><span className="badge bg-success bg-opacity-10 text-success rounded-pill px-3">Synced</span></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Reports;

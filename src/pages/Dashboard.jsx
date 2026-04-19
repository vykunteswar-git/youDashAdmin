import { useState } from "react";
import {
  Users,
  Package,
  Bike,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  MoreVertical,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  DollarSign
} from "lucide-react";

/* TODO(Backend): Deployed OpenAPI has no /admin/... dashboard or analytics aggregate endpoints; KPIs and feeds are mock. Integrate when Spring exposes matching admin APIs (apiService + unwrap helpers). */

const Dashboard = () => {
  const [period, setPeriod] = useState("Today");

  const kpis = [
    { label: "Total Orders", value: "482", icon: Package, color: "#E51818", trend: "+12.5%", isUp: true, sub: "45 active right now" },
    { label: "Gross Revenue", value: "₹1,54,200", icon: DollarSign, color: "#10B981", trend: "+8.2%", isUp: true, sub: "₹4.2L this month" },
    { label: "Online Riders", value: "28", icon: Bike, color: "#3B82F6", trend: "-2.4%", isUp: false, sub: "of 842 fleet total" },
    { label: "Active Users", value: "1,250", icon: Users, color: "#8B5CF6", trend: "+5.1%", isUp: true, sub: "today's unique sessions" },
  ];

  const operationalStats = [
    { label: "Avg Assignment ETA", value: "4.2 min", icon: Clock, status: "good" },
    { label: "Cancellation Rate", value: "2.8%", icon: AlertTriangle, status: "warning" },
    { label: "On-Time Delivery", value: "97.4%", icon: CheckCircle2, status: "good" },
    { label: "Avg Order Value", value: "₹320", icon: Zap, status: "good" },
  ];

  const recentOrders = [
    { id: "#RD4521", user: "Gowtham Akhil", type: "Express", status: "Delivered", time: "2 mins ago" },
    { id: "#RD4522", user: "Jane Smith", type: "Standard", status: "Active", time: "15 mins ago" },
    { id: "#RD4523", user: "Mike Johnson", type: "Insurance", status: "Pending", time: "30 mins ago" },
    { id: "#RD4524", user: "Emily Davis", type: "Express", status: "Delivered", time: "1 hour ago" },
    { id: "#RD4525", user: "Chris Brown", type: "Standard", status: "Cancelled", time: "2 hours ago" },
  ];

  const chartData = [60, 45, 80, 55, 90, 75, 100];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const peak = Math.max(...chartData);

  return (
    <div className="container-fluid fade-in">
      {/* Header */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Operational Overview</h2>
          <p className="text-muted small mb-0">Real-time metrics for YouDash fleet and orders.</p>
        </div>
        <div className="d-flex gap-2">
          {["Today", "This Week", "This Month"].map(p => (
            <button key={p} onClick={() => setPeriod(p)} className={`btn small fw-bold px-3 py-2 border-0 rounded-3 ${period === p ? 'text-white' : 'btn-light text-muted'}`} style={{ backgroundColor: period === p ? '#E51818' : '' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="row g-4 mb-4">
        {kpis.map((kpi, idx) => (
          <div key={idx} className="col-12 col-sm-6 col-xl-3">
            <div className="dashboard-card h-100 border-0 shadow-sm">
              <div className="d-flex justify-content-between mb-3">
                <div className="stats-icon-wrapper" style={{ backgroundColor: `${kpi.color}15`, color: kpi.color }}>
                  <kpi.icon size={24} />
                </div>
                <div className={`d-flex align-items-center gap-1 small fw-bold ${kpi.isUp ? 'text-success' : 'text-danger'}`}>
                  {kpi.isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  <span>{kpi.trend}</span>
                </div>
              </div>
              <h3 className="fw-bold mb-1 fs-2">{kpi.value}</h3>
              <p className="fw-bold text-dark small mb-0">{kpi.label}</p>
              <p className="text-muted mb-0" style={{ fontSize: '10px' }}>{kpi.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Health Bar */}
      <div className="row g-3 mb-4">
        {operationalStats.map((stat, idx) => (
          <div key={idx} className="col-6 col-xl-3">
            <div className={`dashboard-card border-0 shadow-sm d-flex align-items-center gap-3 py-3 px-3 border-start border-4 ${stat.status === 'good' ? 'border-success' : 'border-warning'}`}>
              <stat.icon size={22} className={stat.status === 'good' ? 'text-success' : 'text-warning'} />
              <div>
                <p className="fw-bold fs-6 mb-0">{stat.value}</p>
                <small className="text-muted" style={{ fontSize: '10px' }}>{stat.label}</small>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-4">
        {/* Chart Section */}
        <div className="col-12 col-xl-8">
          <div className="dashboard-card h-100 border-0 shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h5 className="fw-bold mb-0">Order Volume Trends — {period}</h5>
              <button className="btn btn-link p-0 text-dark"><MoreVertical size={20} /></button>
            </div>

            <div className="d-flex align-items-end justify-content-between px-2" style={{ height: '250px' }}>
              {chartData.map((h, i) => (
                <div key={i} className="d-flex flex-column align-items-center gap-2 w-100" style={{ cursor: 'pointer' }}>
                  <span className="small fw-bold text-muted" style={{ fontSize: '10px' }}>{h}</span>
                  <div className="w-50 rounded-top-3 transition-all" style={{ height: `${(h / peak) * 200}px`, backgroundColor: h === peak ? '#E51818' : '#E5181820', minWidth: '24px', borderRadius: '6px 6px 0 0' }}></div>
                  <small className="text-muted fw-bold" style={{ fontSize: '10px' }}>{days[i]}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="col-12 col-xl-4">
          <div className="dashboard-card h-100 border-0 shadow-sm">
            <h5 className="fw-bold mb-4">Live Activity Feed</h5>
            <div className="d-flex flex-column gap-4">
              {recentOrders.map((order, idx) => (
                <div key={idx} className="d-flex align-items-center gap-3">
                  <div className={`p-2 rounded-circle ${order.status === 'Delivered' ? 'bg-success bg-opacity-10' :
                      order.status === 'Cancelled' ? 'bg-danger bg-opacity-10' :
                        'bg-warning bg-opacity-10'
                    }`}>
                    <Clock size={16} className={order.status === 'Delivered' ? 'text-success' : order.status === 'Cancelled' ? 'text-danger' : 'text-warning'} />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold small">{order.user}</span>
                      <span className={`status-badge status-${order.status.toLowerCase()} p-1 px-2`} style={{ fontSize: '10px' }}>{order.status}</span>
                    </div>
                    <p className="mb-0 text-muted" style={{ fontSize: '11px' }}>{order.id} • {order.type}</p>
                    <small className="text-muted" style={{ fontSize: '10px' }}>{order.time}</small>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-light w-100 mt-4 py-2 small fw-bold">View All Activity</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

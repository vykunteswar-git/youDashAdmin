import { useState } from "react";
import { Search, Bell, User, Menu, AlertTriangle, X, Clock, Bike, Package } from "lucide-react";

// Real-time incident alerts (mock — connect to WebSocket in production)
const incidents = [
  { id: 1, icon: AlertTriangle, color: "#E51818", label: "High Cancellations", description: "8 orders cancelled in Hyderabad Z3 in 15 mins.", time: "2 min ago", severity: "critical" },
  { id: 2, icon: Bike, color: "#F59E0B", label: "Unassigned Orders Spike", description: "12 orders have no rider for 10+ minutes.", time: "5 min ago", severity: "warning" },
  { id: 3, icon: Package, color: "#3B82F6", label: "Delayed in Transit", description: "ORD004 & ORD007 stuck — no location update 30 min.", time: "18 min ago", severity: "info" },
  { id: 4, icon: AlertTriangle, color: "#10B981", label: "System Load Normal", description: "All gateways operational. No issues detected.", time: "Just now", severity: "ok" },
];

const Header = ({ setCollapsed, collapsed }) => {
  const [showAlerts, setShowAlerts] = useState(false);
  const criticalCount = incidents.filter(i => i.severity === 'critical' || i.severity === 'warning').length;

  return (
    <header className="glass-header header-shadow px-4 py-2 d-flex align-items-center justify-content-between border-bottom position-relative bg-white" style={{ zIndex: 100 }}>
      <div className="d-flex align-items-center gap-3">
        <button className="btn btn-link text-dark p-0 d-lg-none" onClick={() => setCollapsed(!collapsed)}>
          <Menu size={20} />
        </button>
        <div className="search-container d-none d-md-block">
          <Search size={18} />
          <input type="text" className="form-control bg-light border-0 ps-5" placeholder="Search orders, riders, users..." style={{ borderRadius: '10px', width: '300px' }} />
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {/* Incident Alert Bell */}
        <div className="position-relative">
          <button
            className={`btn rounded-circle p-2 position-relative d-flex align-items-center justify-content-center ${showAlerts ? 'btn-danger text-white' : 'btn-light'}`}
            onClick={() => setShowAlerts(!showAlerts)}
            style={{ width: '42px', height: '42px', transition: 'all 0.2s' }}
          >
            <Bell size={20} />
            {criticalCount > 0 && (
              <span className="position-absolute top-0 end-0 badge rounded-pill bg-danger border border-white fw-bold d-flex align-items-center justify-content-center" style={{ padding: '3px 5px', fontSize: '9px', minWidth: '18px', height: '18px' }}>
                {criticalCount}
              </span>
            )}
          </button>

          {showAlerts && (
            <div className="position-absolute end-0 mt-2 bg-white border-0 shadow-lg fade-in" style={{ width: '360px', borderRadius: '16px', zIndex: 9999, overflow: 'hidden' }}>
              {/* Header */}
              <div className="p-4 border-bottom d-flex justify-content-between align-items-center" style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)' }}>
                <div>
                  <h6 className="fw-bold text-white mb-0">⚡ Operational Alerts</h6>
                  <small className="opacity-50 text-white">Live incident feed — updates every 30s</small>
                </div>
                <button className="btn btn-link p-0 text-white opacity-75" onClick={() => setShowAlerts(false)}>
                  <X size={18} />
                </button>
              </div>

              {/* Alert Items */}
              <div className="d-flex flex-column" style={{ maxHeight: '340px', overflowY: 'auto' }}>
                {incidents.map((alert) => (
                  <div key={alert.id} className="p-3 border-bottom hover-bg-light transition-all cursor-pointer d-flex gap-3 align-items-start" style={{ borderLeft: `4px solid ${alert.color}` }}>
                    <div className="p-2 rounded-3 flex-shrink-0 d-flex align-items-center justify-content-center" style={{ backgroundColor: `${alert.color}15`, width: '38px', height: '38px' }}>
                      <alert.icon size={18} style={{ color: alert.color }} />
                    </div>
                    <div className="flex-grow-1">
                      <p className="fw-bold mb-0 small">{alert.label}</p>
                      <p className="text-muted mb-1" style={{ fontSize: '11px' }}>{alert.description}</p>
                      <small className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '10px' }}>
                        <Clock size={10} /> {alert.time}
                      </small>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 text-center border-top">
                <button className="btn btn-link p-0 fw-bold small text-danger">View All Incident Logs →</button>
              </div>
            </div>
          )}
        </div>

        <div className="vr mx-2"></div>

        <div className="d-flex align-items-center gap-2 cursor-pointer">
          <div className="text-end d-none d-sm-block">
            <p className="mb-0 fw-bold small">Admin User</p>
            <p className="mb-0 text-muted small" style={{ fontSize: '10px' }}>Super Admin</p>
          </div>
          <div className="bg-primary-red p-1 rounded-circle" style={{ backgroundColor: '#E51818' }}>
            <User size={24} className="text-white" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

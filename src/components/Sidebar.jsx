import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Package, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { menuGroups } from "../config/adminNavConfig";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();
  const { notifyAuthChanged } = useAuth();

  const handleLogout = () => {
    const ok = window.confirm(
      "Are you sure you want to log out? You will need to sign in again."
    );
    if (!ok) return;
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("adminAuthenticated");
    notifyAuthChanged();
    // Defer so isLoggedIn is false before /login is matched (avoids <Navigate to="/dashboard" />).
    window.setTimeout(() => {
      navigate("/login", { replace: true });
    }, 0);
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="d-flex flex-column h-100 p-3">
        <div className="sidebar-header d-flex align-items-center justify-content-between mb-4">
          {!collapsed && (
            <div className="d-flex align-items-center">
              <div className="bg-primary-red p-2 rounded-3 me-2" style={{ backgroundColor: '#E51818' }}>
                <Package className="text-white" size={20} />
              </div>
              <span className="fw-bold fs-5 text-white">YouDash</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="btn btn-link text-white p-0"
          >
            {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
        </div>

        <div className="sidebar-nav overflow-auto flex-grow-1 custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="mb-4">
              {!collapsed && (
                <small className="text-muted text-uppercase fw-bold mb-2 d-block" style={{ fontSize: '10px', letterSpacing: '1px' }}>
                  {group.title}
                </small>
              )}
              {group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `nav-link d-flex align-items-center my-1 rounded-3 p-2 transition-all ${isActive ? 'bg-primary-red text-white' : 'text-white-50 hover-bg-white-10'}`
                  }
                  style={({ isActive }) => ({
                    backgroundColor: isActive ? '#E51818' : 'transparent',
                    textDecoration: 'none'
                  })}
                >
                  <item.icon size={20} className={collapsed ? 'mx-auto' : 'me-2'} />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="sidebar-footer pt-3 mt-auto border-top border-secondary">
          <button
            onClick={handleLogout}
            className="btn btn-link nav-link d-flex align-items-center text-white-50 w-100 p-2 hover-text-danger"
          >
            <LogOut size={20} className={collapsed ? 'mx-auto' : 'me-2'} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Bike,
  Truck,
  ListTree,
  Package,
  Map,
  DollarSign,
  CreditCard,
  History,
  Bell,
  LifeBuoy,
  Image,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  BarChart3,
  Ticket
} from "lucide-react";

const Sidebar = ({ collapsed, setCollapsed }) => {
  const navigate = useNavigate();

  const menuGroups = [
    {
      title: "Core",
      items: [
        { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
        { path: "/orders", label: "Orders", icon: Package },
      ]
    },
    {
      title: "Operations",
      items: [
        { path: "/zone-setup", label: "Zone Setup", icon: Map },
      ]
    },
    {
      title: "Management",
      items: [
        { path: "/users", label: "Users", icon: Users },
        { path: "/riders", label: "Riders", icon: Bike },
        { path: "/vehicles", label: "Vehicles", icon: Truck },
        { path: "/categories", label: "Categories", icon: ListTree },
      ]
    },
    {
      title: "Finance",
      items: [
        { path: "/pricing", label: "Pricing", icon: DollarSign },
        { path: "/payments", label: "Payments", icon: CreditCard },
        { path: "/reports", label: "Reports & Analytics", icon: BarChart3 },
        { path: "/promotions", label: "Coupons & Offers", icon: Ticket },
        { path: "/transactions", label: "Transactions", icon: History },
      ]
    },
    {
      title: "Communications",
      items: [
        { path: "/notifications", label: "Notifications", icon: Bell },
        { path: "/support", label: "Support", icon: LifeBuoy },
      ]
    },
    {
      title: "Settings",
      items: [
        { path: "/content", label: "CMS", icon: Image },
        { path: "/settings", label: "Settings", icon: Settings },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
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

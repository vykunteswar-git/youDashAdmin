import { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import Header from "../components/Navbar";

// Pages
import Dashboard from "../pages/Dashboard";
import Users from "../pages/Users";
import Orders from "../pages/Orders";
import Riders from "../pages/Riders";
import Payments from "../pages/Payments";
import Vehicles from "../pages/Vehicles";
import Pricing from "../pages/Pricing";
import DeliveryFee from "../pages/DeliveryFee";
import RiderCommission from "../pages/RiderCommission";
import RiderIncentives from "../pages/RiderIncentives";
import WalletAdmin from "../pages/WalletAdmin";
import Zones from "../pages/Zones";
import Hubs from "../pages/Hubs";
import HubRoutes from "../pages/HubRoutes";
import Categories from "../pages/Categories";
import Transactions from "../pages/Transactions";
import Reports from "../pages/Reports";
import Promotions from "../pages/Promotions";
import Notifications from "../pages/Notifications";
import Support from "../pages/Support";
import CMS from "../pages/CMS";
import Settings from "../pages/Settings";
import AppVersion from "../pages/AppVersion";
import Login from "../pages/Login";

function AppShell({ collapsed, setCollapsed }) {
  return (
    <div className="d-flex min-vh-100 position-relative bg-light">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className={`main-content flex-grow-1 p-0 ${
          collapsed ? "expanded" : ""
        }`}
        style={{
          marginLeft: collapsed ? "80px" : "260px",
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          minWidth: 0, // Prevent flex overflow
        }}
      >
        <Header collapsed={collapsed} setCollapsed={setCollapsed} />
        <div className="p-3 p-md-4 overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

const AppRoutes = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { isLoggedIn } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      <Route
        path="/"
        element={<Navigate to={isLoggedIn ? "/dashboard" : "/login"} replace />}
      />

      <Route
        element={
          !isLoggedIn ? (
            <Navigate to="/login" replace />
          ) : (
            <AppShell collapsed={collapsed} setCollapsed={setCollapsed} />
          )
        }
      >
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="orders" element={<Orders />} />
        <Route path="riders" element={<Riders />} />
        <Route path="payments" element={<Payments />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="zones" element={<Zones />} />
        <Route path="hubs" element={<Hubs />} />
        <Route path="hub-routes" element={<HubRoutes />} />
        <Route path="categories" element={<Categories />} />
        <Route path="pricing" element={<Pricing />} />
        <Route path="delivery-fee" element={<DeliveryFee />} />
        <Route path="rider-commission" element={<RiderCommission />} />
        <Route path="rider-incentives" element={<RiderIncentives />} />
        <Route path="wallet-admin" element={<WalletAdmin />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="reports" element={<Reports />} />
        <Route path="promotions" element={<Promotions />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="support" element={<Support />} />
        <Route path="content" element={<CMS />} />
        <Route path="settings" element={<Settings />} />
        <Route path="app-version" element={<AppVersion />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;

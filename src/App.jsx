import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import RequireAuth from "@/components/RequireAuth";
import Shell from "@/layout/Shell";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Riders from "@/pages/Riders";
import Users from "@/pages/Users";
import Vehicles from "@/pages/Vehicles";
import Zones from "@/pages/Zones";
import Hubs from "@/pages/Hubs";
import Transactions from "@/pages/Transactions";
import Payments from "@/pages/Payments";
import Withdrawals from "@/pages/Withdrawals";
import Promotions from "@/pages/Promotions";
import Categories from "@/pages/Categories";
import Commission from "@/pages/Commission";
import Incentives from "@/pages/Incentives";
import WalletAdmin from "@/pages/WalletAdmin";
import Notifications from "@/pages/Notifications";
import Reports from "@/pages/Reports";
import AuditLogs from "@/pages/AuditLogs";
import AppVersion from "@/pages/AppVersion";
import AppConfig from "@/pages/AppConfig";
import CMS from "@/pages/CMS";
import CodHandover from "@/pages/CodHandover";
import Pricing from "@/pages/Pricing";
import ZoneForm from "@/pages/AddZone";
import HubForm from "@/pages/AddHub";
import RiderDetail from "@/pages/RiderDetail";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route element={<RequireAuth><Shell /></RequireAuth>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="riders" element={<Riders />} />
          <Route path="riders/:id" element={<RiderDetail />} />
          <Route path="users" element={<Users />} />
          <Route path="vehicles" element={<Vehicles />} />
          <Route path="zones" element={<Zones />} />
          <Route path="zones/new" element={<ZoneForm mode="create" />} />
          <Route path="zones/:id/edit" element={<ZoneForm mode="edit" />} />
          <Route path="hubs" element={<Hubs />} />
          <Route path="hubs/new" element={<HubForm mode="create" />} />
          <Route path="hubs/:id/edit" element={<HubForm mode="edit" />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="app-config" element={<AppConfig />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="payments" element={<Payments />} />
          <Route path="withdrawals" element={<Withdrawals />} />
          <Route path="promotions" element={<Promotions />} />
          <Route path="categories" element={<Categories />} />
          <Route path="commission" element={<Commission />} />
          <Route path="incentives" element={<Incentives />} />
          <Route path="wallet" element={<WalletAdmin />} />
          <Route path="cod-handover" element={<CodHandover />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="app-version" element={<AppVersion />} />
          <Route path="cms" element={<CMS />} />
        </Route>
      </Routes>
      <Toaster position="top-right" richColors />
    </BrowserRouter>
  );
}

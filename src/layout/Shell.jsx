import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Package, Users, Truck, MapPin, Building2,
  CreditCard, ArrowDownToLine, Tags, ListChecks, Percent,
  Sparkles, BellRing, BarChart3, Smartphone, Settings,
  Image, Bike, Banknote, Route, LogOut
} from "lucide-react";
import { clearAuthSession, getAuthUser } from "@/lib/auth";
import BrandLogo from "@/components/BrandLogo";
import "@/components/BrandLogo.css";

const NAV = [
  { group: "Operations", items: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
    { to: "/orders", label: "Orders", icon: Package, testid: "nav-orders" },
  ]},
  { group: "Fleet", items: [
    { to: "/riders", label: "Riders", icon: Bike, testid: "nav-riders" },
    { to: "/vehicles", label: "Vehicles", icon: Truck, testid: "nav-vehicles" },
    { to: "/cod-handover", label: "COD Handover", icon: Banknote, testid: "nav-cod" },
  ]},
  { group: "Network", items: [
    { to: "/zones", label: "Zones", icon: MapPin, testid: "nav-zones" },
    { to: "/hubs", label: "Hubs", icon: Building2, testid: "nav-hubs" },
    { to: "/app-config", label: "App Config", icon: Settings, testid: "nav-app-config" },
    { to: "/pricing", label: "Pricing Routes", icon: Route, testid: "nav-pricing" },
  ]},
  { group: "People", items: [
    { to: "/users", label: "Users", icon: Users, testid: "nav-users" },
  ]},
  { group: "Financials", items: [
    { to: "/transactions", label: "Transactions", icon: CreditCard, testid: "nav-txns" },
    { to: "/payments", label: "Payments", icon: Banknote, testid: "nav-payments" },
    { to: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine, testid: "nav-withdrawals" },
    { to: "/commission", label: "Rider Commission", icon: Percent, testid: "nav-commission" },
    { to: "/incentives", label: "Rider Incentives", icon: Sparkles, testid: "nav-incentives" },
  ]},
  { group: "Catalog", items: [
    { to: "/categories", label: "Categories", icon: Tags, testid: "nav-categories" },
    { to: "/promotions", label: "Promotions", icon: ListChecks, testid: "nav-promotions" },
    { to: "/cms", label: "CMS", icon: Image, testid: "nav-cms" },
  ]},
  { group: "System", items: [
    { to: "/notifications", label: "Notifications", icon: BellRing, testid: "nav-notifications" },
    { to: "/reports", label: "Reports", icon: BarChart3, testid: "nav-reports" },
    { to: "/app-version", label: "App Version", icon: Smartphone, testid: "nav-app-version" },
  ]},
];

export default function Shell() {
  const loc = useLocation();
  const navigate = useNavigate();
  const admin = getAuthUser();

  function handleLogout() {
    clearAuthSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen" data-testid="shell-root">
      <aside className="sidebar fixed left-0 top-0 bottom-0 w-[260px] overflow-y-auto flex flex-col" data-testid="sidebar">
        <div className="px-4 pt-5 pb-4 border-b border-[var(--sidebar-border)]">
          <BrandLogo variant="sidebar" />
        </div>
        <nav className="flex-1 px-3 py-3">
          {NAV.map((sec) => (
            <div key={sec.group}>
              <div className="sidebar-group">{sec.group}</div>
              {sec.items.map((it) => (
                <NavLink key={it.to} to={it.to} data-testid={it.testid}
                  className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
                  <it.icon size={15} strokeWidth={1.6} />
                  <span>{it.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
          <div className="h-6" />
        </nav>
        <div className="sidebar-footer px-4 py-3 border-t border-[var(--sidebar-border)]">
          <div className="flex items-center gap-2">
            <div className="sidebar-live-dot w-2 h-2 rounded-full animate-pulse" />
            <span>Live · India ops</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 ml-[260px]" data-testid="main-content">
        <header className="h-14 bg-white border-b border-[var(--border-default)] flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="text-[13px] text-zinc-500">
            <span className="text-zinc-400">/</span> <span className="text-zinc-900 capitalize">{loc.pathname.replace("/", "") || "dashboard"}</span>
          </div>
          <div className="flex items-center gap-3">
            <input data-testid="global-search" placeholder="Search orders, riders, users…" className="h-8 w-72 text-sm px-3 border border-[var(--border-default)] rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            <div className="flex items-center gap-2 px-2 py-1 border border-[var(--border-default)] rounded-sm">
              <div className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center text-[11px] font-semibold">AP</div>
              <span className="text-[12px]">{admin?.email || "Admin"}</span>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="h-8 px-3 border border-[var(--border-default)] rounded-sm text-[12px] flex items-center gap-2 hover:bg-[var(--slate-100)]"
              data-testid="logout-button"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

import {
  LayoutDashboard,
  Users,
  Bike,
  Truck,
  Package,
  CreditCard,
  History,
  Bell,
  Image,
  BarChart3,
  Ticket,
  MapPin,
  Warehouse,
  Waypoints,
  SlidersHorizontal,
  Tags,
  Percent,
  Wallet,
  Flame,
  Smartphone,
} from "lucide-react";

/**
 * Single source of truth for sidebar + global command search.
 * Optional `keywords` improve matching (synonyms, acronyms).
 */
export const menuGroups = [
  {
    title: "Core",
    items: [
      {
        path: "/dashboard",
        label: "Dashboard",
        icon: LayoutDashboard,
        keywords: ["home", "overview", "stats", "analytics"],
      },
      {
        path: "/orders",
        label: "Orders",
        icon: Package,
        keywords: ["parcel", "delivery", "shipments"],
      },
    ],
  },
  {
    title: "Management",
    items: [
      { path: "/users", label: "Users", icon: Users, keywords: ["customers", "accounts"] },
      { path: "/riders", label: "Riders", icon: Bike, keywords: ["courier", "drivers", "fleet"] },
      { path: "/vehicles", label: "Vehicles", icon: Truck, keywords: ["trucks", "fleet"] },
      { path: "/zones", label: "Zones", icon: MapPin, keywords: ["areas", "coverage", "map"] },
      { path: "/hubs", label: "Hubs", icon: Warehouse, keywords: ["warehouse", "depot"] },
      {
        path: "/hub-routes",
        label: "Hub routes",
        icon: Waypoints,
        keywords: ["routes", "sla", "between hubs"],
      },
      {
        path: "/categories",
        label: "Package categories",
        icon: Tags,
        keywords: ["categories", "types", "parcel types"],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        path: "/delivery-fee",
        label: "App config",
        icon: SlidersHorizontal,
        keywords: ["pricing", "rates", "fees", "delivery fee", "configuration", "base fare"],
      },
      {
        path: "/rider-commission",
        label: "Rider commission",
        icon: Percent,
        keywords: ["commission", "payout", "earnings"],
      },
      {
        path: "/rider-incentives",
        label: "Rider incentives",
        icon: Flame,
        keywords: ["bonus", "rewards", "promo riders"],
      },
      {
        path: "/wallet-admin",
        label: "Wallet & settlements",
        icon: Wallet,
        keywords: ["wallet", "settlements", "payouts", "balance"],
      },
      { path: "/payments", label: "Payments", icon: CreditCard, keywords: ["gateway", "transactions"] },
      {
        path: "/reports",
        label: "Reports & Analytics",
        icon: BarChart3,
        keywords: ["reports", "revenue", "analytics", "export"],
      },
      {
        path: "/promotions",
        label: "Coupons & Offers",
        icon: Ticket,
        keywords: ["coupons", "discounts", "offers", "promo"],
      },
      {
        path: "/transactions",
        label: "Transactions",
        icon: History,
        keywords: ["ledger", "history", "payments log"],
      },
    ],
  },
  {
    title: "Communications",
    items: [
      {
        path: "/notifications",
        label: "Notifications",
        icon: Bell,
        keywords: ["push", "alerts", "messages"],
      },
      /* Not integrated (mock tickets). Uncomment + import LifeBuoy when admin Support API exists.
      {
        path: "/support",
        label: "Support",
        icon: LifeBuoy,
        keywords: ["tickets", "help", "customer support"],
      },
      */
    ],
  },
  {
    title: "Settings",
    items: [
      {
        path: "/content",
        label: "CMS",
        icon: Image,
        keywords: ["content", "banners", "pages", "media"],
      },
      {
        path: "/app-version",
        label: "App version",
        icon: Smartphone,
        keywords: ["version", "release", "mobile app", "force update"],
      },
      /* Not integrated (local mock). Uncomment + import Settings when admin business-settings API exists.
      {
        path: "/settings",
        label: "Settings",
        icon: Settings,
        keywords: ["business", "configuration", "preferences"],
      },
      */
    ],
  },
];

/**
 * Optional extra search rows (e.g. legacy paths). Re-enable with commented route in AppRoutes.
 * Not integrated: /pricing is only a redirect; app config is the real screen.
 */
export const extraSearchRoutes = [
  /* {
    path: "/pricing",
    label: "Pricing (redirects to app config)",
    group: "Shortcuts",
    icon: SlidersHorizontal,
    keywords: ["legacy pricing", "rates"],
  }, */
];

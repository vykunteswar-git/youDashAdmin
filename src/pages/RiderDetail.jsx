import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { toast } from "sonner";
import {
  ArrowLeft, Phone, MapPin, Bike, Star, Wallet, Banknote,
  CheckCircle2, AlertCircle, Package, TrendingUp, FileText, Ban, ShieldCheck
} from "lucide-react";

const TABS = [
  { id: "profile", label: "Profile & KYC" },
  { id: "orders", label: "Past Orders" },
  { id: "wallet", label: "Wallet" },
  { id: "cod", label: "COD Handover" },
  { id: "performance", label: "Performance" },
];

export default function RiderDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tab, setTab] = useState("profile");
  const [rider, setRider] = useState(null);
  const [orders, setOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [cod, setCod] = useState({ deposits: [], total: 0 });
  const [perf, setPerf] = useState(null);

  async function loadAll() {
    const [r, o, w, c, p] = await Promise.all([
      api.get(`/riders/${id}`),
      api.get(`/riders/${id}/orders`),
      api.get(`/riders/${id}/wallet`),
      api.get(`/riders/${id}/cod-deposits`),
      api.get(`/riders/${id}/performance`),
    ]);
    setRider(r.data);
    setOrders(o.data.orders);
    setWallet(w.data);
    setCod(c.data);
    setPerf(p.data);
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [id]);

  async function approve() {
    await api.post(`/riders/${id}/approve`);
    toast.success("Rider approved");
    loadAll();
  }
  async function reject() {
    await api.post(`/riders/${id}/reject`);
    toast.success("Rider rejected");
    loadAll();
  }

  if (!rider) return <div className="empty">Loading rider…</div>;

  return (
    <div data-testid="rider-detail-page">
      <button onClick={() => nav("/riders")} className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-3 flex items-center gap-1" data-testid="back-to-riders">
        <ArrowLeft size={13} /> Back to Riders
      </button>

      {/* Identity header */}
      <div className="surface p-5 mb-5" data-testid="rider-header">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <img src={rider.avatar} alt="" className="w-16 h-16 rounded-full border-2 border-[var(--border-default)]" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-semibold" style={{ fontFamily: "Outfit" }}>{rider.name}</h1>
                <span className={`pill ${rider.status === "APPROVED" ? "pill-green" : rider.status === "PENDING" ? "pill-amber" : "pill-red"}`} data-testid="rider-status">
                  {rider.status}
                </span>
                {rider.blocked && <span className="pill pill-red" data-testid="rider-blocked"><Ban size={11} /> Blocked</span>}
                <span className={`pill ${rider.availability === "ONLINE" ? "pill-green" : "pill-slate"}`}>{rider.availability}</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 text-[12px] text-[var(--slate-600)]">
                <span className="flex items-center gap-1"><Phone size={12} /> <span className="mono">{rider.phone}</span></span>
                <span className="flex items-center gap-1"><MapPin size={12} /> {rider.city}</span>
                <span className="flex items-center gap-1"><Bike size={12} /> {rider.vehicle_type}</span>
                <span className="flex items-center gap-1"><Star size={12} className="text-[var(--amber)]" /> <span className="mono">{rider.rating}</span></span>
              </div>
            </div>
          </div>
          {rider.status === "PENDING" && (
            <div className="flex gap-2" data-testid="rider-approval-actions">
              <button onClick={approve} className="btn-primary" data-testid="approve-rider-detail">Approve</button>
              <button onClick={reject} className="btn-secondary" data-testid="reject-rider-detail">Reject</button>
            </div>
          )}
        </div>

        {/* Quick stats strip */}
        <div className="grid grid-cols-5 gap-3 mt-5 pt-5 border-t border-[var(--border-default)]">
          <Stat icon={Package} label="Total Orders" value={perf?.total_orders ?? "—"} testid="stat-total-orders" />
          <Stat icon={CheckCircle2} label="Delivered" value={perf?.delivered ?? "—"} accent="green" testid="stat-delivered" />
          <Stat icon={Wallet} label="Wallet Balance" value={`₹${rider.wallet_balance ?? 0}`} accent="blue" testid="stat-wallet" />
          <Stat icon={Banknote} label="COD Pending" value={`₹${rider.cod_pending ?? 0} / ₹${rider.cod_limit ?? 0}`} accent={rider.blocked ? "red" : "amber"} testid="stat-cod" />
          <Stat icon={TrendingUp} label="Earnings" value={`₹${perf?.total_earnings ?? 0}`} accent="green" testid="stat-earnings" />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabbar mb-4">
        {TABS.map(t => (
          <button
            key={t.id}
            className={tab === t.id ? "active" : ""}
            onClick={() => setTab(t.id)}
            data-testid={`rider-tab-${t.id}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab rider={rider} />}
      {tab === "orders" && <OrdersTab orders={orders} nav={nav} />}
      {tab === "wallet" && <WalletTab wallet={wallet} />}
      {tab === "cod" && <CodTab cod={cod} riderId={id} reload={loadAll} />}
      {tab === "performance" && <PerformanceTab perf={perf} />}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "slate", testid }) {
  const colorMap = {
    green: "var(--green)",
    red: "var(--brand-red)",
    amber: "var(--amber)",
    blue: "var(--blue)",
    slate: "var(--slate-600)",
  };
  return (
    <div data-testid={testid}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[var(--slate-400)] mb-1">
        <Icon size={11} style={{ color: colorMap[accent] }} /> {label}
      </div>
      <div className="font-semibold text-[18px]" style={{ fontFamily: "Outfit", color: colorMap[accent] }}>{value}</div>
    </div>
  );
}

function ProfileTab({ rider }) {
  return (
    <div className="grid grid-cols-2 gap-4" data-testid="profile-tab">
      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-4">Contact & Vehicle</h3>
        <Row label="Full name" value={rider.name} />
        <Row label="Phone" value={rider.phone} mono />
        <Row label="City" value={rider.city} />
        <Row label="Zone ID" value={rider.zone_id || "—"} mono />
        <Row label="Vehicle" value={rider.vehicle_type} />
        <Row label="Joined" value={(rider.joined_at || "").slice(0, 10)} mono />
      </div>
      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--green)]" /> KYC Documents
        </h3>
        <div className="space-y-2">
          {Object.entries(rider.documents || {}).map(([doc, ok]) => (
            <div key={doc} className="flex items-center justify-between py-2 border-b border-[var(--slate-100)] last:border-0">
              <div className="flex items-center gap-2 text-[13px]">
                <FileText size={13} className="text-[var(--slate-400)]" />
                <span className="capitalize">{doc}</span>
              </div>
              {ok ? (
                <span className="pill pill-green"><CheckCircle2 size={11} /> Verified</span>
              ) : (
                <span className="pill pill-red"><AlertCircle size={11} /> Missing</span>
              )}
            </div>
          ))}
          {Object.keys(rider.documents || {}).length === 0 && (
            <div className="empty">No documents uploaded</div>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, mono }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--slate-100)] last:border-0">
      <span className="text-[12px] text-[var(--slate-600)]">{label}</span>
      <span className={`text-[13px] text-[var(--text-dark)] ${mono ? "mono" : ""}`}>{value}</span>
    </div>
  );
}

function OrdersTab({ orders, nav }) {
  if (!orders.length) return <div className="surface empty" data-testid="orders-tab-empty">No past orders for this rider yet.</div>;
  return (
    <div className="surface overflow-hidden" data-testid="orders-tab">
      <table className="tbl">
        <thead>
          <tr>
            <th>Tracking</th><th>Role</th><th>Route</th><th>Status</th><th>Payment</th><th className="text-right">Fare</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.id} className="row-link" onClick={() => nav(`/orders/${o.id}`)} data-testid={`rider-order-${o.id}`}>
              <td className="mono font-medium">{o.tracking_id}</td>
              <td><span className="chip">{o.rider_role}</span></td>
              <td className="text-[12px]">{o.origin_city} → {o.destination_city}</td>
              <td><StatusPill status={o.status} /></td>
              <td><span className="chip">{o.payment_mode}</span></td>
              <td className="text-right mono">₹{o.fare_breakdown?.total || 0}</td>
              <td className="text-[11px] text-[var(--slate-400)] mono">{(o.created_at || "").slice(0, 10)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WalletTab({ wallet }) {
  if (!wallet) return <div className="empty">Loading wallet…</div>;
  return (
    <div className="space-y-4" data-testid="wallet-tab">
      <div className="grid grid-cols-3 gap-3">
        <div className="kpi">
          <div className="label">Wallet Balance</div>
          <div className="value" style={{ color: "var(--blue)" }}>₹{wallet.balance}</div>
          <div className="sub">Settled earnings available for withdrawal</div>
        </div>
        <div className="kpi">
          <div className="label">COD Pending</div>
          <div className="value" style={{ color: wallet.blocked ? "var(--brand-red)" : "var(--amber)" }}>₹{wallet.cod_pending}</div>
          <div className="sub">Of ₹{wallet.cod_limit} limit · {wallet.blocked ? "Blocked from new COD" : "Within limit"}</div>
        </div>
        <div className="kpi">
          <div className="label">Transactions</div>
          <div className="value">{wallet.transactions.length}</div>
          <div className="sub">Last 50 entries</div>
        </div>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead>
            <tr><th>Type</th><th>Description</th><th className="text-right">Amount</th><th>Time</th></tr>
          </thead>
          <tbody>
            {wallet.transactions.map(t => (
              <tr key={t.id} data-testid={`wallet-txn-${t.id}`}>
                <td>
                  <span className={`pill ${t.type === "CREDIT" ? "pill-green" : "pill-amber"}`}>{t.type}</span>
                </td>
                <td className="text-[13px]">{t.label}</td>
                <td className="text-right mono font-semibold" style={{ color: t.type === "CREDIT" ? "var(--green)" : "var(--amber)" }}>
                  {t.type === "CREDIT" ? "+" : "−"}₹{t.amount}
                </td>
                <td className="mono text-[11px] text-[var(--slate-400)]">{(t.ts || "").slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {wallet.transactions.length === 0 && (
              <tr><td colSpan={4} className="empty">No transactions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CodTab({ cod, riderId, reload }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function deposit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    try {
      await api.post(`/riders/${riderId}/cod-deposit`, { rider_id: riderId, amount: amt, hub_id: "manual", note });
      toast.success(`COD handover ₹${amt} recorded`);
      setAmount(""); setNote("");
      reload();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to record handover");
    }
  }

  return (
    <div className="space-y-4" data-testid="cod-tab">
      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-3">Record COD Handover</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" className="input mono" data-testid="cod-amount-input" />
          </div>
          <div className="flex-1">
            <label className="label">Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…" className="input" data-testid="cod-note-input" />
          </div>
          <button onClick={deposit} className="btn-primary" data-testid="record-cod-btn">Record Handover</button>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)] flex justify-between items-center">
          <h3 className="text-[14px] font-semibold">Handover History</h3>
          <span className="text-[12px] text-[var(--slate-600)]">Total handed over: <span className="mono font-semibold text-[var(--green)]">₹{cod.total}</span></span>
        </div>
        <table className="tbl">
          <thead>
            <tr><th>Date</th><th>Amount</th><th>Hub</th><th>Note</th></tr>
          </thead>
          <tbody>
            {cod.deposits.map(d => (
              <tr key={d.id} data-testid={`cod-deposit-${d.id}`}>
                <td className="mono text-[12px]">{(d.ts || "").slice(0, 16).replace("T", " ")}</td>
                <td className="mono font-semibold text-[var(--green)]">₹{d.amount}</td>
                <td className="text-[12px]">{d.hub_id || "—"}</td>
                <td className="text-[12px] text-[var(--slate-600)]">{d.note || "—"}</td>
              </tr>
            ))}
            {cod.deposits.length === 0 && <tr><td colSpan={4} className="empty">No deposits recorded</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PerformanceTab({ perf }) {
  if (!perf) return <div className="empty">Loading…</div>;
  return (
    <div className="space-y-4" data-testid="performance-tab">
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Completion Rate" value={`${perf.completion_rate}%`} bar={perf.completion_rate} color="var(--green)" />
        <Metric label="On-time Rate" value={`${perf.on_time_rate}%`} bar={perf.on_time_rate} color="var(--blue)" />
        <Metric label="Rating" value={`★ ${perf.rating}`} bar={(perf.rating / 5) * 100} color="var(--amber)" />
        <Metric label="Failures" value={perf.failed} bar={perf.total_orders ? (perf.failed / perf.total_orders) * 100 : 0} color="var(--brand-red)" />
      </div>
      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-3">Order Breakdown</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <BreakdownItem label="Total" value={perf.total_orders} color="var(--slate-600)" />
          <BreakdownItem label="Delivered" value={perf.delivered} color="var(--green)" />
          <BreakdownItem label="In Progress" value={perf.in_progress} color="var(--blue)" />
          <BreakdownItem label="Failed/Returned" value={perf.failed} color="var(--brand-red)" />
        </div>
      </div>
      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-1">Total Earnings</h3>
        <p className="text-[12px] text-[var(--slate-600)] mb-3">Calculated at 18% commission on delivered fare.</p>
        <div className="text-3xl font-semibold mono" style={{ color: "var(--green)" }}>₹{perf.total_earnings}</div>
      </div>
    </div>
  );
}

function Metric({ label, value, bar, color }) {
  return (
    <div className="kpi">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
      <div className="mt-2 h-1.5 bg-[var(--slate-100)] rounded-full overflow-hidden">
        <div style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: color }} className="h-full transition-all" />
      </div>
    </div>
  );
}

function BreakdownItem({ label, value, color }) {
  return (
    <div>
      <div className="text-3xl font-semibold" style={{ fontFamily: "Outfit", color }}>{value}</div>
      <div className="text-[11px] uppercase tracking-wider text-[var(--slate-400)] mt-1">{label}</div>
    </div>
  );
}

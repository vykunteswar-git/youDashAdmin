import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { toast } from "sonner";
import AppLoadingScreen from "@/components/AppLoadingScreen";
import {
  ArrowLeft, Phone, MapPin, Bike, Star, Wallet, Banknote,
  CheckCircle2, Package, TrendingUp, Ban, ShieldCheck, Pencil, X, Trash2,
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
  const [editOpen, setEditOpen] = useState(false);
  const [limitEdit, setLimitEdit] = useState("");
  const [savingLimit, setSavingLimit] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function loadAll() {
    const [r, o, w, c, p] = await Promise.all([
      api.get(`/riders/${id}`),
      api.get(`/riders/${id}/orders`),
      api.get(`/riders/${id}/wallet`),
      api.get(`/riders/${id}/cod-deposits`),
      api.get(`/riders/${id}/performance`),
    ]);
    setRider(r.data);
    setOrders(o.data.orders || []);
    setWallet(w.data);
    setCod(c.data || { deposits: [], total: 0 });
    setPerf(p.data);
    setLimitEdit(String(r.data?.cod_limit ?? ""));
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

  async function confirmDelete() {
    try {
      const res = await api.delete(`/riders/${id}`);
      if (res?.data?.success === false) {
        toast.error(res.data.message || "Delete failed");
        setDeleting(false);
        return;
      }
      toast.success(`Rider "${rider.name}" deleted`);
      nav("/riders");
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed");
      setDeleting(false);
    }
  }

  async function saveHandoverLimit() {
    const limit = Number(String(limitEdit).trim());
    if (!Number.isFinite(limit) || limit <= 0) {
      toast.error("Enter a valid handover limit");
      return;
    }
    setSavingLimit(true);
    try {
      await api.patch(`/riders/${id}/handover-limit`, { cod_handover_limit: limit });
      toast.success("COD handover limit updated");
      setEditOpen(false);
      loadAll();
    } catch (e) {
      toast.error(e.response?.data?.message || e.response?.data?.detail || "Failed to update limit");
    } finally {
      setSavingLimit(false);
    }
  }

  if (!rider) return <AppLoadingScreen message="Loading rider…" testId="rider-loading" />;

  return (
    <div data-testid="rider-detail-page">
      <button onClick={() => nav("/riders")} className="text-[12px] text-[var(--slate-600)] hover:text-[var(--brand-red)] mb-3 flex items-center gap-1" data-testid="back-to-riders">
        <ArrowLeft size={13} /> Back to Riders
      </button>

      <div className="surface p-5 mb-5" data-testid="rider-header">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <img src={rider.avatar} alt="" className="w-16 h-16 rounded-full border-2 border-[var(--border-default)] object-cover"
              onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(rider.name)}`; }} />
            <div>
              <div className="flex items-center gap-3 flex-wrap">
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
                <span className="flex items-center gap-1"><Star size={12} className="text-[var(--amber)]" /> <span className="mono">{rider.rating ?? "—"}</span></span>
                <span className="mono text-zinc-400">#{rider.id}{rider.public_id ? ` · ${rider.public_id}` : ""}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap" data-testid="rider-header-actions">
            <button onClick={() => { setLimitEdit(String(rider.cod_limit ?? "")); setEditOpen(true); }}
              className="chip" data-testid="edit-rider-btn">
              <Pencil size={12} /> Edit COD limit
            </button>
            {rider.status === "PENDING" && (
              <>
                <button onClick={approve} className="btn-primary" data-testid="approve-rider-detail">Approve</button>
                <button onClick={reject} className="btn-secondary" data-testid="reject-rider-detail">Reject</button>
              </>
            )}
            <button onClick={() => setDeleting(true)} className="chip chip-danger" data-testid="delete-rider-btn">
              <Trash2 size={12} /> Delete rider
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-3 mt-5 pt-5 border-t border-[var(--border-default)]">
          <Stat icon={Package} label="Delivered" value={perf?.total_orders ?? rider.total_orders_delivered ?? "—"} testid="stat-total-orders" />
          <Stat icon={CheckCircle2} label="Net available" value={`₹${rider.wallet_net_available ?? rider.wallet_balance ?? 0}`} accent="green" testid="stat-delivered" />
          <Stat icon={Wallet} label="Wallet balance" value={`₹${rider.wallet_balance ?? 0}`} accent="blue" testid="stat-wallet" />
          <Stat icon={Banknote} label="COD pending" value={`₹${rider.cod_pending ?? 0} / ₹${rider.cod_limit ?? 0}`} accent={rider.blocked ? "red" : "amber"} testid="stat-cod" />
          <Stat icon={TrendingUp} label="Total earnings" value={`₹${perf?.total_earnings ?? rider.wallet_total_earnings ?? 0}`} accent="green" testid="stat-earnings" />
        </div>
      </div>

      <div className="tabbar mb-4">
        {TABS.map(t => (
          <button key={t.id} className={tab === t.id ? "active" : ""} onClick={() => setTab(t.id)} data-testid={`rider-tab-${t.id}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "profile" && <ProfileTab rider={rider} />}
      {tab === "orders" && <OrdersTab orders={orders} nav={nav} />}
      {tab === "wallet" && <WalletTab wallet={wallet} />}
      {tab === "cod" && <CodTab cod={cod} riderId={id} reload={loadAll} />}
      {tab === "performance" && <PerformanceTab perf={perf} />}

      {deleting && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="surface w-[420px] p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </span>
              <div>
                <h3 className="text-base font-semibold" style={{ fontFamily: "Outfit" }}>Delete rider?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">{rider.phone}</p>
              </div>
            </div>
            <p className="text-sm text-zinc-600 mb-1">
              You are about to permanently delete <span className="font-semibold">{rider.name}</span>.
            </p>
            <p className="text-xs text-zinc-400 mb-5">
              This will fail if the rider has any active orders. All historical data will be removed.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleting(false)} className="btn-secondary">Cancel</button>
              <button onClick={confirmDelete} className="btn-danger" data-testid="confirm-delete-rider">
                <Trash2 size={13} /> Delete permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {editOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center" data-testid="edit-rider-modal">
          <div className="surface w-[400px] p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold" style={{ fontFamily: "Outfit" }}>Edit rider — COD handover limit</h3>
              <button onClick={() => setEditOpen(false)}><X size={16} /></button>
            </div>
            <p className="text-[12px] text-zinc-500 mb-3">
              Updates via <span className="mono">PATCH /admin/cod/riders/{id}/handover-limit</span> (same as zone_setup).
            </p>
            <label className="label">Handover limit (₹)</label>
            <input type="number" value={limitEdit} onChange={(e) => setLimitEdit(e.target.value)}
              className="input mono w-full mb-4" data-testid="handover-limit-input" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditOpen(false)} className="chip">Cancel</button>
              <button onClick={saveHandoverLimit} disabled={savingLimit} className="btn-primary" data-testid="save-handover-limit">
                {savingLimit ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, accent = "slate", testid }) {
  const colorMap = { green: "var(--green)", red: "var(--brand-red)", amber: "var(--amber)", blue: "var(--blue)", slate: "var(--slate-600)" };
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
  const joined = rider.joined_at ? new Date(rider.joined_at).toLocaleDateString() : "—";
  return (
    <div className="space-y-4" data-testid="profile-tab">
      <div className="grid grid-cols-2 gap-4">
        <div className="surface p-5">
          <h3 className="text-[14px] font-semibold mb-4">Personal details</h3>
          <Row label="Full name" value={rider.name} />
          <Row label="Phone" value={rider.phone} mono />
          <Row label="City / zone" value={rider.city} />
          <Row label="Vehicle number" value={rider.vehicle_number || "—"} mono />
          <Row label="Joined" value={joined} mono />
          <Row label="Rating" value={rider.rating ?? "—"} mono />
          <Row label="Available" value={rider.isAvailable ? "Yes" : "No"} />
        </div>
        <div className="surface p-5">
          <h3 className="text-[14px] font-semibold mb-4">Emergency contact</h3>
          <Row label="Name" value={rider.emergency_contact_name || "Not provided"} />
          <Row label="Phone" value={rider.emergency_contact_phone || "—"} mono />
          <Row label="Relation" value={rider.emergency_contact_relation || "—"} />
        </div>
      </div>

      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-4">Vehicle information</h3>
        <div className="grid grid-cols-2 gap-3">
          <Row label="Vehicle type" value={rider.vehicle_type} />
          <Row label="Vehicle model" value={rider.vehicle_model || "—"} />
          <Row label="Vehicle number" value={rider.vehicle_number || "—"} mono />
          <Row label="Registration state" value={rider.vehicle_state || "—"} />
        </div>
      </div>

      <div className="surface p-5">
        <h3 className="text-[14px] font-semibold mb-4 flex items-center gap-2">
          <ShieldCheck size={14} className="text-[var(--green)]" /> Onboarding documents
        </h3>
        {(rider.kyc_documents || []).length === 0 ? (
          <div className="empty">No KYC document URLs returned by the API for this rider.</div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {rider.kyc_documents.map((doc) => (
              <KycDocCard key={doc.key} doc={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KycDocCard({ doc }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="border border-[var(--slate-100)] rounded-sm overflow-hidden" data-testid={`kyc-doc-${doc.key}`}>
      <div className="text-[10px] uppercase tracking-wider text-[var(--slate-500)] px-2 py-1 bg-[var(--slate-50)] flex justify-between items-center gap-2">
        <span>{doc.label}</span>
        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--brand-red)]">Open</a>
      </div>
      {!failed ? (
        <a href={doc.url} target="_blank" rel="noopener noreferrer">
          <img src={doc.url} alt={doc.label} className="w-full h-40 object-cover bg-[var(--slate-50)]"
            onError={() => setFailed(true)} />
        </a>
      ) : (
        <div className="h-40 flex items-center justify-center text-[12px] text-zinc-500 px-3 text-center bg-zinc-50">
          Could not load image — <a href={doc.url} className="text-[var(--brand-red)] underline" target="_blank" rel="noreferrer">open URL</a>
        </div>
      )}
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
  if (!wallet) return <AppLoadingScreen message="Loading wallet…" variant="inline" testId="rider-wallet-loading" />;
  const txs = wallet.transactions || [];
  return (
    <div className="space-y-4" data-testid="wallet-tab">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="kpi">
          <div className="label">Balance</div>
          <div className="value" style={{ color: "var(--blue)" }}>₹{wallet.balance}</div>
        </div>
        <div className="kpi">
          <div className="label">Net available</div>
          <div className="value" style={{ color: "var(--green)" }}>₹{wallet.net_available ?? wallet.balance}</div>
        </div>
        <div className="kpi">
          <div className="label">Withdrawal pending</div>
          <div className="value" style={{ color: "var(--amber)" }}>₹{wallet.withdrawal_pending ?? 0}</div>
        </div>
        <div className="kpi">
          <div className="label">COD pending</div>
          <div className="value" style={{ color: wallet.blocked ? "var(--brand-red)" : "var(--amber)" }}>₹{wallet.cod_pending}</div>
        </div>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Type</th><th>Description</th><th className="text-right">Amount</th><th>Time</th></tr></thead>
          <tbody>
            {txs.map(t => (
              <tr key={t.id} data-testid={`wallet-txn-${t.id}`}>
                <td><span className={`pill ${t.type === "CREDIT" ? "pill-green" : "pill-amber"}`}>{t.type}</span></td>
                <td className="text-[13px]">{t.label}{t.status && t.status !== "COMPLETED" ? ` (${t.status})` : ""}</td>
                <td className="text-right mono font-semibold">{t.type === "CREDIT" ? "+" : "−"}₹{t.amount}</td>
                <td className="mono text-[11px] text-[var(--slate-400)]">{(t.ts || "").slice(0, 16).replace("T", " ")}</td>
              </tr>
            ))}
            {txs.length === 0 && <tr><td colSpan={4} className="empty">No transactions yet</td></tr>}
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
        <h3 className="text-[14px] font-semibold mb-3">Record COD handover</h3>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <label className="label">Amount (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input mono" data-testid="cod-amount-input" />
          </div>
          <div className="flex-1">
            <label className="label">Note</label>
            <input value={note} onChange={e => setNote(e.target.value)} className="input" data-testid="cod-note-input" />
          </div>
          <button onClick={deposit} className="btn-primary" data-testid="record-cod-btn">Record</button>
        </div>
      </div>
      <div className="surface overflow-hidden">
        <table className="tbl">
          <thead><tr><th>Date</th><th>Amount</th><th>Hub</th><th>Note</th></tr></thead>
          <tbody>
            {cod.deposits.map(d => (
              <tr key={d.id} data-testid={`cod-deposit-${d.id}`}>
                <td className="mono text-[12px]">{(d.ts || "").slice(0, 16).replace("T", " ")}</td>
                <td className="mono font-semibold text-[var(--green)]">₹{d.amount}</td>
                <td>{d.hub_id || "—"}</td>
                <td>{d.note || "—"}</td>
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
  if (!perf) return <AppLoadingScreen message="Loading performance…" variant="inline" testId="rider-performance-loading" />;
  return (
    <div className="space-y-4" data-testid="performance-tab">
      <div className="grid grid-cols-4 gap-3">
        <Metric label="Completion Rate" value={`${perf.completion_rate}%`} bar={perf.completion_rate} color="var(--green)" />
        <Metric label="On-time Rate" value={`${perf.on_time_rate}%`} bar={perf.on_time_rate} color="var(--blue)" />
        <Metric label="Rating" value={`★ ${perf.rating}`} bar={(perf.rating / 5) * 100} color="var(--amber)" />
        <Metric label="Failures" value={perf.failed} bar={perf.total_orders ? (perf.failed / perf.total_orders) * 100 : 0} color="var(--brand-red)" />
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
        <div style={{ width: `${Math.min(100, Math.max(0, bar))}%`, background: color }} className="h-full" />
      </div>
    </div>
  );
}

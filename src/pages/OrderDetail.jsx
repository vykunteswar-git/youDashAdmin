import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import StatusPill from "@/components/StatusPill";
import { milestonesFor, EXCEPTION_STATUSES } from "@/lib/status";
import { formatStatusLabel, getOutstationPrimaryNextStatus } from "@/lib/orderStatusUtils";
import AssignRiderModal from "@/components/modals/AssignRiderModal";
import OtpModal from "@/components/modals/OtpModal";
import { toast } from "sonner";
import { ChevronLeft, Phone, BellRing, ArrowRight, Truck, Package, Coins, Activity as ActivityIcon, Copy } from "lucide-react";

export default function OrderDetail() {
  const { id } = useParams();
  const [o, setO] = useState(null);
  const [activity, setActivity] = useState([]);
  const [tab, setTab] = useState("overview");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignRole, setAssignRole] = useState("pickup");
  const [otpOpen, setOtpOpen] = useState(false);
  const [otpAction, setOtpAction] = useState({ label: "", status: "", needsCod: false, handoverType: null });

  async function load() {
    const [a, b] = await Promise.all([
      api.get(`/orders/${id}`),
      api.get(`/orders/${id}/activity`),
    ]);
    setO(a.data);
    setActivity(b.data.activity);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (!o) return <div className="p-10 text-zinc-500" data-testid="order-loading">Loading order…</div>;

  async function advance(status, opts = {}) {
    try {
      await api.post(`/orders/${id}/status`, { status, ...opts });
      toast.success(`Status → ${status}`);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed");
    }
  }

  async function notifyCustomer() {
    await api.post(`/orders/${id}/notify`, { channel: "both" });
    toast.success("Customer notified");
    load();
  }

  const milestones = milestonesFor(o.delivery_type);
  const currentIdx = milestones.indexOf(o.status);

  const primaryNext = getOutstationPrimaryNextStatus(o);
  const reco = {
    title: primaryNext ? formatStatusLabel(primaryNext) : o.recommendation?.title,
    detail: primaryNext
      ? `Recommended next step in the delivery flow.`
      : o.recommendation?.detail,
  };
  const isException = EXCEPTION_STATUSES.includes(o.status);

  function openOtp(label, status, needsCod = false, handoverType = null) {
    setOtpAction({ label, status, needsCod, handoverType });
    setOtpOpen(true);
  }

  function openAssign(role) {
    setAssignRole(role);
    setAssignOpen(true);
  }

  function renderPrimaryAction() {
    if (isException) {
      return <span className="text-[12px] text-zinc-400">No standard action available — order is in {o.status}.</span>;
    }
    switch (o.status) {
      case "BOOKED":
        if (o.delivery_type === "HUB_TO_DOOR") {
          return <ActionBtn label="Confirm hub drop-off"
            onClick={() => openOtp("Confirm hub drop-off", "AT_ORIGIN_HUB", o.payment_mode === "COD" && !o.cod_already_collected, "DROP")} />;
        }
        return <ActionBtn label="Assign pickup rider" onClick={() => openAssign("pickup")} />;
      case "RIDER_ASSIGNED":
        return <ActionBtn label="Confirm pickup"
          onClick={() => openOtp("Confirm pickup", "PICKED_UP", o.payment_mode === "COD" && !o.cod_already_collected)} />;
      case "PICKED_UP":
        return <ActionBtn label="Mark arrived at origin hub" onClick={() => advance("AT_ORIGIN_HUB")} />;
      case "AT_ORIGIN_HUB":
        return <ActionBtn label="Mark in transit" onClick={() => advance("IN_TRANSIT")} />;
      case "IN_TRANSIT":
        return <ActionBtn label="Mark arrived at destination hub" onClick={() => advance("AT_DESTINATION_HUB")} />;
      case "AT_DESTINATION_HUB":
        if (o.delivery_type === "DOOR_TO_HUB") {
          return <ActionBtn label="Mark awaiting hub collection" onClick={() => advance("AWAITING_HUB_COLLECTION")} />;
        }
        return (
          <div className="space-y-2">
            <ActionBtn label="Assign delivery rider" onClick={() => openAssign("delivery")} />
            <ActionBtn label="Mark as Delivered" onClick={() => openOtp("Mark as Delivered", "DELIVERED")} variant="secondary" />
          </div>
        );
      case "OUT_FOR_DELIVERY":
        return <ActionBtn label="Confirm delivery" onClick={() => openOtp("Confirm delivery", "DELIVERED")} />;
      case "AWAITING_HUB_COLLECTION":
        return <ActionBtn label="Confirm hub collection" onClick={() => openOtp("Confirm collection", "COLLECTED", false, "COLLECT")} />;
      default:
        return null;
    }
  }

  return (
    <div data-testid="order-detail-page">
      <Link to="/orders" className="inline-flex items-center text-[12px] text-zinc-500 hover:text-zinc-900 mb-3" data-testid="back-orders">
        <ChevronLeft size={14} /> Back to orders
      </Link>

      <PageHeader
        title={
          <span className="mono flex items-center gap-2">
            {o.tracking_id}
            <button type="button"
              onClick={() => { navigator.clipboard.writeText(o.tracking_id); toast.success("Copied!"); }}
              className="text-zinc-300 hover:text-zinc-600 transition"
              title="Copy order ID"
            >
              <Copy size={14} />
            </button>
          </span>
        }
        subtitle={`${o.origin_city} → ${o.destination_city} · ${o.delivery_type.replaceAll("_", " → ")}`}
        actions={
          <div className="flex gap-2 items-center">
            <StatusPill status={o.status} testid="header-status" />
            <button onClick={notifyCustomer} className="chip" data-testid="notify-customer">
              <BellRing size={12} /> Notify customer
            </button>
          </div>
        }
      />

      {/* Milestone */}
      <div className="surface p-5 mb-4">
        <div className="milestone" data-testid="milestone-bar">
          {milestones.map((m, i) => (
            <div key={m} className={`milestone-step ${i < currentIdx ? "done" : i === currentIdx ? "current" : ""}`}>
              <div className="bar" />
              <div className="label">{m.replaceAll("_", " ")}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        {/* Recommendation card */}
        <div className="reco col-span-1" data-testid="recommendation-card">
          <div className="label">Next Action</div>
          <h3>{reco.title}</h3>
          <p>{reco.detail}</p>
          <div className="mt-4">{renderPrimaryAction()}</div>
          {!isException && (
            <div className="mt-3 text-[11px] text-zinc-400">
              OTP for testing: <span className="mono text-zinc-200">pickup {o.otp_pickup} · delivery {o.otp_delivery} · hub-drop {o.otp_hub_drop} · hub-collect {o.otp_hub_collect}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="col-span-2 surface">
          <div className="tabbar px-4">
            {[
              { k: "overview", icon: ActivityIcon, label: "Overview" },
              { k: "package", icon: Package, label: "Package & Order" },
              { k: "financials", icon: Coins, label: "Financials" },
              { k: "activity", icon: Truck, label: "Activity" },
            ].map(t => (
              <button key={t.k} className={tab === t.k ? "active" : ""} onClick={() => setTab(t.k)} data-testid={`tab-${t.k}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">
            {tab === "overview" && <OverviewTab o={o} activity={activity} />}
            {tab === "package" && <PackageTab o={o} />}
            {tab === "financials" && <FinancialsTab o={o} />}
            {tab === "activity" && <ActivityTab activity={activity} />}
          </div>
        </div>
      </div>

      {/* Exception zone */}
      <div className="surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[14px]" style={{ fontFamily: "Outfit" }}>Exception actions</h3>
            <p className="text-[12px] text-zinc-500">Cancel, fail or initiate return — allowed at any status.</p>
          </div>
          <div className="flex gap-2">
            {EXCEPTION_STATUSES.map(s => (
              <button key={s} onClick={() => advance(s, { note: "Admin exception" })}
                data-testid={`exception-${s}`}
                className="chip">{s.replaceAll("_", " ")}</button>
            ))}
          </div>
        </div>
      </div>

      <AssignRiderModal open={assignOpen} onOpenChange={setAssignOpen} orderId={id} role={assignRole} onAssigned={load} />
      <OtpModal open={otpOpen} onOpenChange={setOtpOpen} orderId={id}
        action={otpAction.label} targetStatus={otpAction.status} requiresCod={otpAction.needsCod}
        handoverType={otpAction.handoverType}
        onDone={load} />
    </div>
  );
}

function ActionBtn({ label, onClick, variant = "primary" }) {
  const base = "w-full text-[13px] font-medium py-2.5 rounded-sm flex items-center justify-center gap-2";
  const styles = variant === "secondary"
    ? `${base} bg-white/10 text-zinc-300 hover:bg-white/20 border border-white/20`
    : `${base} bg-white text-black hover:bg-zinc-100`;
  return (
    <button onClick={onClick} className={styles} data-testid="primary-action-btn">
      {label} <ArrowRight size={14} />
    </button>
  );
}

function OverviewTab({ o, activity }) {
  return (
    <div className="grid grid-cols-2 gap-5 text-[13px]">
      <div>
        <Section title="Pickup">
          <div>{o.sender.name}</div>
          <div className="text-zinc-500">{o.sender.phone}</div>
          <div className="text-zinc-500 mt-1">{o.sender.address}</div>
        </Section>
        <Section title="Delivery">
          <div>{o.receiver.name}</div>
          <div className="text-zinc-500">{o.receiver.phone}</div>
          <div className="text-zinc-500 mt-1">{o.receiver.address}</div>
        </Section>
      </div>
      <div>
        <Section title="Riders">
          {o.pickup_rider ? (
            <div className="mb-2"><span className="text-zinc-500">Pickup:</span> {o.pickup_rider.name} · <Phone size={11} className="inline" /> <span className="mono">{o.pickup_rider.phone}</span></div>
          ) : <div className="text-zinc-400">No pickup rider assigned</div>}
          {o.delivery_rider ? (
            <div><span className="text-zinc-500">Delivery:</span> {o.delivery_rider.name} · <span className="mono">{o.delivery_rider.phone}</span></div>
          ) : <div className="text-zinc-400">No delivery rider assigned</div>}
        </Section>
        <Section title="Recent activity">
          {activity.slice(0, 5).map(a => (
            <div key={a.id} className="text-[12px] text-zinc-600 py-0.5">
              <span className="mono text-[11px] text-zinc-400">{new Date(a.ts).toLocaleString()}</span> — {a.detail}
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function PackageTab({ o }) {
  return (
    <div className="grid grid-cols-2 gap-5 text-[13px]">
      <Section title="Parcel">
        <Row k="Category" v={o.category} />
        <Row k="Weight" v={`${o.weight_kg} kg`} />
        <Row k="Dimensions" v={o.dimensions} />
        <Row k="Fragile" v={o.fragile ? "Yes" : "No"} />
        <Row k="Delivery type" v={o.delivery_type.replaceAll("_", " → ")} />
      </Section>
      <Section title="Hubs & slot">
        <Row k="Origin city" v={o.origin_city} />
        <Row k="Destination city" v={o.destination_city} />
        <Row k="Distance" v={`${o.distance_km} km`} />
        <Row k="Slot" v={o.slot || "—"} />
        <Row k="Expected delivery" v={o.expected_delivery ? new Date(o.expected_delivery).toLocaleString() : "—"} />
      </Section>
    </div>
  );
}

function FinancialsTab({ o }) {
  const f = o.fare;
  return (
    <div className="text-[13px]">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Section title="Fare breakdown">
            <Row k="Pickup leg" v={`₹${f.pickup_leg}`} mono />
            <Row k="Corridor" v={`₹${f.corridor}`} mono />
            <Row k="Drop leg" v={`₹${f.drop_leg}`} mono />
            <Row k="Weight surcharge" v={`₹${f.weight_surcharge}`} mono />
            <hr className="my-2" />
            <Row k="Subtotal" v={`₹${f.subtotal}`} mono />
            <Row k="Platform fee" v={`₹${f.platform_fee}`} mono />
            <Row k="GST (18%)" v={`₹${f.gst}`} mono />
            <hr className="my-2" />
            <Row k="Total" v={`₹${f.total}`} mono bold />
          </Section>
        </div>
        <div>
          <Section title="Payment">
            <Row k="Mode" v={o.payment_mode} />
            {o.payment_mode === "COD" && (
              <>
                <Row k="COD collected" v={o.cod_already_collected ? "✓ Collected" : "✗ Pending"} />
                <Row k="Collection mode" v={o.cod_mode || "—"} />
              </>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function ActivityTab({ activity }) {
  return (
    <div className="space-y-2 max-h-[400px] overflow-y-auto" data-testid="activity-log">
      {activity.map(a => (
        <div key={a.id} className="flex gap-3 text-[12px] py-2 border-b border-[var(--border-default)]">
          <div className="mono text-[11px] text-zinc-400 w-36 shrink-0">{new Date(a.ts).toLocaleString()}</div>
          <div className="flex-1">
            <div className="font-medium">{a.event}</div>
            <div className="text-zinc-500">{a.detail}</div>
          </div>
          <div className="text-[11px] text-zinc-500">{a.actor}</div>
        </div>
      ))}
      {activity.length === 0 && <div className="empty">No activity yet.</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">{title}</div>
      {children}
    </div>
  );
}
function Row({ k, v, mono = false, bold = false }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-zinc-500">{k}</span>
      <span className={`${mono ? "mono" : ""} ${bold ? "font-semibold" : ""}`}>{v}</span>
    </div>
  );
}

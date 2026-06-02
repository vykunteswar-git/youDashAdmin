import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Calculator, Truck, CheckCircle2, ChevronRight } from "lucide-react";

const PAYMENT_MODES = [
  { value: "ONLINE", label: "Online" },
  { value: "COD_CASH", label: "COD Cash" },
  { value: "COD_QR", label: "COD QR" },
];

const DELIVERY_TYPES = [
  { value: "DOOR_TO_DOOR", label: "Door to Door", desc: "Pickup from sender · Drop to receiver" },
  { value: "DOOR_TO_HUB", label: "Door to Hub", desc: "Pickup from sender · Receiver collects" },
  { value: "HUB_TO_DOOR", label: "Hub to Door", desc: "Sender drops at hub · Drop to receiver" },
];

export default function FareCalculator() {
  const [vehicles, setVehicles] = useState([]);
  const [cfg, setCfg] = useState(null);
  const [commission, setCommission] = useState(null);
  const [loading, setLoading] = useState(true);

  const [serviceType, setServiceType] = useState("IN_CITY");
  const [vehicleId, setVehicleId] = useState("");
  const [deliveryType, setDeliveryType] = useState("DOOR_TO_DOOR");
  const [distance, setDistance] = useState("");
  const [pickupKm, setPickupKm] = useState("");
  const [dropKm, setDropKm] = useState("");
  const [weight, setWeight] = useState("");
  const [paymentMode, setPaymentMode] = useState("ONLINE");
  const [result, setResult] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [vr, cr, comr] = await Promise.all([
          api.get("/vehicles"),
          api.get("/config/app"),
          api.get("/config/commission"),
        ]);
        const active = (vr.data?.vehicles ?? []).filter(v => v.active);
        setVehicles(active);
        setCfg(cr.data);
        setCommission(comr.data);
        if (active.length) setVehicleId(String(active[0].id));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function resolveWeightTierRate(tiers, weightKg, fallback) {
    if (!tiers?.length) return Number(fallback) || 0;
    const match = tiers.filter(t => t.isActive).find(t => weightKg >= t.minWeightKg && weightKg <= t.maxWeightKg);
    return match ? match.ratePerKm : (Number(fallback) || 0);
  }

  function resetResult() { setResult(null); }

  function calculate() {
    const vehicle = vehicles.find(v => String(v.id) === vehicleId);
    if (!vehicle || !cfg || !commission) return;

    const dist = parseFloat(distance) || 0;
    const wt = parseFloat(weight) || 0;
    const pKm = parseFloat(pickupKm) || 0;
    const dKm = parseFloat(dropKm) || 0;

    const commissionPct =
      paymentMode === "ONLINE" ? commission.online_pct
      : paymentMode === "COD_CASH" ? commission.cod_cash_pct
      : commission.cod_qr_pct;

    if (serviceType === "IN_CITY") {
      const billableKm = Math.max(dist, vehicle.min_distance || 0);
      const baseFare = Number(vehicle.base_fare) || 0;
      const distCharge = billableKm * (Number(vehicle.per_km) || 0);
      const weightCharge = wt * (Number(cfg.perKgRate) || 0);
      const subtotal = baseFare + distCharge + weightCharge;
      const gstAmt = subtotal * ((Number(cfg.gstPercent) || 0) / 100);
      const platFee = Number(cfg.incityPlatformFee) || 0;
      const customerTotal = subtotal + gstAmt + platFee;
      const commAmt = customerTotal * (commissionPct / 100);
      const riderPayout = customerTotal - commAmt;

      const rows = [
        { label: "Base Fare", note: `Flat rate for ${vehicle.name}`, amount: baseFare },
        {
          label: "Distance Charge",
          note: `${billableKm} km × ₹${vehicle.per_km}/km${dist < (vehicle.min_distance || 0) ? ` (min ${vehicle.min_distance} km applied)` : ""}`,
          amount: distCharge,
        },
        ...(wt > 0 ? [{ label: "Weight Surcharge", note: `${wt} kg × ₹${cfg.perKgRate}/kg`, amount: weightCharge }] : []),
      ];

      setResult({ serviceType, deliveryType: null, vehicle, paymentMode, commissionPct, rows, subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee, customerTotal, commissionAmount: commAmt, riderPayout });

    } else {
      const includePickup = deliveryType === "DOOR_TO_DOOR" || deliveryType === "DOOR_TO_HUB";
      const includeDrop = deliveryType === "DOOR_TO_DOOR" || deliveryType === "HUB_TO_DOOR";

      const pickupRate = resolveWeightTierRate(cfg.pickupLegTiers, wt, cfg.pickupRatePerKm);
      const dropRate = resolveWeightTierRate(cfg.dropLegTiers, wt, cfg.dropRatePerKm);
      const corridorRate = Number(cfg.defaultRouteRatePerKm) || 0;

      const pickupCost = includePickup ? pKm * pickupRate : 0;
      const corridorCost = dist * corridorRate;
      const dropCost = includeDrop ? dKm * dropRate : 0;
      const weightCharge = wt * (Number(cfg.perKgRate) || 0);
      const subtotal = pickupCost + corridorCost + dropCost + weightCharge;
      const gstAmt = subtotal * ((Number(cfg.gstPercent) || 0) / 100);
      const platFee = Number(cfg.outstationPlatformFee) || 0;
      const customerTotal = subtotal + gstAmt + platFee;
      const commAmt = customerTotal * (commissionPct / 100);
      const riderPayout = customerTotal - commAmt;

      const rows = [
        ...(includePickup ? [{ label: "Pickup Leg", note: `${pKm} km × ₹${pickupRate}/km (first mile)`, amount: pickupCost }] : []),
        { label: "Hub-to-Hub Corridor", note: `${dist} km × ₹${corridorRate}/km (zone rate)`, amount: corridorCost },
        ...(includeDrop ? [{ label: "Drop Leg", note: `${dKm} km × ₹${dropRate}/km (last mile)`, amount: dropCost }] : []),
        ...(wt > 0 ? [{ label: "Weight Surcharge", note: `${wt} kg × ₹${cfg.perKgRate}/kg`, amount: weightCharge }] : []),
      ];

      setResult({ serviceType, deliveryType, vehicle, paymentMode, commissionPct, rows, subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee, customerTotal, commissionAmount: commAmt, riderPayout });
    }
  }

  const selectedVehicle = vehicles.find(v => String(v.id) === vehicleId);

  if (loading) {
    return (
      <div data-testid="fare-calculator-page">
        <PageHeader title="Fare Calculator" subtitle="Simulate full fare breakdown for any trip" />
        <div className="surface p-10 flex items-center justify-center">
          <div className="text-[13px] text-zinc-500">Loading config…</div>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="fare-calculator-page">
      <PageHeader title="Fare Calculator" subtitle="Simulate full fare breakdown for any trip" />

      <div className="grid grid-cols-[400px_1fr] gap-5 items-start">

        {/* ── LEFT PANEL: Inputs ── */}
        <div className="space-y-4">

          {/* Service Type */}
          <section className="surface p-5">
            <SectionLabel>Service Type</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {["IN_CITY", "OUTSTATION"].map(t => (
                <button key={t} type="button"
                  onClick={() => { setServiceType(t); resetResult(); }}
                  className={`h-11 rounded-sm border text-[13px] font-semibold transition ${serviceType === t ? "bg-zinc-900 text-white border-zinc-900" : "border-[var(--border-default)] text-zinc-700 hover:border-zinc-400"}`}
                  data-testid={`service-${t}`}
                >
                  {t === "IN_CITY" ? "In-City Local" : "Outstation"}
                </button>
              ))}
            </div>
          </section>

          {/* Vehicle */}
          <section className="surface p-5">
            <SectionLabel>Vehicle</SectionLabel>
            <div className="space-y-2 mt-3">
              {vehicles.length === 0 && <div className="empty">No active vehicles</div>}
              {vehicles.map(v => (
                <button key={v.id} type="button"
                  onClick={() => { setVehicleId(String(v.id)); resetResult(); }}
                  className={`w-full flex items-center gap-3 p-3 rounded-sm border transition text-left ${String(vehicleId) === String(v.id) ? "border-zinc-900 bg-zinc-50" : "border-[var(--border-default)] hover:border-zinc-400"}`}
                  data-testid={`vehicle-option-${v.id}`}
                >
                  {v.image
                    ? <img src={v.image} alt="" className="w-10 h-10 object-contain rounded-sm bg-[var(--slate-50)] flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-sm bg-zinc-100 flex items-center justify-center flex-shrink-0"><Truck size={16} className="text-zinc-400" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold">{v.name}</div>
                    <div className="text-[11px] text-zinc-500 mono">₹{v.base_fare} base · ₹{v.per_km}/km · min {v.min_distance} km · max {v.max_weight} kg</div>
                  </div>
                  {String(vehicleId) === String(v.id) && (
                    <CheckCircle2 size={18} className="text-zinc-900 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Delivery Type — Outstation only */}
          {serviceType === "OUTSTATION" && (
            <section className="surface p-5">
              <SectionLabel>Delivery Type</SectionLabel>
              <div className="space-y-2 mt-3">
                {DELIVERY_TYPES.map(dt => (
                  <button key={dt.value} type="button"
                    onClick={() => { setDeliveryType(dt.value); resetResult(); }}
                    className={`w-full flex items-center gap-3 p-3 rounded-sm border transition text-left ${deliveryType === dt.value ? "border-zinc-900 bg-zinc-50" : "border-[var(--border-default)] hover:border-zinc-400"}`}
                    data-testid={`delivery-${dt.value}`}
                  >
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold">{dt.label}</div>
                      <div className="text-[11px] text-zinc-500">{dt.desc}</div>
                    </div>
                    {deliveryType === dt.value && <CheckCircle2 size={16} className="text-zinc-900 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Trip Details */}
          <section className="surface p-5">
            <SectionLabel>Trip Details</SectionLabel>
            <div className="space-y-3 mt-3">
              {serviceType === "OUTSTATION" && (deliveryType === "DOOR_TO_DOOR" || deliveryType === "DOOR_TO_HUB") && (
                <NumField label="Pickup Leg (km)" value={pickupKm} onChange={v => { setPickupKm(v); resetResult(); }} placeholder="e.g. 5" />
              )}
              <NumField
                label={serviceType === "IN_CITY" ? "Distance (km)" : "Hub-to-Hub Distance (km)"}
                value={distance}
                onChange={v => { setDistance(v); resetResult(); }}
                placeholder="e.g. 12"
              />
              {serviceType === "OUTSTATION" && (deliveryType === "DOOR_TO_DOOR" || deliveryType === "HUB_TO_DOOR") && (
                <NumField label="Drop Leg (km)" value={dropKm} onChange={v => { setDropKm(v); resetResult(); }} placeholder="e.g. 4" />
              )}
              <NumField label="Parcel Weight (kg) — optional" value={weight} onChange={v => { setWeight(v); resetResult(); }} placeholder="e.g. 2" />
            </div>
          </section>

          {/* Payment Mode */}
          <section className="surface p-5">
            <SectionLabel>Payment Mode</SectionLabel>
            <div className="grid grid-cols-3 gap-2 mt-3">
              {PAYMENT_MODES.map(pm => (
                <button key={pm.value} type="button"
                  onClick={() => { setPaymentMode(pm.value); resetResult(); }}
                  className={`h-10 rounded-sm border text-[12px] font-semibold transition ${paymentMode === pm.value ? "bg-zinc-900 text-white border-zinc-900" : "border-[var(--border-default)] text-zinc-700 hover:border-zinc-400"}`}
                  data-testid={`payment-${pm.value}`}
                >
                  {pm.label}
                </button>
              ))}
            </div>
            {commission && (
              <div className="mt-3 text-[11px] text-zinc-500 mono">
                Commission: Online {commission.online_pct}% · COD Cash {commission.cod_cash_pct}% · COD QR {commission.cod_qr_pct}%
              </div>
            )}
          </section>

          {/* Calculate Button */}
          <button type="button" onClick={calculate}
            className="btn-primary w-full h-12 text-[13px] flex items-center justify-center gap-2"
            data-testid="calculate-btn"
          >
            <Calculator size={16} />
            Calculate Fare
            <ChevronRight size={14} className="opacity-60" />
          </button>
        </div>

        {/* ── RIGHT PANEL: Result ── */}
        <div>
          {!result ? (
            <EmptyState />
          ) : (
            <ResultPanel result={result} />
          )}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }) {
  const modeLabel = result.paymentMode === "ONLINE" ? "Online" : result.paymentMode === "COD_CASH" ? "COD Cash" : "COD QR";
  const serviceLabel = result.serviceType === "IN_CITY" ? "In-City Local" : "Outstation";
  const dtLabel = result.deliveryType ? DELIVERY_TYPES.find(d => d.value === result.deliveryType)?.label : null;

  return (
    <div className="space-y-4" data-testid="fare-result">

      {/* Summary card */}
      <div className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Fare Estimate</div>
            <div className="text-[15px] font-bold mt-1">{result.vehicle.name}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="pill bg-zinc-100 text-zinc-700 border-zinc-200">{serviceLabel}{dtLabel ? ` · ${dtLabel}` : ""}</span>
              <span className="pill bg-zinc-100 text-zinc-700 border-zinc-200">{modeLabel}</span>
              <span className="pill bg-blue-50 text-blue-800 border-blue-200">{result.commissionPct}% commission</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">Customer Pays</div>
            <div className="text-4xl font-bold mono mt-1 text-zinc-900">₹{result.customerTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Breakdown table */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Charge Breakdown</div>
        </div>
        <table className="w-full text-[13px]">
          <tbody>
            {result.rows.map((row, i) => (
              <tr key={i} className="border-b border-[var(--border-default)]">
                <td className="px-5 py-3">
                  <div className="font-medium text-zinc-900">{row.label}</div>
                  <div className="text-[11px] text-zinc-500 mono mt-0.5">{row.note}</div>
                </td>
                <td className="px-5 py-3 text-right mono font-semibold whitespace-nowrap">₹{row.amount.toFixed(2)}</td>
              </tr>
            ))}

            {/* Subtotal */}
            <tr className="bg-[var(--slate-50)] border-b border-[var(--border-default)]">
              <td className="px-5 py-3 font-semibold text-zinc-700 text-[13px]">Subtotal</td>
              <td className="px-5 py-3 text-right mono font-bold text-[14px]">₹{result.subtotal.toFixed(2)}</td>
            </tr>

            {/* GST */}
            <tr className="border-b border-[var(--border-default)]">
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">GST</div>
                <div className="text-[11px] text-zinc-500 mono">{result.gst.pct}% on subtotal</div>
              </td>
              <td className="px-5 py-3 text-right mono font-semibold">₹{result.gst.amount.toFixed(2)}</td>
            </tr>

            {/* Platform fee */}
            <tr className="border-b border-[var(--border-default)]">
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">Platform Fee</div>
                <div className="text-[11px] text-zinc-500 mono">Flat fee per {result.serviceType === "IN_CITY" ? "in-city" : "outstation"} order</div>
              </td>
              <td className="px-5 py-3 text-right mono font-semibold">₹{result.platformFee.toFixed(2)}</td>
            </tr>

            {/* Customer total */}
            <tr className="bg-zinc-900 text-white">
              <td className="px-5 py-4">
                <div className="text-[14px] font-bold">Customer Total</div>
                <div className="text-[11px] text-zinc-400 mt-0.5">Amount charged to customer</div>
              </td>
              <td className="px-5 py-4 text-right mono font-bold text-[20px]">₹{result.customerTotal.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Platform split */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--border-default)]">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">Platform Split · {modeLabel}</div>
        </div>
        <div className="grid grid-cols-2 divide-x divide-[var(--border-default)]">
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Platform Commission</div>
            <div className="text-[28px] font-bold mono mt-2 text-zinc-900">₹{result.commissionAmount.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-500 mono mt-1">{result.commissionPct}% of ₹{result.customerTotal.toFixed(2)}</div>
          </div>
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Rider Payout</div>
            <div className="text-[28px] font-bold mono mt-2 text-emerald-700">₹{result.riderPayout.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-500 mono mt-1">{100 - result.commissionPct}% of ₹{result.customerTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Config reference */}
      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Rates Used</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-zinc-500 mono">
          <span>Base fare: ₹{result.vehicle.base_fare}</span>
          <span>Per km: ₹{result.vehicle.per_km}</span>
          <span>Min km: {result.vehicle.min_distance} km</span>
          <span>GST: {result.gst.pct}%</span>
          <span>Platform fee: ₹{result.platformFee}</span>
          <span>Commission: {result.commissionPct}%</span>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface p-16 flex flex-col items-center justify-center gap-4 text-center min-h-[520px]">
      <div className="w-16 h-16 rounded-full bg-[var(--slate-100)] flex items-center justify-center">
        <Calculator size={26} className="text-zinc-400" />
      </div>
      <div>
        <div className="text-[14px] font-semibold text-zinc-700">No result yet</div>
        <div className="text-[12px] text-zinc-400 mt-1">Select a service type, vehicle, enter distances<br />and click Calculate Fare</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-xs text-[11px]">
        {["1. Choose service & vehicle", "2. Enter distances & weight", "3. Pick payment mode"].map((s, i) => (
          <div key={i} className="surface p-3 text-zinc-500 text-center">{s}</div>
        ))}
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-medium">{children}</div>;
}

function NumField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="input mono" min="0" step="0.1" />
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Calculator, Truck, CheckCircle2, Info, SlidersHorizontal, MapPin, Route, Tag, CreditCard, Settings, Search, Package } from "lucide-react";

const PAYMENT_MODES = [
  { value: "ONLINE",   label: "Online" },
  { value: "COD_CASH", label: "COD Cash" },
  { value: "COD_QR",   label: "COD QR" },
];

const DELIVERY_TYPES = [
  { value: "DOOR_TO_DOOR", label: "Door to Door", desc: "Pickup · Drop" },
  { value: "DOOR_TO_HUB",  label: "Door to Hub",  desc: "Pickup · Hub collect" },
  { value: "HUB_TO_DOOR",  label: "Hub to Door",  desc: "Hub drop · Deliver" },
];

const EMPTY_MANUAL_INCITY = { baseFare: "", perKm: "", minKm: "", perKgRate: "" };
const EMPTY_MANUAL_OUTSTATION = {
  pickupBaseFare: "", pickupMinKm: "", pickupRatePerKm: "",
  dropBaseFare:   "", dropMinKm:   "", dropRatePerKm:   "",
  corridorRatePerKm: "", perKgRate: "",
};

export default function FareCalculator() {
  const [vehicles, setVehicles]     = useState([]);
  const [cfg, setCfg]               = useState(null);
  const [commission, setCommission] = useState(null);
  const [loading, setLoading]       = useState(true);

  const [serviceType,  setServiceType]  = useState("IN_CITY");
  const [vehicleId,    setVehicleId]    = useState("");
  const [deliveryType, setDeliveryType] = useState("DOOR_TO_DOOR");
  const [distance,     setDistance]     = useState("");
  const [pickupKm,     setPickupKm]     = useState("");
  const [dropKm,       setDropKm]       = useState("");
  const [weight,       setWeight]       = useState("");
  const [paymentMode,  setPaymentMode]  = useState("ONLINE");
  const [coupon,       setCoupon]       = useState("");
  const [mode,             setMode]            = useState("config"); // "config" | "manual" | "order"
  const [manualInCity,     setManualInCity]    = useState(EMPTY_MANUAL_INCITY);
  const [manualOutstation, setManualOutstation] = useState(EMPTY_MANUAL_OUTSTATION);
  const [orderId,          setOrderId]         = useState("");
  const [orderData,        setOrderData]       = useState(null);
  const [orderLoading,     setOrderLoading]    = useState(false);
  const [orderError,       setOrderError]      = useState(null);

  const manualMode = mode === "manual";

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

  function handleModeChange(newMode) {
    if (newMode === "manual" && cfg) {
      if (serviceType === "IN_CITY") {
        const v = vehicles.find(v => String(v.id) === vehicleId);
        setManualInCity({ baseFare: v?.base_fare ?? "", perKm: v?.per_km ?? "", minKm: v?.min_distance ?? "", perKgRate: cfg.perKgRate ?? "" });
      } else {
        const pt = resolveLegTier(cfg.pickupLegTiers, parseFloat(weight) || 0);
        const dt = resolveLegTier(cfg.dropLegTiers,   parseFloat(weight) || 0);
        setManualOutstation({
          pickupBaseFare: pt?.baseFare ?? "", pickupMinKm: pt?.minimumKm ?? "", pickupRatePerKm: pt?.ratePerKm ?? "",
          dropBaseFare:   dt?.baseFare ?? "", dropMinKm:   dt?.minimumKm ?? "", dropRatePerKm:   dt?.ratePerKm ?? "",
          corridorRatePerKm: cfg.defaultRouteRatePerKm ?? "", perKgRate: cfg.perKgRate ?? "",
        });
      }
    }
    setMode(newMode);
  }

  function setMIC(key, val) { setManualInCity(s => ({ ...s, [key]: val })); }
  function setMOS(key, val) { setManualOutstation(s => ({ ...s, [key]: val })); }

  async function fetchOrder() {
    const id = orderId.trim();
    if (!id) return;
    setOrderLoading(true);
    setOrderError(null);
    setOrderData(null);
    try {
      const res = await api.get(`/orders/${id}`);
      setOrderData(res.data);
    } catch (err) {
      setOrderError(err?.response?.data?.message || err?.response?.data?.detail || "Order not found");
    } finally {
      setOrderLoading(false);
    }
  }

  function resolveLegTier(tiers, weightKg) {
    if (!tiers?.length || weightKg == null) return null;
    return tiers.filter(t => t.isActive !== false)
      .find(t => weightKg >= Number(t.minWeightKg) && weightKg < Number(t.maxWeightKg)) ?? null;
  }

  // Auto-calculate on every input change
  const result = useMemo(() => {
    if (!cfg || !commission) return null;

    const r2 = v => Math.round(v * 100) / 100;

    function lCost(distKm, tier, fallbackRate) {
      if (distKm <= 0) return 0;
      if (!tier) return r2(distKm * (Number(fallbackRate) || 0));
      const base = Number(tier.baseFare)||0, minKm = Number(tier.minimumKm)||0, rate = Number(tier.ratePerKm)||0;
      return distKm < minKm ? r2(base) : r2(base + distKm * rate);
    }
    function lCostM(distKm, baseFare, minKm, ratePerKm) {
      if (distKm <= 0) return 0;
      const b = Number(baseFare)||0, m = Number(minKm)||0, r = Number(ratePerKm)||0;
      return (m > 0 && distKm < m) ? r2(b) : r2(b + distKm * r);
    }
    function wCost(wt, slabs, perKgRate) {
      if (!wt || wt <= 0) return 0;
      const match = (slabs ?? []).filter(s => s.isActive !== false)
        .find(s => wt >= Number(s.minWeightKg) && wt < Number(s.maxWeightKg));
      return match ? r2(Number(match.flatCost)||0) : r2(wt * (Number(perKgRate)||0));
    }
    function lNote(distKm, tier, fallbackRate) {
      if (!tier) return `${distKm} km × ₹${fallbackRate}/km`;
      const base = Number(tier.baseFare)||0, minKm = Number(tier.minimumKm)||0, rate = Number(tier.ratePerKm)||0;
      return distKm < minKm ? `${distKm} km < ${minKm} km min → ₹${base} flat` : `₹${base} + ${distKm}km × ₹${rate}`;
    }
    function lNoteM(distKm, baseFare, minKm, ratePerKm) {
      const b = Number(baseFare)||0, m = Number(minKm)||0, r = Number(ratePerKm)||0;
      return (m > 0 && distKm < m) ? `${distKm} km < ${m} km → ₹${b} flat` : `₹${b} + ${distKm}km × ₹${r}`;
    }
    function wNote(wt, slabs, perKgRate) {
      const match = (slabs ?? []).filter(s => s.isActive !== false)
        .find(s => wt >= Number(s.minWeightKg) && wt < Number(s.maxWeightKg));
      return match ? `${wt} kg → slab ₹${match.flatCost} flat` : `${wt} kg × ₹${perKgRate}/kg`;
    }
    function tier(tiers, weightKg) {
      if (!tiers?.length || weightKg == null) return null;
      return tiers.filter(t => t.isActive !== false)
        .find(t => weightKg >= Number(t.minWeightKg) && weightKg < Number(t.maxWeightKg)) ?? null;
    }

    const dist = parseFloat(distance) || 0;
    const wt   = parseFloat(weight)   || 0;
    const pKm  = parseFloat(pickupKm) || 0;
    const dKm  = parseFloat(dropKm)   || 0;
    const couponAmt = parseFloat(coupon) || 0;
    const commPct = paymentMode === "ONLINE" ? commission.online_pct
      : paymentMode === "COD_CASH" ? commission.cod_cash_pct : commission.cod_qr_pct;

    if (serviceType === "IN_CITY") {
      let baseFare, perKm, minKm, weightCharge, wN, vehicleName;
      if (manualMode) {
        baseFare = Number(manualInCity.baseFare)||0; perKm = Number(manualInCity.perKm)||0; minKm = Number(manualInCity.minKm)||0;
        const pkgRate = Number(manualInCity.perKgRate)||0;
        weightCharge = wt > 0 ? r2(wt * pkgRate) : 0;
        wN = wt > 0 ? `${wt} kg × ₹${pkgRate}/kg` : null;
        vehicleName = "Manual";
      } else {
        const vehicle = vehicles.find(v => String(v.id) === vehicleId);
        if (!vehicle) return null;
        baseFare = Number(vehicle.base_fare)||0; perKm = Number(vehicle.per_km)||0; minKm = Number(vehicle.min_distance)||0;
        weightCharge = wCost(wt, cfg.weightCostSlabs, cfg.perKgRate);
        wN = wt > 0 ? wNote(wt, cfg.weightCostSlabs, cfg.perKgRate) : null;
        vehicleName = vehicle.name;
      }
      const billableKm = Math.max(dist, minKm);
      const distCharge = r2(billableKm * perKm);
      const subtotal   = r2(baseFare + distCharge + weightCharge);
      const gstAmt     = r2(subtotal * ((Number(cfg.gstPercent)||0) / 100));
      const platFee    = Number(cfg.incityPlatformFee)||0;
      const beforeCoupon  = r2(subtotal + gstAmt + platFee);
      const customerTotal = r2(Math.max(0, beforeCoupon - couponAmt));
      const commAmt    = r2(customerTotal * (commPct / 100));
      return {
        serviceType, deliveryType: null, vehicleName, paymentMode, commissionPct: commPct,
        rows: [
          { label: "Base Fare", note: `Flat · ${vehicleName}`, amount: baseFare },
          { label: "Distance",  note: `${billableKm} km × ₹${perKm}/km${dist < minKm ? ` (min ${minKm} km)` : ""}`, amount: distCharge },
          ...(wt > 0 ? [{ label: "Weight", note: wN, amount: weightCharge }] : []),
        ],
        subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee,
        couponAmt, beforeCoupon, customerTotal, commissionAmount: commAmt,
        riderPayout: r2(customerTotal - commAmt),
        ratesUsed: { baseFare, perKm, minKm }, manualMode,
      };

    } else {
      const inclPickup = deliveryType === "DOOR_TO_DOOR" || deliveryType === "DOOR_TO_HUB";
      const inclDrop   = deliveryType === "DOOR_TO_DOOR" || deliveryType === "HUB_TO_DOOR";
      let pickupCost, dropCost, corridorCost, weightCharge, wN, pNote, dNote, pickupVehicle, dropVehicle, ratesUsed;

      if (manualMode) {
        const mo = manualOutstation;
        pickupCost   = inclPickup ? lCostM(pKm, mo.pickupBaseFare, mo.pickupMinKm, mo.pickupRatePerKm) : 0;
        dropCost     = inclDrop   ? lCostM(dKm, mo.dropBaseFare,   mo.dropMinKm,   mo.dropRatePerKm)   : 0;
        const corrRate = Number(mo.corridorRatePerKm)||0;
        corridorCost = r2(dist * corrRate);
        const pkgRate = Number(mo.perKgRate)||0;
        weightCharge = wt > 0 ? r2(wt * pkgRate) : 0;
        wN    = wt > 0 ? `${wt} kg × ₹${pkgRate}/kg` : null;
        pNote = inclPickup ? lNoteM(pKm, mo.pickupBaseFare, mo.pickupMinKm, mo.pickupRatePerKm) : null;
        dNote = inclDrop   ? lNoteM(dKm, mo.dropBaseFare,   mo.dropMinKm,   mo.dropRatePerKm)   : null;
        pickupVehicle = "Manual"; dropVehicle = "Manual";
        ratesUsed = { corridorRate: corrRate, pickupTier: { baseFare: mo.pickupBaseFare, minimumKm: mo.pickupMinKm, ratePerKm: mo.pickupRatePerKm }, dropTier: { baseFare: mo.dropBaseFare, minimumKm: mo.dropMinKm, ratePerKm: mo.dropRatePerKm } };
      } else {
        const pt = tier(cfg.pickupLegTiers, wt);
        const dt = tier(cfg.dropLegTiers, wt);
        const corrRate = Number(cfg.defaultRouteRatePerKm)||0;
        pickupCost   = inclPickup ? lCost(pKm, pt, cfg.pickupRatePerKm) : 0;
        dropCost     = inclDrop   ? lCost(dKm, dt, cfg.dropRatePerKm)   : 0;
        corridorCost = r2(dist * corrRate);
        weightCharge = wCost(wt, cfg.weightCostSlabs, cfg.perKgRate);
        wN    = wt > 0 ? wNote(wt, cfg.weightCostSlabs, cfg.perKgRate) : null;
        pNote = inclPickup ? lNote(pKm, pt, cfg.pickupRatePerKm) : null;
        dNote = inclDrop   ? lNote(dKm, dt, cfg.dropRatePerKm)   : null;
        pickupVehicle = pt?.vehicleName ?? "—"; dropVehicle = dt?.vehicleName ?? "—";
        ratesUsed = { corridorRate: corrRate, pickupTier: pt, dropTier: dt };
      }

      const subtotal      = r2(pickupCost + corridorCost + dropCost + weightCharge);
      const gstAmt        = r2(subtotal * ((Number(cfg.gstPercent)||0) / 100));
      const platFee       = Number(cfg.outstationPlatformFee)||0;
      const beforeCoupon  = r2(subtotal + gstAmt + platFee);
      const customerTotal = r2(Math.max(0, beforeCoupon - couponAmt));
      const commAmt       = r2(customerTotal * (commPct / 100));
      return {
        serviceType, deliveryType, vehicleName: null, pickupVehicle, dropVehicle, paymentMode, commissionPct: commPct,
        rows: [
          ...(inclPickup ? [{ label: `Pickup${pickupVehicle !== "—" && pickupVehicle !== "Manual" ? ` · ${pickupVehicle}` : ""}`, note: pNote, amount: pickupCost }] : []),
          { label: "Hub Corridor", note: `${dist} km × ₹${ratesUsed.corridorRate}/km`, amount: corridorCost },
          ...(inclDrop ? [{ label: `Drop${dropVehicle !== "—" && dropVehicle !== "Manual" ? ` · ${dropVehicle}` : ""}`, note: dNote, amount: dropCost }] : []),
          ...(wt > 0 ? [{ label: "Weight", note: wN, amount: weightCharge }] : []),
        ],
        subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee,
        couponAmt, beforeCoupon, customerTotal, commissionAmount: commAmt,
        riderPayout: r2(customerTotal - commAmt),
        ratesUsed, manualMode,
      };
    }
  }, [cfg, commission, vehicles, serviceType, vehicleId, deliveryType, distance, pickupKm, dropKm, weight, paymentMode, coupon, mode, manualInCity, manualOutstation]);

  if (loading) {
    return (
      <div data-testid="fare-calculator-page">
        <PageHeader title="Fare Calculator" subtitle="Simulate full fare breakdown for any trip" />
        <div className="surface p-10 flex items-center justify-center text-[13px] text-zinc-400">Loading…</div>
      </div>
    );
  }

  const showPickup = serviceType === "OUTSTATION" && (deliveryType === "DOOR_TO_DOOR" || deliveryType === "DOOR_TO_HUB");
  const showDrop   = serviceType === "OUTSTATION" && (deliveryType === "DOOR_TO_DOOR" || deliveryType === "HUB_TO_DOOR");

  if (mode === "order") {
    return (
      <div data-testid="fare-calculator-page">
        <PageHeader title="Fare Calculator" subtitle="Simulate full fare breakdown for any trip" />
        <OrderFareTab
          orderId={orderId} setOrderId={setOrderId}
          orderData={orderData} orderLoading={orderLoading} orderError={orderError}
          onFetch={fetchOrder} onModeChange={handleModeChange}
        />
      </div>
    );
  }

  return (
    <div data-testid="fare-calculator-page">
      <PageHeader title="Fare Calculator" subtitle="Simulate full fare breakdown for any trip" />

      <div className="grid grid-cols-[380px_1fr] gap-5 items-start">

        {/* ── LEFT: INPUTS ── */}
        <div className="surface overflow-hidden">

          {/* Mode tab bar */}
          <div className="flex items-center gap-1 border-b border-[var(--border-default)] px-3 pt-1">
            {[
              { id: "config", label: "Config Mode",  icon: Settings },
              { id: "manual", label: "Manual Mode",  icon: SlidersHorizontal },
              { id: "order",  label: "Order Fare",   icon: Package },
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleModeChange(t.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition -mb-px ${
                    mode === t.id
                      ? "border-zinc-900 text-zinc-900"
                      : "border-transparent text-zinc-400 hover:text-zinc-600"
                  }`}
                  data-testid={`mode-tab-${t.id}`}
                >
                  <Icon size={12} />
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Service type */}
          <div className="p-4 border-b border-[var(--border-default)]">
            <div className="grid grid-cols-2 rounded-sm overflow-hidden border border-[var(--border-default)]">
              {[["IN_CITY","In-City"],["OUTSTATION","Outstation"]].map(([val, lbl]) => (
                <button key={val} type="button"
                  onClick={() => { setServiceType(val); setMode("config"); }}
                  className={`h-9 text-[12px] font-semibold transition ${serviceType === val ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-50"}`}
                  data-testid={`service-${val}`}
                >{lbl}</button>
              ))}
            </div>
          </div>

          {/* Config mode: Vehicle — in-city */}
          {mode === "config" && serviceType === "IN_CITY" && (
            <div className="p-4 border-b border-[var(--border-default)]">
              <InputLabel icon={Truck}>Vehicle</InputLabel>
              <div className="space-y-1.5 mt-2">
                {vehicles.length === 0 && <div className="empty">No active vehicles</div>}
                {vehicles.map(v => (
                  <button key={v.id} type="button"
                    onClick={() => setVehicleId(String(v.id))}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-sm border text-left transition ${String(vehicleId) === String(v.id) ? "border-zinc-900 bg-zinc-50" : "border-[var(--border-default)] hover:border-zinc-300"}`}
                    data-testid={`vehicle-option-${v.id}`}
                  >
                    {v.image
                      ? <img src={v.image} alt="" className="w-8 h-8 object-contain rounded-sm bg-zinc-50 flex-shrink-0" />
                      : <div className="w-8 h-8 rounded-sm bg-zinc-100 flex items-center justify-center flex-shrink-0"><Truck size={14} className="text-zinc-400" /></div>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold leading-tight">{v.name}</div>
                      <div className="text-[11px] text-zinc-400 mono">₹{v.base_fare} base · ₹{v.per_km}/km · min {v.min_distance} km</div>
                    </div>
                    {String(vehicleId) === String(v.id) && <CheckCircle2 size={15} className="text-zinc-900 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Config mode: Auto-vehicle banner — outstation */}
          {mode === "config" && serviceType === "OUTSTATION" && (
            <div className="mx-4 mt-4 p-3 rounded-sm bg-blue-50 border border-blue-200 flex gap-2 text-[11px] text-blue-700">
              <Info size={13} className="flex-shrink-0 mt-0.5" />
              Vehicle auto-selected per leg based on parcel weight and tier config.
            </div>
          )}

          {/* Manual mode: rate inputs */}
          {mode === "manual" && serviceType === "IN_CITY" && (
            <div className="p-4 border-b border-[var(--border-default)]">
              <InputLabel icon={SlidersHorizontal}>Custom Rates</InputLabel>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <NumField label="Base Fare (₹)" value={manualInCity.baseFare} onChange={v => setMIC("baseFare", v)} placeholder="30" />
                <NumField label="Rate / KM (₹)" value={manualInCity.perKm}    onChange={v => setMIC("perKm", v)}    placeholder="12" />
                <NumField label="Min KM"         value={manualInCity.minKm}    onChange={v => setMIC("minKm", v)}    placeholder="3" />
                <NumField label="Per KG (₹)"     value={manualInCity.perKgRate} onChange={v => setMIC("perKgRate", v)} placeholder="5" />
              </div>
            </div>
          )}

          {mode === "manual" && serviceType === "OUTSTATION" && (
            <div className="p-4 border-b border-[var(--border-default)]">
              <InputLabel icon={SlidersHorizontal}>Custom Rates</InputLabel>
              <div className="mt-3 space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1.5">Pickup Leg</div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="Base (₹)"    value={manualOutstation.pickupBaseFare}  onChange={v => setMOS("pickupBaseFare", v)}  placeholder="40" />
                    <NumField label="Min KM"        value={manualOutstation.pickupMinKm}     onChange={v => setMOS("pickupMinKm", v)}     placeholder="3" />
                    <NumField label="Rate/KM (₹)"  value={manualOutstation.pickupRatePerKm} onChange={v => setMOS("pickupRatePerKm", v)} placeholder="15" />
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1.5">Corridor</div>
                  <NumField label="Rate / KM (₹)" value={manualOutstation.corridorRatePerKm} onChange={v => setMOS("corridorRatePerKm", v)} placeholder="10" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1.5">Drop Leg</div>
                  <div className="grid grid-cols-3 gap-2">
                    <NumField label="Base (₹)"    value={manualOutstation.dropBaseFare}  onChange={v => setMOS("dropBaseFare", v)}  placeholder="35" />
                    <NumField label="Min KM"        value={manualOutstation.dropMinKm}     onChange={v => setMOS("dropMinKm", v)}     placeholder="3" />
                    <NumField label="Rate/KM (₹)"  value={manualOutstation.dropRatePerKm} onChange={v => setMOS("dropRatePerKm", v)} placeholder="12" />
                  </div>
                </div>
                <NumField label="Per KG Rate (₹)" value={manualOutstation.perKgRate} onChange={v => setMOS("perKgRate", v)} placeholder="5" />
              </div>
            </div>
          )}

          {/* Delivery type — outstation */}
          {serviceType === "OUTSTATION" && (
            <div className="p-4 border-b border-[var(--border-default)]">
              <InputLabel icon={Route}>Delivery Type</InputLabel>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {DELIVERY_TYPES.map(dt => (
                  <button key={dt.value} type="button"
                    onClick={() => setDeliveryType(dt.value)}
                    className={`flex flex-col items-center py-2.5 px-2 rounded-sm border text-center transition ${deliveryType === dt.value ? "border-zinc-900 bg-zinc-50" : "border-[var(--border-default)] hover:border-zinc-300"}`}
                    data-testid={`delivery-${dt.value}`}
                  >
                    <span className="text-[12px] font-semibold leading-tight">{dt.label}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 leading-tight">{dt.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trip distances + weight */}
          <div className="p-4 border-b border-[var(--border-default)]">
            <InputLabel icon={MapPin}>Trip Details</InputLabel>
            <div className="mt-2 space-y-2">
              {showPickup && <NumField label="Pickup Leg (km)" value={pickupKm} onChange={v => setPickupKm(v)} placeholder="e.g. 5" />}
              <NumField
                label={serviceType === "IN_CITY" ? "Distance (km)" : "Hub-to-Hub (km)"}
                value={distance} onChange={v => setDistance(v)} placeholder="e.g. 12"
              />
              {showDrop && <NumField label="Drop Leg (km)" value={dropKm} onChange={v => setDropKm(v)} placeholder="e.g. 4" />}
              <NumField label="Weight (kg)" value={weight} onChange={v => setWeight(v)} placeholder="e.g. 2" />
            </div>
          </div>

          {/* Payment mode + coupon */}
          <div className="p-4">
            <InputLabel icon={CreditCard}>Payment & Coupon</InputLabel>
            <div className="grid grid-cols-3 gap-1.5 mt-2">
              {PAYMENT_MODES.map(pm => (
                <button key={pm.value} type="button"
                  onClick={() => setPaymentMode(pm.value)}
                  className={`h-9 rounded-sm border text-[12px] font-semibold transition ${paymentMode === pm.value ? "bg-zinc-900 text-white border-zinc-900" : "border-[var(--border-default)] text-zinc-600 hover:border-zinc-300"}`}
                  data-testid={`payment-${pm.value}`}
                >{pm.label}</button>
              ))}
            </div>
            {commission && (
              <div className="mt-2 text-[11px] text-zinc-400 mono">
                {commission.online_pct}% · {commission.cod_cash_pct}% · {commission.cod_qr_pct}% commission
              </div>
            )}
            <div className="mt-3 relative">
              <Tag size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="number" value={coupon} onChange={e => setCoupon(e.target.value)}
                placeholder="Coupon / discount (₹)"
                className="input mono pl-8 text-[12px]"
                min="0" step="1"
              />
            </div>
          </div>

        </div>

        {/* ── RIGHT: RESULT ── */}
        <div>
          {!result ? <EmptyState /> : <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }) {
  const modeLabel    = { ONLINE: "Online", COD_CASH: "COD Cash", COD_QR: "COD QR" }[result.paymentMode];
  const serviceLabel = result.serviceType === "IN_CITY" ? "In-City" : "Outstation";
  const dtLabel      = result.deliveryType ? DELIVERY_TYPES.find(d => d.value === result.deliveryType)?.label : null;
  const vehicleLabel = result.vehicleName
    ?? (result.serviceType === "OUTSTATION"
        ? [result.pickupVehicle !== "—" && `Pickup: ${result.pickupVehicle}`, result.dropVehicle !== "—" && `Drop: ${result.dropVehicle}`].filter(Boolean).join(" · ") || null
        : null);

  const commPct   = result.commissionPct;
  const riderPct  = 100 - commPct;

  return (
    <div className="space-y-3" data-testid="fare-result">

      {/* Hero */}
      <div className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-1">Customer Pays</div>
            <div className="text-[42px] font-bold mono leading-none text-zinc-900">
              ₹{result.customerTotal.toFixed(2)}
            </div>
            {result.couponAmt > 0 && (
              <div className="text-[12px] text-emerald-600 mono mt-1.5 flex items-center gap-1">
                <Tag size={11} /> −₹{result.couponAmt.toFixed(2)} coupon · was ₹{result.beforeCoupon.toFixed(2)}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Pill>{serviceLabel}{dtLabel ? ` · ${dtLabel}` : ""}</Pill>
              <Pill>{modeLabel}</Pill>
              {vehicleLabel && <Pill>{vehicleLabel}</Pill>}
              {result.manualMode && <Pill color="amber">Manual</Pill>}
            </div>
          </div>

          {/* Commission donut-style summary */}
          <div className="flex-shrink-0 text-right">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Commission Split</div>
            <div className="flex items-center gap-3 justify-end">
              <div>
                <div className="text-[10px] text-zinc-400 mb-0.5">Platform</div>
                <div className="text-[18px] font-bold mono text-zinc-900">₹{result.commissionAmount.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-400 mono">{commPct}%</div>
              </div>
              <div className="text-zinc-200 text-[18px]">·</div>
              <div>
                <div className="text-[10px] text-zinc-400 mb-0.5">Rider</div>
                <div className="text-[18px] font-bold mono text-emerald-700">₹{result.riderPayout.toFixed(2)}</div>
                <div className="text-[10px] text-zinc-400 mono">{riderPct}%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Split bar */}
        <div className="mt-4 h-2 rounded-full overflow-hidden bg-zinc-100 flex">
          <div className="bg-zinc-800 transition-all" style={{ width: `${commPct}%` }} />
          <div className="bg-emerald-500 flex-1" />
        </div>
        <div className="flex justify-between mt-1 text-[10px] text-zinc-400 mono">
          <span>Platform {commPct}%</span>
          <span>Rider {riderPct}%</span>
        </div>
      </div>

      {/* Breakdown */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)]">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Charge Breakdown</span>
        </div>
        <div className="divide-y divide-[var(--border-default)]">
          {result.rows.map((row, i) => (
            <div key={i} className="flex items-center justify-between px-5 py-3 gap-4">
              <div>
                <div className="text-[13px] font-medium text-zinc-900">{row.label}</div>
                {row.note && <div className="text-[11px] text-zinc-400 mono mt-0.5">{row.note}</div>}
              </div>
              <div className="mono font-semibold text-[13px] whitespace-nowrap">₹{row.amount.toFixed(2)}</div>
            </div>
          ))}

          {/* Subtotal */}
          <div className="flex items-center justify-between px-5 py-3 bg-[var(--slate-50)]">
            <span className="text-[12px] font-semibold text-zinc-600">Subtotal</span>
            <span className="mono font-bold text-[14px]">₹{result.subtotal.toFixed(2)}</span>
          </div>

          {/* GST */}
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] font-medium text-zinc-900">GST</div>
              <div className="text-[11px] text-zinc-400 mono">
                {result.gst.pct}% × ₹{result.subtotal.toFixed(2)} = ₹{result.gst.amount.toFixed(2)}
              </div>
            </div>
            <div className="mono font-semibold text-[13px]">₹{result.gst.amount.toFixed(2)}</div>
          </div>

          {/* Platform fee */}
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <div className="text-[13px] font-medium text-zinc-900">Platform Fee</div>
              <div className="text-[11px] text-zinc-400 mono">
                {result.serviceType === "IN_CITY" ? "In-city" : "Outstation"} flat fee · ₹{result.subtotal.toFixed(2)} + ₹{result.gst.amount.toFixed(2)} + ₹{result.platformFee.toFixed(2)} = ₹{result.beforeCoupon.toFixed(2)}
              </div>
            </div>
            <div className="mono font-semibold text-[13px]">₹{result.platformFee.toFixed(2)}</div>
          </div>

          {/* Coupon */}
          {result.couponAmt > 0 && (
            <div className="flex items-center justify-between px-5 py-3 bg-emerald-50">
              <div>
                <div className="text-[13px] font-medium text-emerald-800">Coupon / Discount</div>
                <div className="text-[11px] text-emerald-500 mono">₹{result.beforeCoupon.toFixed(2)} − ₹{result.couponAmt.toFixed(2)} = ₹{result.customerTotal.toFixed(2)}</div>
              </div>
              <div className="mono font-semibold text-[13px] text-emerald-700">−₹{result.couponAmt.toFixed(2)}</div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-5 py-4 bg-zinc-900 text-white">
            <div>
              <div className="text-[14px] font-bold">Customer Total</div>
              <div className="text-[11px] text-zinc-400 mono">
                {result.couponAmt > 0
                  ? `₹${result.beforeCoupon.toFixed(2)} − ₹${result.couponAmt.toFixed(2)} coupon`
                  : `subtotal ₹${result.subtotal.toFixed(2)} + GST ₹${result.gst.amount.toFixed(2)} + fee ₹${result.platformFee.toFixed(2)}`}
              </div>
            </div>
            <div className="mono font-bold text-[22px]">₹{result.customerTotal.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Rates chip row */}
      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Rates Applied</div>
        <div className="flex flex-wrap gap-1.5">
          {result.serviceType === "IN_CITY" ? (
            <>
              <RateChip>₹{result.ratesUsed.baseFare} base</RateChip>
              <RateChip>₹{result.ratesUsed.perKm}/km</RateChip>
              <RateChip>min {result.ratesUsed.minKm} km</RateChip>
            </>
          ) : (
            <>
              {result.ratesUsed.pickupTier && <RateChip>Pickup ₹{result.ratesUsed.pickupTier.baseFare}+₹{result.ratesUsed.pickupTier.ratePerKm}/km</RateChip>}
              {result.ratesUsed.dropTier   && <RateChip>Drop ₹{result.ratesUsed.dropTier.baseFare}+₹{result.ratesUsed.dropTier.ratePerKm}/km</RateChip>}
              <RateChip>Corridor ₹{result.ratesUsed.corridorRate}/km</RateChip>
            </>
          )}
          <RateChip>GST {result.gst.pct}%</RateChip>
          <RateChip>Platform ₹{result.platformFee}</RateChip>
          <RateChip>Commission {result.commissionPct}%</RateChip>
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="surface p-16 flex flex-col items-center justify-center gap-5 text-center min-h-[540px]">
      <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
        <Calculator size={24} className="text-zinc-300" />
      </div>
      <div>
        <div className="text-[15px] font-semibold text-zinc-700">Ready to calculate</div>
        <div className="text-[12px] text-zinc-400 mt-1.5 leading-relaxed">
          Fill in the trip details on the left —<br />the result updates automatically
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
        {["Service type", "Distances & weight", "Payment mode"].map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            {i > 0 && <span className="text-zinc-200">→</span>}
            <span className="px-2.5 py-1 rounded-full bg-zinc-100">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pill({ children, color }) {
  const cls = color === "amber"
    ? "bg-amber-50 text-amber-700 border-amber-200"
    : color === "green"
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : "bg-zinc-100 text-zinc-600 border-zinc-200";
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium ${cls}`}>{children}</span>;
}

function RateChip({ children }) {
  return <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-zinc-100 text-[11px] text-zinc-500 mono">{children}</span>;
}

function InputLabel({ children, icon: Icon }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-400 font-medium mb-0.5">
      {Icon && <Icon size={11} />}
      {children}
    </div>
  );
}

function NumField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label className="label text-[11px]">{label}</label>
      <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="input mono text-[13px]" min="0" step="0.1" />
    </div>
  );
}

// ── ORDER FARE TAB ──────────────────────────────────────────────────────────

function OrderFareTab({ orderId, setOrderId, orderData, orderLoading, orderError, onFetch, onModeChange }) {
  const MODE_TABS = [
    { id: "config", label: "Config Mode",  icon: Settings },
    { id: "manual", label: "Manual Mode",  icon: SlidersHorizontal },
    { id: "order",  label: "Order Fare",   icon: Package },
  ];

  return (
    <div>
      {/* Tab bar — same style as the left panel */}
      <div className="surface overflow-hidden mb-5">
        <div className="flex items-center gap-1 border-b border-[var(--border-default)] px-3 pt-1">
          {MODE_TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} type="button" onClick={() => onModeChange(t.id)}
                className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition -mb-px ${
                  t.id === "order"
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-400 hover:text-zinc-600"
                }`}
              >
                <Icon size={12} /> {t.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="p-4">
          <InputLabel icon={Search}>Order ID</InputLabel>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              onKeyDown={e => e.key === "Enter" && onFetch()}
              placeholder="Enter order ID (e.g. 1042)"
              className="input flex-1"
              data-testid="order-id-input"
            />
            <button
              type="button"
              onClick={onFetch}
              disabled={orderLoading || !orderId.trim()}
              className="btn-primary px-4 h-9 flex items-center gap-2 flex-shrink-0"
              data-testid="fetch-order-btn"
            >
              <Search size={13} />
              {orderLoading ? "Fetching…" : "Fetch"}
            </button>
          </div>
          {orderError && (
            <div className="mt-2 p-2 rounded-sm bg-rose-50 border border-rose-200 text-[12px] text-rose-700">
              {orderError}
            </div>
          )}
        </div>
      </div>

      {!orderData && !orderError && (
        <div className="surface p-16 flex flex-col items-center justify-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center">
            <Package size={24} className="text-zinc-300" />
          </div>
          <div>
            <div className="text-[15px] font-semibold text-zinc-700">Enter an order ID</div>
            <div className="text-[12px] text-zinc-400 mt-1">Fetch any order to see its full fare breakdown</div>
          </div>
        </div>
      )}

      {orderData && <OrderFareBreakdown order={orderData} />}
    </div>
  );
}

function OrderFareBreakdown({ order }) {
  const isOutstation = order.serviceMode === "OUTSTATION";
  const r2 = v => (v != null ? Number(v).toFixed(2) : "—");
  const fmt = v => v != null ? `₹${r2(v)}` : "—";
  const km  = v => v != null ? `${Number(v).toFixed(2)} km` : "—";

  const totalAmount   = order.totalAmount ?? 0;
  const earnedAmount  = order.earnedAmount;
  const commAmount    = earnedAmount != null ? Math.max(0, totalAmount - earnedAmount) : null;
  const payLabel      = { ONLINE: "Online", COD_CASH: "COD Cash", COD_QR: "COD QR", COD: "COD" }[order.paymentType] ?? order.paymentType ?? "—";
  const statusLabel   = String(order.status ?? "").replaceAll("_", " ");
  const deliveryLabel = String(order.deliveryType ?? "DOOR_TO_DOOR").replaceAll("_", " ");

  return (
    <div className="space-y-4" data-testid="order-fare-breakdown">

      {/* Header card */}
      <div className="surface p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[11px] text-zinc-400 mono mb-1">{order.tracking_id || order.displayOrderId || `#${order.id}`}</div>
            <div className="text-[32px] font-bold mono leading-none text-zinc-900">{fmt(totalAmount)}</div>
            {order.couponAmount > 0 && (
              <div className="text-[12px] text-emerald-600 mono mt-1.5 flex items-center gap-1">
                <Tag size={11} /> −{fmt(order.couponAmount)} coupon {order.appliedCouponCode ? `(${order.appliedCouponCode})` : ""}
              </div>
            )}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <Pill>{isOutstation ? "Outstation" : "In-City"}</Pill>
              {isOutstation && <Pill>{deliveryLabel}</Pill>}
              <Pill>{payLabel}</Pill>
              <Pill color={order.status === "DELIVERED" ? "green" : ""}>{statusLabel}</Pill>
            </div>
          </div>

          {/* Commission split */}
          {earnedAmount != null && (
            <div className="flex-shrink-0 text-right">
              <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Payout Split</div>
              <div className="flex items-center gap-4 justify-end">
                <div>
                  <div className="text-[10px] text-zinc-400 mb-0.5">App Commission</div>
                  <div className="text-[18px] font-bold mono text-zinc-900">{fmt(commAmount)}</div>
                </div>
                <div className="text-zinc-200 text-[18px]">·</div>
                <div>
                  <div className="text-[10px] text-zinc-400 mb-0.5">Rider Earns</div>
                  <div className="text-[18px] font-bold mono text-emerald-700">{fmt(earnedAmount)}</div>
                </div>
              </div>
              {commAmount != null && totalAmount > 0 && (
                <div className="mt-3 h-2 rounded-full overflow-hidden bg-zinc-100 flex w-48 ml-auto">
                  <div className="bg-zinc-800 transition-all" style={{ width: `${Math.min(100, (commAmount / totalAmount) * 100)}%` }} />
                  <div className="bg-emerald-500 flex-1" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">

        {/* In-City vehicle info */}
        {!isOutstation && (
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-default)]">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Vehicle</span>
            </div>
            <div className="p-4 flex items-center gap-3">
              {order.vehicleImageUrl
                ? <img src={order.vehicleImageUrl} alt="" className="w-12 h-12 object-contain rounded-sm bg-zinc-50 border border-[var(--border-default)]" />
                : <div className="w-12 h-12 rounded-sm bg-zinc-100 flex items-center justify-center flex-shrink-0"><Truck size={18} className="text-zinc-400" /></div>
              }
              <div>
                <div className="text-[14px] font-semibold">{order.vehicleName ?? "—"}</div>
                <div className="text-[12px] text-zinc-400 mono mt-0.5">
                  {order.vehiclePricePerKm != null ? `₹${order.vehiclePricePerKm}/km` : "Rate not recorded"}
                </div>
                <div className="text-[11px] text-zinc-400 mono mt-0.5">
                  Distance: {km(order.distanceKm)} · Weight: {order.weight_kg ?? order.weight ?? "—"} kg
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Outstation route info */}
        {isOutstation && (
          <div className="surface overflow-hidden">
            <div className="px-5 py-3 border-b border-[var(--border-default)]">
              <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Route</span>
            </div>
            <div className="p-4 space-y-2 text-[12px]">
              <InfoRow label="Pickup Leg"   value={km(order.pickupDistanceKm)} />
              <InfoRow label="Hub Corridor" value={km(order.hubDistanceKm)} />
              <InfoRow label="Drop Leg"     value={km(order.dropDistanceKm)} />
              <InfoRow label="Weight"       value={`${order.weight_kg ?? order.weight ?? "—"} kg`} />
              <InfoRow label="Delivery"     value={deliveryLabel} />
            </div>
          </div>
        )}

        {/* Sender / Receiver */}
        <div className="surface overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border-default)]">
            <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Parties</span>
          </div>
          <div className="p-4 space-y-2 text-[12px]">
            <InfoRow label="Sender"    value={`${order.sender?.name ?? "—"} · ${order.sender?.phone ?? "—"}`} />
            <InfoRow label="Pickup"    value={order.sender?.address ?? "—"} small />
            <InfoRow label="Receiver"  value={`${order.receiver?.name ?? "—"} · ${order.receiver?.phone ?? "—"}`} />
            <InfoRow label="Drop"      value={order.receiver?.address ?? "—"} small />
          </div>
        </div>
      </div>

      {/* Fare breakdown */}
      <div className="surface overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border-default)]">
          <span className="text-[11px] uppercase tracking-wider text-zinc-400 font-medium">Fare Breakdown</span>
        </div>
        <div className="divide-y divide-[var(--border-default)]">

          {isOutstation ? (
            <>
              {order.pickupDistanceKm != null && order.pickupDistanceKm > 0 && (
                <FareRow label="Pickup Leg" note={`${km(order.pickupDistanceKm)} pickup distance`} amount={order.outstationPickupCost} />
              )}
              <FareRow label="Hub Corridor" note={`${km(order.hubDistanceKm)} hub-to-hub`} amount={order.outstationHubCost} />
              {order.dropDistanceKm != null && order.dropDistanceKm > 0 && (
                <FareRow label="Drop Leg" note={`${km(order.dropDistanceKm)} drop distance`} amount={order.outstationDropCost} />
              )}
              {order.outstationWeightCost != null && order.outstationWeightCost > 0 && (
                <FareRow label="Weight Charge" note={`${order.weight_kg ?? order.weight ?? "—"} kg`} amount={order.outstationWeightCost} />
              )}
            </>
          ) : (
            <>
              <FareRow label="Distance Fare"
                note={`${km(order.distanceKm)}${order.vehiclePricePerKm != null ? ` × ₹${order.vehiclePricePerKm}/km` : ""}`}
                amount={order.subtotal} />
            </>
          )}

          {/* Subtotal */}
          <div className="flex items-center justify-between px-5 py-3 bg-[var(--slate-50)]">
            <span className="text-[12px] font-semibold text-zinc-600">Subtotal</span>
            <span className="mono font-bold text-[14px]">{fmt(order.subtotal)}</span>
          </div>

          {/* GST */}
          <FareRow label="GST" note={`${order.gstAmount != null && order.subtotal ? ((order.gstAmount / order.subtotal) * 100).toFixed(0) : ""}% on subtotal`} amount={order.gstAmount} />

          {/* Platform fee */}
          <FareRow label="Platform Fee" note={isOutstation ? "Outstation flat fee" : "In-city flat fee"} amount={order.platformFee} />

          {/* Coupon */}
          {order.couponAmount > 0 && (
            <div className="flex items-center justify-between px-5 py-3 bg-emerald-50">
              <div>
                <div className="text-[13px] font-medium text-emerald-800">Coupon {order.appliedCouponCode ? `(${order.appliedCouponCode})` : ""}</div>
              </div>
              <div className="mono font-semibold text-[13px] text-emerald-700">−{fmt(order.couponAmount)}</div>
            </div>
          )}

          {/* Total */}
          <div className="flex items-center justify-between px-5 py-4 bg-zinc-900 text-white">
            <div>
              <div className="text-[14px] font-bold">Customer Total</div>
              <div className="text-[11px] text-zinc-400">{payLabel}</div>
            </div>
            <div className="mono font-bold text-[22px]">{fmt(totalAmount)}</div>
          </div>
        </div>
      </div>

      {/* Rider commission detail */}
      {earnedAmount != null && (
        <div className="surface p-4">
          <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-3">Commission Summary</div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-sm bg-zinc-50 border border-[var(--border-default)] text-center">
              <div className="text-[10px] text-zinc-400 mb-1">Customer Pays</div>
              <div className="text-[16px] font-bold mono">{fmt(totalAmount)}</div>
            </div>
            <div className="p-3 rounded-sm bg-zinc-50 border border-[var(--border-default)] text-center">
              <div className="text-[10px] text-zinc-400 mb-1">App Commission</div>
              <div className="text-[16px] font-bold mono text-zinc-700">{commAmount != null ? fmt(commAmount) : "—"}</div>
              {commAmount != null && totalAmount > 0 && (
                <div className="text-[10px] text-zinc-400 mono mt-0.5">{((commAmount / totalAmount) * 100).toFixed(1)}%</div>
              )}
            </div>
            <div className="p-3 rounded-sm bg-emerald-50 border border-emerald-200 text-center">
              <div className="text-[10px] text-emerald-600 mb-1">Rider Earns</div>
              <div className="text-[16px] font-bold mono text-emerald-700">{fmt(earnedAmount)}</div>
              {earnedAmount != null && totalAmount > 0 && (
                <div className="text-[10px] text-emerald-500 mono mt-0.5">{((earnedAmount / totalAmount) * 100).toFixed(1)}%</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FareRow({ label, note, amount }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 gap-4">
      <div>
        <div className="text-[13px] font-medium text-zinc-900">{label}</div>
        {note && <div className="text-[11px] text-zinc-400 mono mt-0.5">{note}</div>}
      </div>
      <div className="mono font-semibold text-[13px] whitespace-nowrap">
        {amount != null ? `₹${Number(amount).toFixed(2)}` : "—"}
      </div>
    </div>
  );
}

function InfoRow({ label, value, small }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-zinc-400 flex-shrink-0">{label}</span>
      <span className={`text-zinc-700 text-right ${small ? "text-[11px]" : ""}`}>{value}</span>
    </div>
  );
}

import { useEffect, useState } from "react";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { Calculator, Truck, CheckCircle2, ChevronRight, Info, SlidersHorizontal } from "lucide-react";

const PAYMENT_MODES = [
  { value: "ONLINE", label: "Online" },
  { value: "COD_CASH", label: "COD Cash" },
  { value: "COD_QR", label: "COD QR" },
];

const DELIVERY_TYPES = [
  { value: "DOOR_TO_DOOR", label: "Door to Door", desc: "Pickup from sender · Drop to receiver" },
  { value: "DOOR_TO_HUB",  label: "Door to Hub",  desc: "Pickup from sender · Receiver collects" },
  { value: "HUB_TO_DOOR",  label: "Hub to Door",  desc: "Sender drops at hub · Drop to receiver" },
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
  const [result,       setResult]       = useState(null);

  // Manual override state
  const [manualMode,        setManualMode]        = useState(false);
  const [manualInCity,      setManualInCity]      = useState(EMPTY_MANUAL_INCITY);
  const [manualOutstation,  setManualOutstation]  = useState(EMPTY_MANUAL_OUTSTATION);

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

  function resetResult() { setResult(null); }

  // Pre-fill manual fields from config when toggling on
  function toggleManual() {
    if (!manualMode && cfg) {
      if (serviceType === "IN_CITY") {
        const v = vehicles.find(v => String(v.id) === vehicleId);
        setManualInCity({
          baseFare:  v?.base_fare  ?? "",
          perKm:     v?.per_km     ?? "",
          minKm:     v?.min_distance ?? "",
          perKgRate: cfg.perKgRate  ?? "",
        });
      } else {
        const pt = resolveLegTier(cfg.pickupLegTiers, parseFloat(weight) || 0);
        const dt = resolveLegTier(cfg.dropLegTiers,   parseFloat(weight) || 0);
        setManualOutstation({
          pickupBaseFare:    pt?.baseFare   ?? "",
          pickupMinKm:       pt?.minimumKm  ?? "",
          pickupRatePerKm:   pt?.ratePerKm  ?? "",
          dropBaseFare:      dt?.baseFare   ?? "",
          dropMinKm:         dt?.minimumKm  ?? "",
          dropRatePerKm:     dt?.ratePerKm  ?? "",
          corridorRatePerKm: cfg.defaultRouteRatePerKm ?? "",
          perKgRate:         cfg.perKgRate  ?? "",
        });
      }
    }
    setManualMode(m => !m);
    resetResult();
  }

  function setMIC(key, val) { setManualInCity(s => ({ ...s, [key]: val })); resetResult(); }
  function setMOS(key, val) { setManualOutstation(s => ({ ...s, [key]: val })); resetResult(); }

  // Find matching leg tier by weight
  function resolveLegTier(tiers, weightKg) {
    if (!tiers?.length || weightKg == null) return null;
    return tiers
      .filter(t => t.isActive !== false)
      .find(t => weightKg >= Number(t.minWeightKg) && weightKg < Number(t.maxWeightKg)) ?? null;
  }

  // Leg cost: below min km → base fare only; above → base fare + dist × rate
  function legCost(distKm, tier, fallbackRate) {
    if (distKm <= 0) return 0;
    if (!tier) return round2(distKm * (Number(fallbackRate) || 0));
    const base  = Number(tier.baseFare)  || 0;
    const minKm = Number(tier.minimumKm) || 0;
    const rate  = Number(tier.ratePerKm) || 0;
    if (distKm < minKm) return round2(base);
    return round2(base + distKm * rate);
  }

  // Weight cost: flat slab or perKgRate fallback
  function resolveWeightCost(weightKg, slabs, perKgRate) {
    if (!weightKg || weightKg <= 0) return 0;
    const match = (slabs ?? [])
      .filter(s => s.isActive !== false)
      .find(s => weightKg >= Number(s.minWeightKg) && weightKg < Number(s.maxWeightKg));
    if (match) return round2(Number(match.flatCost) || 0);
    return round2(weightKg * (Number(perKgRate) || 0));
  }

  function legCostNote(distKm, tier, fallbackRate) {
    if (!tier) return `${distKm} km × ₹${fallbackRate}/km (legacy flat rate)`;
    const base  = Number(tier.baseFare)  || 0;
    const minKm = Number(tier.minimumKm) || 0;
    const rate  = Number(tier.ratePerKm) || 0;
    if (distKm < minKm) return `${distKm} km < ${minKm} km min → base fare only`;
    return `₹${base} base + ${distKm} km × ₹${rate}/km`;
  }

  function legCostNoteManual(distKm, baseFare, minKm, ratePerKm) {
    if (distKm <= 0) return "—";
    const b = Number(baseFare) || 0;
    const m = Number(minKm)    || 0;
    const r = Number(ratePerKm)|| 0;
    if (m > 0 && distKm < m) return `${distKm} km < ${m} km min → ₹${b} base fare only`;
    return `₹${b} base + ${distKm} km × ₹${r}/km`;
  }

  function legCostManual(distKm, baseFare, minKm, ratePerKm) {
    if (distKm <= 0) return 0;
    const b = Number(baseFare) || 0;
    const m = Number(minKm)    || 0;
    const r = Number(ratePerKm)|| 0;
    if (m > 0 && distKm < m) return round2(b);
    return round2(b + distKm * r);
  }

  function round2(v) { return Math.round(v * 100) / 100; }

  function calculate() {
    if (!cfg || !commission) return;
    const dist = parseFloat(distance) || 0;
    const wt   = parseFloat(weight)   || 0;
    const pKm  = parseFloat(pickupKm) || 0;
    const dKm  = parseFloat(dropKm)   || 0;
    const couponAmt = parseFloat(coupon) || 0;

    const commissionPct =
      paymentMode === "ONLINE"   ? commission.online_pct
      : paymentMode === "COD_CASH" ? commission.cod_cash_pct
      : commission.cod_qr_pct;

    if (serviceType === "IN_CITY") {
      let baseFare, perKm, minKm, weightCharge, weightNote, vehicleName;

      if (manualMode) {
        baseFare  = Number(manualInCity.baseFare) || 0;
        perKm     = Number(manualInCity.perKm)    || 0;
        minKm     = Number(manualInCity.minKm)    || 0;
        const pkgRate = Number(manualInCity.perKgRate) || 0;
        weightCharge = wt > 0 ? round2(wt * pkgRate) : 0;
        weightNote   = wt > 0 ? `${wt} kg × ₹${pkgRate}/kg (manual)` : null;
        vehicleName  = "Manual Override";
      } else {
        const vehicle = vehicles.find(v => String(v.id) === vehicleId);
        if (!vehicle) return;
        baseFare = Number(vehicle.base_fare)    || 0;
        perKm    = Number(vehicle.per_km)       || 0;
        minKm    = Number(vehicle.min_distance) || 0;
        weightCharge = resolveWeightCost(wt, cfg.weightCostSlabs, cfg.perKgRate);
        weightNote   = wt > 0 ? weightCostNote(wt, cfg.weightCostSlabs, cfg.perKgRate) : null;
        vehicleName  = vehicle.name;
      }

      const billableKm  = Math.max(dist, minKm);
      const distCharge  = round2(billableKm * perKm);
      const subtotal    = round2(baseFare + distCharge + weightCharge);
      const gstAmt      = round2(subtotal * ((Number(cfg.gstPercent) || 0) / 100));
      const platFee     = Number(cfg.incityPlatformFee) || 0;
      const beforeCoupon = round2(subtotal + gstAmt + platFee);
      const customerTotal = round2(Math.max(0, beforeCoupon - couponAmt));
      const commAmt     = round2(customerTotal * (commissionPct / 100));
      const riderPayout = round2(customerTotal - commAmt);

      const rows = [
        { label: "Base Fare", note: `Flat rate for ${vehicleName}`, amount: baseFare },
        { label: "Distance Charge", note: `${billableKm} km × ₹${perKm}/km${dist < minKm ? ` (min ${minKm} km applied)` : ""}`, amount: distCharge },
        ...(wt > 0 ? [{ label: "Weight Charge", note: weightNote, amount: weightCharge }] : []),
      ];

      setResult({ serviceType, deliveryType: null, vehicleName, paymentMode, commissionPct, rows, subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee, couponAmt, beforeCoupon, customerTotal, commissionAmount: commAmt, riderPayout, ratesUsed: { baseFare, perKm, minKm }, manualMode });

    } else {
      const includePickup = deliveryType === "DOOR_TO_DOOR" || deliveryType === "DOOR_TO_HUB";
      const includeDrop   = deliveryType === "DOOR_TO_DOOR" || deliveryType === "HUB_TO_DOOR";

      let pickupCost, dropCost, corridorCost, weightCharge, weightNote;
      let pickupNote, dropNote, pickupVehicle, dropVehicle;
      let ratesUsed;

      if (manualMode) {
        const mo = manualOutstation;
        pickupCost   = includePickup ? legCostManual(pKm, mo.pickupBaseFare, mo.pickupMinKm, mo.pickupRatePerKm) : 0;
        dropCost     = includeDrop   ? legCostManual(dKm, mo.dropBaseFare,   mo.dropMinKm,   mo.dropRatePerKm)   : 0;
        const corrRate = Number(mo.corridorRatePerKm) || 0;
        corridorCost = round2(dist * corrRate);
        const pkgRate  = Number(mo.perKgRate) || 0;
        weightCharge = wt > 0 ? round2(wt * pkgRate) : 0;
        weightNote   = wt > 0 ? `${wt} kg × ₹${pkgRate}/kg (manual)` : null;
        pickupNote   = includePickup ? legCostNoteManual(pKm, mo.pickupBaseFare, mo.pickupMinKm, mo.pickupRatePerKm) : null;
        dropNote     = includeDrop   ? legCostNoteManual(dKm, mo.dropBaseFare,   mo.dropMinKm,   mo.dropRatePerKm)   : null;
        pickupVehicle = "Manual";
        dropVehicle   = "Manual";
        ratesUsed = {
          corridorRate: corrRate,
          pickupTier: { baseFare: mo.pickupBaseFare, minimumKm: mo.pickupMinKm, ratePerKm: mo.pickupRatePerKm },
          dropTier:   { baseFare: mo.dropBaseFare,   minimumKm: mo.dropMinKm,   ratePerKm: mo.dropRatePerKm },
        };
      } else {
        const pickupTier   = resolveLegTier(cfg.pickupLegTiers, wt);
        const dropTier     = resolveLegTier(cfg.dropLegTiers,   wt);
        const corridorRate = Number(cfg.defaultRouteRatePerKm) || 0;
        pickupCost   = includePickup ? legCost(pKm, pickupTier, cfg.pickupRatePerKm) : 0;
        dropCost     = includeDrop   ? legCost(dKm, dropTier,   cfg.dropRatePerKm)   : 0;
        corridorCost = round2(dist * corridorRate);
        weightCharge = resolveWeightCost(wt, cfg.weightCostSlabs, cfg.perKgRate);
        weightNote   = wt > 0 ? weightCostNote(wt, cfg.weightCostSlabs, cfg.perKgRate) : null;
        pickupNote   = includePickup ? legCostNote(pKm, pickupTier, cfg.pickupRatePerKm) : null;
        dropNote     = includeDrop   ? legCostNote(dKm, dropTier,   cfg.dropRatePerKm)   : null;
        pickupVehicle = pickupTier?.vehicleName ?? "—";
        dropVehicle   = dropTier?.vehicleName   ?? "—";
        ratesUsed = { corridorRate, pickupTier, dropTier };
      }

      const subtotal      = round2(pickupCost + corridorCost + dropCost + weightCharge);
      const gstAmt        = round2(subtotal * ((Number(cfg.gstPercent) || 0) / 100));
      const platFee       = Number(cfg.outstationPlatformFee) || 0;
      const beforeCoupon  = round2(subtotal + gstAmt + platFee);
      const customerTotal = round2(Math.max(0, beforeCoupon - couponAmt));
      const commAmt       = round2(customerTotal * (commissionPct / 100));
      const riderPayout   = round2(customerTotal - commAmt);

      const rows = [
        ...(includePickup ? [{ label: `Pickup Leg${pickupVehicle !== "—" && pickupVehicle !== "Manual" ? ` · ${pickupVehicle}` : ""}`, note: pickupNote, amount: pickupCost }] : []),
        { label: "Hub-to-Hub Corridor", note: `${dist} km × ₹${ratesUsed.corridorRate}/km`, amount: corridorCost },
        ...(includeDrop ? [{ label: `Drop Leg${dropVehicle !== "—" && dropVehicle !== "Manual" ? ` · ${dropVehicle}` : ""}`, note: dropNote, amount: dropCost }] : []),
        ...(wt > 0 ? [{ label: "Weight Charge", note: weightNote, amount: weightCharge }] : []),
      ];

      setResult({ serviceType, deliveryType, vehicleName: null, pickupVehicle, dropVehicle, paymentMode, commissionPct, rows, subtotal, gst: { pct: cfg.gstPercent, amount: gstAmt }, platformFee: platFee, couponAmt, beforeCoupon, customerTotal, commissionAmount: commAmt, riderPayout, ratesUsed, manualMode });
    }
  }

  function weightCostNote(wt, slabs, perKgRate) {
    const match = (slabs ?? [])
      .filter(s => s.isActive !== false)
      .find(s => wt >= Number(s.minWeightKg) && wt < Number(s.maxWeightKg));
    if (match) return `${wt} kg → ${match.minWeightKg}–${match.maxWeightKg} kg slab = ₹${match.flatCost} flat`;
    return `${wt} kg × ₹${perKgRate}/kg (fallback)`;
  }

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

        {/* LEFT PANEL */}
        <div className="space-y-4">

          {/* Service Type */}
          <section className="surface p-5">
            <SectionLabel>Service Type</SectionLabel>
            <div className="grid grid-cols-2 gap-2 mt-3">
              {["IN_CITY", "OUTSTATION"].map(t => (
                <button key={t} type="button"
                  onClick={() => { setServiceType(t); resetResult(); setManualMode(false); }}
                  className={`h-11 rounded-sm border text-[13px] font-semibold transition ${serviceType === t ? "bg-zinc-900 text-white border-zinc-900" : "border-[var(--border-default)] text-zinc-700 hover:border-zinc-400"}`}
                  data-testid={`service-${t}`}
                >
                  {t === "IN_CITY" ? "In-City Local" : "Outstation"}
                </button>
              ))}
            </div>
          </section>

          {/* Manual Override Toggle */}
          <button type="button" onClick={toggleManual}
            className={`w-full flex items-center gap-2 px-4 py-3 rounded-sm border text-[12px] font-semibold transition ${manualMode ? "bg-amber-50 border-amber-400 text-amber-800" : "border-[var(--border-default)] text-zinc-600 hover:border-zinc-400"}`}
            data-testid="manual-override-toggle"
          >
            <SlidersHorizontal size={14} />
            {manualMode ? "Manual Override — ON (click to use config rates)" : "Manual Override — use custom rates"}
          </button>

          {/* Manual In-City rate fields */}
          {manualMode && serviceType === "IN_CITY" && (
            <section className="surface p-5 border-l-4 border-amber-400">
              <div className="text-[11px] uppercase tracking-wider text-amber-700 font-medium mb-3">Custom In-City Rates</div>
              <div className="space-y-3">
                <NumField label="Base Fare (₹)" value={manualInCity.baseFare} onChange={v => setMIC("baseFare", v)} placeholder="e.g. 30" />
                <NumField label="Rate / KM (₹)" value={manualInCity.perKm}    onChange={v => setMIC("perKm", v)}    placeholder="e.g. 12" />
                <NumField label="Minimum KM"    value={manualInCity.minKm}    onChange={v => setMIC("minKm", v)}    placeholder="e.g. 3" />
                <NumField label="Per KG Rate (₹)" value={manualInCity.perKgRate} onChange={v => setMIC("perKgRate", v)} placeholder="e.g. 5" />
              </div>
            </section>
          )}

          {/* Manual Outstation rate fields */}
          {manualMode && serviceType === "OUTSTATION" && (
            <section className="surface p-5 border-l-4 border-amber-400">
              <div className="text-[11px] uppercase tracking-wider text-amber-700 font-medium mb-3">Custom Outstation Rates</div>
              <div className="space-y-4">
                <div>
                  <div className="text-[11px] text-zinc-500 font-medium mb-2">Pickup Leg</div>
                  <div className="space-y-2">
                    <NumField label="Base Fare (₹)"  value={manualOutstation.pickupBaseFare}  onChange={v => setMOS("pickupBaseFare", v)}  placeholder="e.g. 40" />
                    <NumField label="Minimum KM"      value={manualOutstation.pickupMinKm}     onChange={v => setMOS("pickupMinKm", v)}     placeholder="e.g. 3" />
                    <NumField label="Rate / KM (₹)"  value={manualOutstation.pickupRatePerKm} onChange={v => setMOS("pickupRatePerKm", v)} placeholder="e.g. 15" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 font-medium mb-2">Hub-to-Hub Corridor</div>
                  <NumField label="Rate / KM (₹)" value={manualOutstation.corridorRatePerKm} onChange={v => setMOS("corridorRatePerKm", v)} placeholder="e.g. 10" />
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 font-medium mb-2">Drop Leg</div>
                  <div className="space-y-2">
                    <NumField label="Base Fare (₹)"  value={manualOutstation.dropBaseFare}  onChange={v => setMOS("dropBaseFare", v)}  placeholder="e.g. 35" />
                    <NumField label="Minimum KM"      value={manualOutstation.dropMinKm}     onChange={v => setMOS("dropMinKm", v)}     placeholder="e.g. 3" />
                    <NumField label="Rate / KM (₹)"  value={manualOutstation.dropRatePerKm} onChange={v => setMOS("dropRatePerKm", v)} placeholder="e.g. 12" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-zinc-500 font-medium mb-2">Weight</div>
                  <NumField label="Per KG Rate (₹)" value={manualOutstation.perKgRate} onChange={v => setMOS("perKgRate", v)} placeholder="e.g. 5" />
                </div>
              </div>
            </section>
          )}

          {/* Vehicle selector — IN_CITY + config mode only */}
          {serviceType === "IN_CITY" && !manualMode && (
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
                      <div className="text-[11px] text-zinc-500 mono">₹{v.base_fare} base · ₹{v.per_km}/km · min {v.min_distance} km</div>
                    </div>
                    {String(vehicleId) === String(v.id) && <CheckCircle2 size={18} className="text-zinc-900 flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Outstation info banner — config mode only */}
          {serviceType === "OUTSTATION" && !manualMode && (
            <div className="surface p-4 flex gap-3 border-l-4 border-blue-400 bg-blue-50">
              <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-blue-800">
                Vehicle is auto-selected per leg based on parcel weight and leg tier configuration in App Config.
              </div>
            </div>
          )}

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
              <NumField label="Parcel Weight (kg)" value={weight} onChange={v => { setWeight(v); resetResult(); }} placeholder="e.g. 2" />
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

          {/* Coupon / Discount */}
          <section className="surface p-5">
            <SectionLabel>Coupon / Discount</SectionLabel>
            <div className="mt-3">
              <NumField label="Discount Amount (₹)" value={coupon} onChange={v => { setCoupon(v); resetResult(); }} placeholder="e.g. 20 (optional)" />
              <p className="text-[11px] text-zinc-400 mt-1.5">Applied after GST + platform fee. Customer pays the reduced amount.</p>
            </div>
          </section>

          <button type="button" onClick={calculate}
            className="btn-primary w-full h-12 text-[13px] flex items-center justify-center gap-2"
            data-testid="calculate-btn"
          >
            <Calculator size={16} />
            Calculate Fare
            <ChevronRight size={14} className="opacity-60" />
          </button>
        </div>

        {/* RIGHT PANEL */}
        <div>
          {!result ? <EmptyState /> : <ResultPanel result={result} />}
        </div>
      </div>
    </div>
  );
}

function ResultPanel({ result }) {
  const modeLabel    = result.paymentMode === "ONLINE" ? "Online" : result.paymentMode === "COD_CASH" ? "COD Cash" : "COD QR";
  const serviceLabel = result.serviceType === "IN_CITY" ? "In-City Local" : "Outstation";
  const dtLabel      = result.deliveryType ? DELIVERY_TYPES.find(d => d.value === result.deliveryType)?.label : null;
  const vehicleLabel = result.vehicleName ?? (result.serviceType === "OUTSTATION" ? `Pickup: ${result.pickupVehicle} · Drop: ${result.dropVehicle}` : null);

  return (
    <div className="space-y-4" data-testid="fare-result">

      {/* Summary card */}
      <div className="surface p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Fare Estimate</div>
            <div className="text-[15px] font-bold mt-1">{vehicleLabel}</div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="pill bg-zinc-100 text-zinc-700 border-zinc-200">{serviceLabel}{dtLabel ? ` · ${dtLabel}` : ""}</span>
              <span className="pill bg-zinc-100 text-zinc-700 border-zinc-200">{modeLabel}</span>
              <span className="pill bg-blue-50 text-blue-800 border-blue-200">{result.commissionPct}% commission</span>
              {result.manualMode && <span className="pill bg-amber-50 text-amber-800 border-amber-300">Manual Override</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400">Customer Pays</div>
            <div className="text-4xl font-bold mono mt-1 text-zinc-900">₹{result.customerTotal.toFixed(2)}</div>
            {result.couponAmt > 0 && (
              <div className="text-[11px] text-emerald-600 mono mt-1">−₹{result.couponAmt.toFixed(2)} coupon applied</div>
            )}
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
            <tr className="bg-[var(--slate-50)] border-b border-[var(--border-default)]">
              <td className="px-5 py-3 font-semibold text-zinc-700 text-[13px]">Subtotal</td>
              <td className="px-5 py-3 text-right mono font-bold text-[14px]">₹{result.subtotal.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-[var(--border-default)]">
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">GST</div>
                <div className="text-[11px] text-zinc-500 mono">{result.gst.pct}% on subtotal</div>
              </td>
              <td className="px-5 py-3 text-right mono font-semibold">₹{result.gst.amount.toFixed(2)}</td>
            </tr>
            <tr className="border-b border-[var(--border-default)]">
              <td className="px-5 py-3">
                <div className="font-medium text-zinc-900">Platform Fee</div>
                <div className="text-[11px] text-zinc-500 mono">Flat fee per {result.serviceType === "IN_CITY" ? "in-city" : "outstation"} order</div>
              </td>
              <td className="px-5 py-3 text-right mono font-semibold">₹{result.platformFee.toFixed(2)}</td>
            </tr>
            {result.couponAmt > 0 && (
              <tr className="border-b border-[var(--border-default)] bg-emerald-50">
                <td className="px-5 py-3">
                  <div className="font-medium text-emerald-800">Coupon / Discount</div>
                  <div className="text-[11px] text-emerald-600 mono">Deducted from ₹{result.beforeCoupon.toFixed(2)}</div>
                </td>
                <td className="px-5 py-3 text-right mono font-semibold text-emerald-700">−₹{result.couponAmt.toFixed(2)}</td>
              </tr>
            )}
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

      {/* Rates used */}
      <div className="surface p-4">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 mb-2">Rates Used</div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-zinc-500 mono">
          {result.serviceType === "IN_CITY" ? (
            <>
              <span>Base fare: ₹{result.ratesUsed.baseFare}</span>
              <span>Per km: ₹{result.ratesUsed.perKm}</span>
              <span>Min km: {result.ratesUsed.minKm} km</span>
            </>
          ) : (
            <>
              {result.ratesUsed.pickupTier && <span>Pickup: ₹{result.ratesUsed.pickupTier.baseFare} base + ₹{result.ratesUsed.pickupTier.ratePerKm}/km (min {result.ratesUsed.pickupTier.minimumKm} km)</span>}
              {result.ratesUsed.dropTier   && <span>Drop: ₹{result.ratesUsed.dropTier.baseFare} base + ₹{result.ratesUsed.dropTier.ratePerKm}/km (min {result.ratesUsed.dropTier.minimumKm} km)</span>}
              <span>Corridor: ₹{result.ratesUsed.corridorRate}/km</span>
            </>
          )}
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
        <div className="text-[12px] text-zinc-400 mt-1">Select a service type, enter distances &amp; weight<br />and click Calculate Fare</div>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-3 w-full max-w-xs text-[11px]">
        {["1. Choose service type", "2. Enter distances & weight", "3. Pick payment mode"].map((s, i) => (
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

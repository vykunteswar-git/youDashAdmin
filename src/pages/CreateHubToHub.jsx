import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import { buildLrPdfData, downloadH2hInvoice } from "@/lib/h2hInvoicePdf";
import { toast } from "sonner";
import { ArrowLeft, Building2, Calculator, FileDown, Package, PenLine, User } from "lucide-react";

const EMPTY = {
  pickupZoneId: "",
  originHubId: "",
  dropZoneId: "",
  destinationHubId: "",
  weight: "",
  qty: "1",
  categoryId: "",
  paymentType: "COD",
  senderName: "",
  senderPhone: "",
  receiverName: "",
  receiverPhone: "",
  packageContents: "",
  pricingMode: "auto",
  manualFreight: "",
  manualGstPct: "",
  manualPlatformFee: "",
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

export default function CreateHubToHub() {
  const nav = useNavigate();
  const [zones, setZones] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get("/zones"),
      api.get("/hubs"),
      api.get("/categories"),
    ]).then(([zr, hr, cr]) => {
      setZones(zr.data?.zones ?? []);
      setHubs(hr.data?.hubs ?? []);
      setCategories((cr.data?.categories ?? []).filter((c) => c.active !== false));
    });
  }, []);

  const pickupHubs = useMemo(
    () => hubs.filter((h) => String(h.zone_id) === String(form.pickupZoneId)),
    [hubs, form.pickupZoneId],
  );
  const dropHubs = useMemo(
    () => hubs.filter((h) => String(h.zone_id) === String(form.dropZoneId)),
    [hubs, form.dropZoneId],
  );

  const pickupZone = zones.find((z) => String(z.id) === String(form.pickupZoneId));
  const dropZone = zones.find((z) => String(z.id) === String(form.dropZoneId));
  const originHub = pickupHubs.find((h) => String(h.id) === String(form.originHubId));
  const destHub = dropHubs.find((h) => String(h.id) === String(form.destinationHubId));
  const category = categories.find((c) => String(c.id) === String(form.categoryId));

  useEffect(() => {
    const weight = parseFloat(form.weight);
    if (!form.originHubId || !form.destinationHubId || !Number.isFinite(weight) || weight <= 0) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(async () => {
      setQuoteLoading(true);
      try {
        const res = await api.post("/orders/hub-to-hub/preview", {
          originHubId: Number(form.originHubId),
          destinationHubId: Number(form.destinationHubId),
          weight,
        });
        setQuote(res.data);
      } catch (err) {
        setQuote(null);
        toast.error(err?.response?.data?.message || "Could not calculate price");
      } finally {
        setQuoteLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [form.originHubId, form.destinationHubId, form.weight]);

  const manualGstAmt = useMemo(() => {
    const f = parseFloat(form.manualFreight) || 0;
    const pct = parseFloat(form.manualGstPct) || 0;
    return parseFloat(((f * pct) / 100).toFixed(2));
  }, [form.manualFreight, form.manualGstPct]);

  const manualTotal = useMemo(() => {
    const f = parseFloat(form.manualFreight) || 0;
    const p = parseFloat(form.manualPlatformFee) || 0;
    return parseFloat((f + manualGstAmt + p).toFixed(2));
  }, [form.manualFreight, manualGstAmt, form.manualPlatformFee]);

  const isManual = form.pricingMode === "manual";

  function set(k, v) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  async function submit(e) {
    e.preventDefault();
    const weight = parseFloat(form.weight);
    if (!form.originHubId || !form.destinationHubId || !form.categoryId) {
      toast.error("Select origin hub, destination hub, and category");
      return;
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      toast.error("Enter a valid weight");
      return;
    }
    if (!form.senderName.trim() || !form.senderPhone.trim() || !form.receiverName.trim() || !form.receiverPhone.trim()) {
      toast.error("Sender and receiver details are required");
      return;
    }
    if (isManual && !(parseFloat(form.manualFreight) > 0)) {
      toast.error("Enter freight charge for manual pricing");
      return;
    }
    setBooking(true);
    try {
      const res = await api.post("/orders/hub-to-hub", {
        originHubId: Number(form.originHubId),
        destinationHubId: Number(form.destinationHubId),
        weight,
        quantity: parseInt(form.qty) || 1,
        categoryId: Number(form.categoryId),
        paymentType: form.paymentType,
        senderName: form.senderName.trim(),
        senderPhone: form.senderPhone.trim(),
        receiverName: form.receiverName.trim(),
        receiverPhone: form.receiverPhone.trim(),
        packageContents: form.packageContents.trim() || undefined,
        ...(isManual && {
          manualPricing: true,
          manualFreight: parseFloat(form.manualFreight) || 0,
          manualGst: manualGstAmt,
          manualPlatformFee: parseFloat(form.manualPlatformFee) || 0,
        }),
      });
      const order = res.data;
      toast.success(`Booked ${order.displayOrderId || order.tracking_id}`);

      const effectiveQuote = isManual
        ? { subtotal: parseFloat(form.manualFreight) || 0, gstAmount: manualGstAmt, platformFee: parseFloat(form.manualPlatformFee) || 0, total: manualTotal }
        : quote;
      downloadH2hInvoice(
        buildLrPdfData({
          form,
          originHub,
          destinationHub: destHub,
          pickupZone,
          dropZone,
          category,
          order: { ...order, weight, quantity: parseInt(form.qty) || 1 },
          quote: effectiveQuote,
        }),
      );

      nav(`/orders/${order.id}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Booking failed");
    } finally {
      setBooking(false);
    }
  }

  return (
    <div data-testid="create-h2h-page">
      <Link to="/orders" className="inline-flex items-center text-[12px] text-zinc-500 hover:text-zinc-900 mb-3">
        <ArrowLeft size={14} /> Back to orders
      </Link>

      <PageHeader
        title="Book Hub to Hub"
        subtitle="Admin-only corridor booking — hub + weight + GST + platform fee"
      />

      <form onSubmit={submit} className="grid grid-cols-3 gap-4">
        <div className="col-span-2 surface p-5 space-y-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-700">
            <Building2 size={14} /> Route
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Pickup zone">
              <select className="input w-full" value={form.pickupZoneId}
                onChange={(e) => { set("pickupZoneId", e.target.value); set("originHubId", ""); }}>
                <option value="">Select zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
            <Field label="Origin hub">
              <select className="input w-full" value={form.originHubId}
                onChange={(e) => set("originHubId", e.target.value)} disabled={!form.pickupZoneId}>
                <option value="">Select hub</option>
                {pickupHubs.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
              </select>
            </Field>
            <Field label="Drop zone">
              <select className="input w-full" value={form.dropZoneId}
                onChange={(e) => { set("dropZoneId", e.target.value); set("destinationHubId", ""); }}>
                <option value="">Select zone</option>
                {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
            </Field>
            <Field label="Destination hub">
              <select className="input w-full" value={form.destinationHubId}
                onChange={(e) => set("destinationHubId", e.target.value)} disabled={!form.dropZoneId}>
                <option value="">Select hub</option>
                {dropHubs.map((h) => <option key={h.id} value={h.id}>{h.name} · {h.city}</option>)}
              </select>
            </Field>
          </div>

          <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-700 pt-2">
            <User size={14} /> Parties
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Sender name">
              <input className="input w-full" value={form.senderName} onChange={(e) => set("senderName", e.target.value)} />
            </Field>
            <Field label="Sender phone">
              <input className="input w-full" value={form.senderPhone} onChange={(e) => set("senderPhone", e.target.value)} />
            </Field>
            <Field label="Receiver name">
              <input className="input w-full" value={form.receiverName} onChange={(e) => set("receiverName", e.target.value)} />
            </Field>
            <Field label="Receiver phone">
              <input className="input w-full" value={form.receiverPhone} onChange={(e) => set("receiverPhone", e.target.value)} />
            </Field>
          </div>

          <div className="flex items-center gap-2 text-[13px] font-medium text-zinc-700 pt-2">
            <Package size={14} /> Parcel
          </div>
          <div className="grid grid-cols-4 gap-4">
            <Field label="Weight (kg)">
              <input type="number" min="0.1" step="0.1" className="input w-full"
                value={form.weight} onChange={(e) => set("weight", e.target.value)} />
            </Field>
            <Field label="Qty">
              <input type="number" min="1" step="1" className="input w-full"
                value={form.qty} onChange={(e) => set("qty", e.target.value)} />
            </Field>
            <Field label="Category">
              <select className="input w-full" value={form.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
                <option value="">Select category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Payment">
              <select className="input w-full" value={form.paymentType} onChange={(e) => set("paymentType", e.target.value)}>
                <option value="COD">COD (collected at desk)</option>
                <option value="ONLINE">Online / Prepaid</option>
              </select>
            </Field>
          </div>
          <Field label="Contents (optional)">
            <input className="input w-full" value={form.packageContents}
              onChange={(e) => set("packageContents", e.target.value)} placeholder="e.g. Documents, clothes" />
          </Field>
        </div>

        <div className="surface p-5 h-fit space-y-4">
          {/* Pricing mode toggle */}
          <div className="flex items-center gap-2 text-[13px] font-medium">
            <Calculator size={14} /> Pricing
          </div>
          <div className="flex rounded-sm border border-[var(--border-default)] overflow-hidden text-[12px]">
            <button type="button"
              onClick={() => set("pricingMode", "auto")}
              className={`flex-1 py-1.5 transition ${!isManual ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}>
              Auto (Config)
            </button>
            <button type="button"
              onClick={() => set("pricingMode", "manual")}
              className={`flex-1 py-1.5 transition border-l border-[var(--border-default)] flex items-center justify-center gap-1.5 ${isManual ? "bg-zinc-900 text-white" : "hover:bg-zinc-50"}`}>
              <PenLine size={12} /> Manual
            </button>
          </div>

          {/* Auto mode — quote display */}
          {!isManual && (
            <>
              {quoteLoading && <p className="text-[12px] text-zinc-500">Calculating…</p>}
              {!quoteLoading && !quote && (
                <p className="text-[12px] text-zinc-500">Select hubs and weight to see pricing.</p>
              )}
              {quote && (
                <div className="text-[13px] space-y-1 mono">
                  <Row label="Hub corridor" value={quote.hubCost} />
                  <Row label="Weight" value={quote.weightCost} />
                  <hr className="my-2 border-zinc-200" />
                  <Row label="Freight (subtotal)" value={quote.subtotal} bold />
                  <Row label="L Charges" value={quote.platformFee} />
                  <Row label="GST" value={quote.gstAmount} />
                  <hr className="my-2 border-zinc-200" />
                  <Row label="Total" value={quote.total} bold />
                  {quote.hubDistanceKm != null && (
                    <p className="text-[11px] text-zinc-500 pt-2">Corridor: {quote.hubDistanceKm} km</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* Manual mode — price inputs */}
          {isManual && (
            <div className="space-y-3">
              <Field label="Freight charge (₹)">
                <input type="number" min="0" step="0.01" className="input w-full"
                  placeholder="0.00" value={form.manualFreight}
                  onChange={(e) => set("manualFreight", e.target.value)} />
              </Field>
              <Field label="GST (%)">
                <input type="number" min="0" max="100" step="0.1" className="input w-full"
                  placeholder="0" value={form.manualGstPct}
                  onChange={(e) => set("manualGstPct", e.target.value)} />
                {manualGstAmt > 0 && (
                  <span className="text-[11px] text-zinc-500 mt-0.5 block">= ₹{manualGstAmt.toFixed(2)}</span>
                )}
              </Field>
              <Field label="Platform fee (₹)">
                <input type="number" min="0" step="0.01" className="input w-full"
                  placeholder="0.00" value={form.manualPlatformFee}
                  onChange={(e) => set("manualPlatformFee", e.target.value)} />
              </Field>
              <div className="flex justify-between text-[13px] font-semibold border-t border-zinc-200 pt-2 mono">
                <span>Total</span>
                <span>₹{manualTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          <button type="submit"
            disabled={booking || (!isManual && !quote)}
            className="w-full bg-white text-black text-[13px] font-medium py-2.5 rounded-sm hover:bg-zinc-100 disabled:opacity-50 flex items-center justify-center gap-2">
            <FileDown size={14} /> {booking ? "Booking…" : "Book & download LR"}
          </button>
          <p className="text-[11px] text-zinc-500">
            Walk-in customers are fine — any sender/receiver name and phone. Status stays BOOKED; no riders or OTP.
          </p>
        </div>
      </form>
    </div>
  );
}

function Row({ label, value, bold = false }) {
  return (
    <div className={`flex justify-between ${bold ? "font-semibold" : ""}`}>
      <span className="text-zinc-500">{label}</span>
      <span>₹{Number(value ?? 0).toFixed(2)}</span>
    </div>
  );
}

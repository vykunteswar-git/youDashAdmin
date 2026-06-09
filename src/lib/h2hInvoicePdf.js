import { jsPDF } from "jspdf";

const COMPANY = "YouDash Express";
const LETTERHEAD = {
  title: "YOUDASH EXPRESS DELIVERY",
  address: "15-7-4, 38 BUS STOP BACK SIDE, OLD GAJUWAKA",
  gstin: "GSTIN : 37EJAPM5697C1ZY",
};
const GREY = 117;
const MARGIN = 8;
const PAGE_W = 210;
const CONTENT_W = PAGE_W - MARGIN * 2;
const LINE_W = 0.25;       // inner cell borders — thin
const OUTER_LINE_W = 0.5;  // outer body frame — thicker
const RS = "Rs.";

/** jsPDF standard fonts are Latin-1 only — strip rupee and other non-ASCII. */
function pdfSafe(text) {
  return String(text ?? "")
    .replace(/\u20B9/g, `${RS} `)
    .replace(/₹/g, `${RS} `)
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");
}

function formatInr(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateOnly(raw) {
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return pdfSafe(raw);
  }
}

function formatDateTime(raw) {
  if (!raw) return "-";
  try {
    const d = new Date(raw);
    const date = d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const time = d.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${date} ${time}`;
  } catch {
    return pdfSafe(raw);
  }
}

function printedAt() {
  return new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function drawCompanyLetterhead(doc, y) {
  const cx = PAGE_W / 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(LETTERHEAD.title, cx, y, { align: "center" });
  y += 5.5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(LETTERHEAD.address, cx, y, { align: "center" });
  y += 4;
  doc.text(LETTERHEAD.gstin, cx, y, { align: "center" });
  y += 4;

  doc.setFontSize(6.5);
  doc.setTextColor(GREY);
  doc.text(`Printed @ ${printedAt()}`, PAGE_W - MARGIN, y, { align: "right" });
  doc.setTextColor(0);
  return y + 4;
}

function paymentToLrType(paymentType) {
  const pt = String(paymentType || "").toUpperCase();
  return pt === "COD" ? "COD" : "Paid";
}

function hubFromObject(hub = {}, orderFallback = {}) {
  return {
    name: hub.name || orderFallback.name || "",
    city: hub.city || orderFallback.city || "",
    address: hub.address || orderFallback.address || "",
    phoneNumber: hub.phoneNumber || hub.phone_number || hub.phone || orderFallback.phoneNumber || "",
  };
}

/** Build structured LR payload from form + entities + API response. */
export function buildLrPdfData({
  form = {},
  originHub,
  destinationHub,
  destHub,
  pickupZone,
  dropZone,
  category,
  order = {},
  quote = {},
}) {
  const dest = destinationHub || destHub;
  const weightKg = Number(order.weight ?? order.weight_kg ?? form.weight ?? 0);
  const createdAt = order.createdAt || order.created_at || new Date().toISOString();
  const paymentType = order.paymentType || order.payment_mode || form.paymentType;
  const packageContents = (form.packageContents || order.packageContents || "").trim();

  return {
    companyName: COMPANY,
    originHub: hubFromObject(originHub, {
      name: order.originHubName || order.origin_hub_name,
      city: order.originHubCity || order.origin_city,
    }),
    destinationHub: hubFromObject(dest, {
      name: order.destinationHubName || order.destination_hub_name,
      city: order.destinationHubCity || order.destination_city,
    }),
    pickupZoneName: pickupZone?.name || order.pickupZoneName,
    dropZoneName: dropZone?.name || order.dropZoneName,
    lrNumber: order.displayOrderId || order.tracking_id || "",
    bookingDate: formatDateOnly(createdAt),
    bookingDateTime: formatDateTime(createdAt),
    lrType: paymentToLrType(paymentType),
    senderName: order.senderName || order.sender?.name || form.senderName || "",
    senderPhone: order.senderPhone || order.sender?.phone || form.senderPhone || "",
    receiverName: order.receiverName || order.receiver?.name || form.receiverName || "",
    receiverPhone: order.receiverPhone || order.receiver?.phone || form.receiverPhone || "",
    categoryName: category?.name || order.category || packageContents || "Parcel",
    weightKg,
    quantity: Number(order.quantity ?? order.pieceCount ?? order.piece_count ?? form.qty ?? 1),
    freightCharge: Number(order.subtotal ?? order.fare?.subtotal ?? quote?.subtotal ?? 0),
    gstAmount: Number(order.gstAmount ?? order.gst_amount ?? order.fare?.gst ?? quote?.gstAmount ?? 0),
    platformFee: Number(order.platformFee ?? order.platform_fee ?? order.fare?.platform_fee ?? quote?.platformFee ?? 0),
    netAmountPayable: Number(order.totalAmount ?? order.total_amount ?? order.fare?.total ?? quote?.total ?? 0),
    hubDistanceKm: order.hubDistanceKm ?? quote?.hubDistanceKm,
    valueOfGoods: Number(form.valueOfGoods || order.declaredValue || order.declared_value || order.valueOfGoods || 0) || null,
  };
}

function legacyToLrPdfData(params = {}) {
  return buildLrPdfData({
    form: {
      senderName: params.senderName,
      senderPhone: params.senderPhone,
      receiverName: params.receiverName,
      receiverPhone: params.receiverPhone,
      paymentType: params.paymentType,
    },
    originHub: { name: params.fromHub, address: params.fromHubAddress },
    destinationHub: { name: params.toHub, address: params.toHubAddress },
    category: { name: params.categoryName },
    order: {
      displayOrderId: params.displayOrderId,
      createdAt: params.createdAt,
      paymentType: params.paymentType,
      subtotal: params.subtotal,
      gstAmount: params.gstAmount,
      platformFee: params.platformFee,
      totalAmount: params.totalAmount,
      packageContents: params.categoryName,
    },
  });
}

function strokeRect(doc, x, y, w, h) {
  doc.setDrawColor(0);
  doc.setLineWidth(LINE_W);
  doc.rect(x, y, w, h, "S");
}

function drawHubHeader(doc, y, hub) {
  const addrParts = [pdfSafe(hub.address), pdfSafe(hub.city)].filter(Boolean);
  const phone = hub.phoneNumber ? `Ph.No: ${pdfSafe(hub.phoneNumber)}` : "";

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  let detail = addrParts.join(", ");
  if (phone) detail += (detail ? "  " : "") + phone;
  if (!detail) detail = "-";
  const lines = doc.splitTextToSize(detail, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 4 + 3;
}

/** Compact cell — small label on top, bold value below. Pass large=true for LR Number. */
function drawFieldCell(doc, x, y, w, h, label, value, { large = false } = {}) {
  strokeRect(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(0);
  doc.text(pdfSafe(label), x + 1.5, y + 3);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(large ? 10 : 8.5);
  const valLine = doc.splitTextToSize(pdfSafe(value || "-"), w - 3)[0];
  doc.text(valLine, x + 1.5, y + h - 1.8);
}

/** One row: Label | Value | Label | Value (reference sender/receiver rows). */
function drawLabelValueRow(doc, y, h, pairs) {
  const colW = CONTENT_W / (pairs.length * 2);
  let x = MARGIN;
  pairs.forEach(({ label, value }) => {
    strokeRect(doc, x, y, colW, h);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(0);
    doc.text(pdfSafe(label), x + 1.5, y + h / 2 + 0.8);
    x += colW;
    strokeRect(doc, x, y, colW, h);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    const line = doc.splitTextToSize(pdfSafe(value || "-"), colW - 3)[0];
    doc.text(line, x + 1.5, y + h / 2 + 0.8);
    x += colW;
  });
}

function drawTableRow(doc, y, h, cols, values, { bold = false, header = false } = {}) {
  let x = MARGIN;
  cols.forEach((w, i) => {
    strokeRect(doc, x, y, w, h);
    const isBold = header || bold;
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.setFontSize(header ? 7 : 8);
    doc.setTextColor(0);
    const val = pdfSafe(values[i] ?? "");
    if (i === 1) {
      doc.text(val, x + w / 2, y + h / 2 + 0.8, { align: "center" });
    } else if (i === cols.length - 1) {
      doc.text(val, x + w - 1.5, y + h / 2 + 0.8, { align: "right" });
    } else {
      doc.text(val, x + 1.5, y + h / 2 + 0.8);
    }
    x += w;
  });
}

function renderLrPdf(data) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN + 2;

  // ── Company letterhead ──
  y = drawCompanyLetterhead(doc, y);
  y += 2;

  // ── Hub header (prominent, like reference — no box) ──
  y = drawHubHeader(doc, y, data.originHub);
  y = drawHubHeader(doc, y, data.destinationHub);
  y += 1;

  const bodyTop = y;
  const col4 = CONTENT_W / 4;
  const rowH = 11;
  const hubLabel = (hub) => {
    const parts = [hub.name, hub.address, hub.city].filter(Boolean).map(pdfSafe);
    return parts.join(", ") || "-";
  };

  // ── Row 1: LR Number | From | To | Date ──
  drawFieldCell(doc, MARGIN, y, col4, rowH, "LR Number", data.lrNumber, { large: true });
  drawFieldCell(doc, MARGIN + col4, y, col4, rowH, "From", hubLabel(data.originHub));
  drawFieldCell(doc, MARGIN + col4 * 2, y, col4, rowH, "To", hubLabel(data.destinationHub));
  drawFieldCell(doc, MARGIN + col4 * 3, y, col4, rowH, "Date", data.bookingDate);
  y += rowH;

  // ── Sender / Receiver (label | value | label | value per row) ──
  const partyH = 6.5;
  drawLabelValueRow(doc, y, partyH, [
    { label: "Sender Name", value: data.senderName },
    { label: "Receiver Name", value: data.receiverName },
  ]);
  y += partyH;
  drawLabelValueRow(doc, y, partyH, [
    { label: "Mobile No", value: data.senderPhone },
    { label: "Mobile No", value: data.receiverPhone },
  ]);
  y += partyH;

  // ── Item table (compact — reference proportions) ──
  const descW = CONTENT_W * 0.58;
  const qtyW = CONTENT_W * 0.12;
  const freightW = CONTENT_W - descW - qtyW;
  const tblCols = [descW, qtyW, freightW];
  const tblRowH = 6;

  drawTableRow(
    doc,
    y,
    tblRowH,
    tblCols,
    ["Item Description", "Quantity", `Freight Charge (${RS})`],
    { header: true },
  );
  y += tblRowH;

  const itemDesc = pdfSafe(data.categoryName?.trim() || "Parcel");
  drawTableRow(doc, y, tblRowH, tblCols, [itemDesc, String(data.quantity ?? 1), formatInr(data.freightCharge)]);
  y += tblRowH;
  drawTableRow(
    doc,
    y,
    tblRowH,
    tblCols,
    ["Totals", String(data.quantity ?? 1), formatInr(data.freightCharge)],
    { bold: true },
  );
  y += tblRowH;

  // ── Charges block — clean two-column rows ──
  const labelW = CONTENT_W * 0.65;
  const amtW = CONTENT_W - labelW;
  const chRowH = 6;

  const chargeRows = [
    { label: "Value of the Goods", amount: data.valueOfGoods != null ? formatInr(data.valueOfGoods) : null, bold: false },
    { label: `GST (${RS})`, amount: formatInr(data.gstAmount), bold: false },
    { label: `L Charges (${RS})`, amount: formatInr(data.platformFee), bold: false },
    { label: `Net Amt Payable (${RS})`, amount: formatInr(data.netAmountPayable), bold: true },
  ];

  chargeRows.forEach(({ label, amount, bold }) => {
    strokeRect(doc, MARGIN, y, labelW, chRowH);
    strokeRect(doc, MARGIN + labelW, y, amtW, chRowH);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(bold ? 8.5 : 7.5);
    doc.setTextColor(0);
    doc.text(pdfSafe(label), MARGIN + 2, y + chRowH / 2 + 0.8);
    if (amount != null) {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(amount, MARGIN + CONTENT_W - 2, y + chRowH / 2 + 0.8, { align: "right" });
    }
    y += chRowH;
  });

  // Outer frame — thicker than inner cell borders
  doc.setDrawColor(0);
  doc.setLineWidth(OUTER_LINE_W);
  doc.rect(MARGIN, bodyTop, CONTENT_W, y - bodyTop, "S");
  doc.setLineWidth(LINE_W);
  y += 4;

  // Booked by Admin — outside the box, small italic
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(GREY);
  doc.text(pdfSafe(`Booked by Admin at ${data.bookingDateTime}`), MARGIN, y);
  doc.setTextColor(0);
  y += 6;

  // ── Terms & Conditions ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(0);
  doc.text("Terms & Conditions :", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  const terms = [
    "1. We are not responsible for damages to perishable articles or goods improperly packed.",
    "2. No complaint regarding shortage or damage will be entertained unless reported at the time of delivery.",
    "3. No complain after one month from the date of booking will be entertained.",
    "4. We are not responsible for fire, accident, hijacking, or other circumstances beyond our control.",
    "5. The responsibility of the company ceases on delivery of goods to the consignee or authorised person.",
    "6. Local tax, if applicable, will be borne by the receiver.",
  ];
  terms.forEach((t) => {
    const lines = doc.splitTextToSize(pdfSafe(t), CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 3.5;
  });

  return doc;
}

/**
 * Generate and download Hub-to-Hub LR PDF.
 * Accepts LrPdfData from buildLrPdfData() or legacy flat params (Order Detail).
 */
export function downloadH2hInvoice(input) {
  const data = input?.companyName ? input : legacyToLrPdfData(input ?? {});

  const doc = renderLrPdf(data);
  const safeId = String(data.lrNumber || "order").replace(/[^A-Za-z0-9_-]/g, "_");
  doc.save(`LR_${safeId}.pdf`);
}

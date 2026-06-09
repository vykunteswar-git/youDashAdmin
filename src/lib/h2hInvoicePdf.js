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
const LINE_W = 0.35;
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
  doc.setFontSize(14);
  doc.text(LETTERHEAD.title, cx, y, { align: "center" });
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(LETTERHEAD.address, cx, y, { align: "center" });
  y += 4;
  doc.text(LETTERHEAD.gstin, cx, y, { align: "center" });
  y += 4;

  doc.setFontSize(7);
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
    quantity: 1,
    freightCharge: Number(order.subtotal ?? order.fare?.subtotal ?? quote?.subtotal ?? 0),
    gstAmount: Number(order.gstAmount ?? order.gst_amount ?? order.fare?.gst ?? quote?.gstAmount ?? 0),
    platformFee: Number(order.platformFee ?? order.platform_fee ?? order.fare?.platform_fee ?? quote?.platformFee ?? 0),
    netAmountPayable: Number(order.totalAmount ?? order.total_amount ?? order.fare?.total ?? quote?.total ?? 0),
    hubDistanceKm: order.hubDistanceKm ?? quote?.hubDistanceKm,
    remarks: packageContents || `Weight: ${weightKg} kg`,
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
  const name = pdfSafe(hub.name || "-");
  const addrParts = [pdfSafe(hub.address), pdfSafe(hub.city)].filter(Boolean);
  const phones = hub.phoneNumber ? `Ph.No: ${pdfSafe(hub.phoneNumber)}` : "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`${name} :-`, MARGIN, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  let detail = COMPANY;
  if (addrParts.length) detail += `; ${addrParts.join(", ")}`;
  if (phones) detail += ` ${phones}`;
  const lines = doc.splitTextToSize(detail, CONTENT_W);
  doc.text(lines, MARGIN, y);
  return y + lines.length * 4.2 + 4;
}

/** Compact cell — small label on top, value directly below (reference proportions). */
function drawFieldCell(doc, x, y, w, h, label, value) {
  strokeRect(doc, x, y, w, h);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text(pdfSafe(label), x + 1.5, y + 3.2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.8);
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
    doc.setFontSize(6.2);
    doc.text(pdfSafe(label), x + 1.5, y + h / 2 + 0.8);
    x += colW;
    strokeRect(doc, x, y, colW, h);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.8);
    const line = doc.splitTextToSize(pdfSafe(value || "-"), colW - 3)[0];
    doc.text(line, x + 1.5, y + h / 2 + 0.8);
    x += colW;
  });
}

function drawTableRow(doc, y, h, cols, values, { bold = false, header = false } = {}) {
  let x = MARGIN;
  cols.forEach((w, i) => {
    strokeRect(doc, x, y, w, h);
    doc.setFont("helvetica", header || (bold && i === cols.length - 1) ? "bold" : "normal");
    doc.setFontSize(header ? 7 : 7.5);
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
  const rowH = 9;
  const fromCity = pdfSafe(data.pickupZoneName || data.originHub.city || "-");
  const toCity = pdfSafe(data.dropZoneName || data.destinationHub.city || "-");

  // ── Row 1: LR Number | From | To | Date ──
  drawFieldCell(doc, MARGIN, y, col4, rowH, "LR Number", data.lrNumber);
  drawFieldCell(doc, MARGIN + col4, y, col4, rowH, "From", fromCity);
  drawFieldCell(doc, MARGIN + col4 * 2, y, col4, rowH, "To", toCity);
  drawFieldCell(doc, MARGIN + col4 * 3, y, col4, rowH, "Date", data.bookingDate);
  y += rowH;

  // ── Row 2: LR Type | From Branch | To Branch | WayBill ──
  drawFieldCell(doc, MARGIN, y, col4, rowH, "LR Type", data.lrType);
  drawFieldCell(doc, MARGIN + col4, y, col4, rowH, "From Branch", data.originHub.name);
  drawFieldCell(doc, MARGIN + col4 * 2, y, col4, rowH, "To Branch", data.destinationHub.name);
  drawFieldCell(doc, MARGIN + col4 * 3, y, col4, rowH, "WayBill No.", "N/A");
  y += rowH;

  // ── Sender / Receiver (label | value | label | value per row) ──
  const partyH = 8;
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
  const tblRowH = 7.5;

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

  // ── Charges block (reference layout) ──
  const chargesH = 26;
  strokeRect(doc, MARGIN, y, CONTENT_W, chargesH);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Value of the Goods", MARGIN + 2, y + 4.5);
  doc.text("-", MARGIN + 38, y + 4.5);

  const otherCharges = Number(data.gstAmount) + Number(data.platformFee);
  const chargesLine = pdfSafe(
    `( GST ${formatInr(data.gstAmount)}  L Charges ${formatInr(data.platformFee)} ) Other Charges (${RS}) ${formatInr(otherCharges)}`,
  );
  doc.text(chargesLine, MARGIN + 2, y + 9);

  doc.text("Condition of the Goods", MARGIN + 2, y + 13.5);
  doc.text("-", MARGIN + 38, y + 13.5);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`Net Amt Payable (${RS})`, MARGIN + 2, y + 18);
  doc.text(formatInr(data.netAmountPayable), MARGIN + 48, y + 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text("Mode Of Transport", MARGIN + 2, y + 22.5);
  doc.text("Road", MARGIN + 38, y + 22.5);

  doc.text("Vehicle Number", MARGIN + CONTENT_W * 0.55, y + 22.5);
  doc.text("-", MARGIN + CONTENT_W * 0.55 + 30, y + 22.5);
  y += chargesH;

  // ── Signature row (inside body) ──
  const sigH = 10;
  const sigW = CONTENT_W / 3;
  strokeRect(doc, MARGIN, y, sigW, sigH);
  strokeRect(doc, MARGIN + sigW, y, sigW, sigH);
  strokeRect(doc, MARGIN + sigW * 2, y, sigW, sigH);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.text("Sender Copy", MARGIN + 2, y + sigH / 2 + 0.8);
  doc.text("Signature", MARGIN + sigW + sigW / 2, y + sigH / 2 + 0.8, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  const booked = doc.splitTextToSize(
    pdfSafe(`Booked by Admin at ${data.bookingDateTime}`),
    sigW - 4,
  );
  doc.text(booked, MARGIN + sigW * 2 + 2, y + 4);
  y += sigH;

  // Outer frame around body (reference single box feel)
  strokeRect(doc, MARGIN, bodyTop, CONTENT_W, y - bodyTop);
  y += 5;

  // ── Terms & Conditions ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Terms & Conditions :", MARGIN, y);
  y += 4.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
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
    y += lines.length * 3.3;
  });

  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("Remarks :", MARGIN, y);
  doc.setFont("helvetica", "normal");
  let remarkText = pdfSafe(data.remarks || "-");
  if (data.hubDistanceKm != null) {
    remarkText += ` | Corridor: ${Number(data.hubDistanceKm).toFixed(1)} km`;
  }
  doc.text(remarkText, MARGIN + 18, y);

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

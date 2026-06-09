import { jsPDF } from "jspdf";

const GREY = 117;
const MARGIN = 12;

function formatInr(value) {
  if (value == null || value === 0) return "";
  return Number(value).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatBookedDate(raw) {
  if (!raw) return "-";
  try {
    return new Date(raw).toLocaleString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return String(raw);
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

function divider(doc, y) {
  doc.setDrawColor(GREY);
  doc.line(MARGIN, y, 210 - MARGIN, y);
  return y + 4;
}

function priceRow(doc, y, label, amount, bold = false) {
  const display = amount != null && amount !== 0 ? formatInr(amount) : "";
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(8);
  doc.setTextColor(0);
  doc.text(label, MARGIN + 110, y);
  doc.text(display, 198, y, { align: "right" });
  return y + 4;
}

/**
 * Client-side LR invoice for admin hub-to-hub bookings (matches user-app LR layout).
 */
export function downloadH2hInvoice({
  displayOrderId,
  senderName,
  senderPhone,
  receiverName,
  receiverPhone,
  fromHub,
  fromHubAddress,
  toHub,
  toHubAddress,
  paymentType,
  createdAt,
  categoryName,
  subtotal,
  platformFee,
  gstAmount,
  totalAmount,
  couponAmount,
  couponCode,
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  let y = MARGIN;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("YOUDASH EXPRESS DELIVERY", pageW / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("15-7-4, 38 BUS STOP BACK SIDE, OLD GAJUWAKA", pageW / 2, y, { align: "center" });
  y += 4;
  doc.text("GSTIN : 37EJAPM5697C1ZY", pageW / 2, y, { align: "center" });
  y += 5;

  doc.setFontSize(7);
  doc.setTextColor(GREY);
  doc.text(`Printed @ ${printedAt()}`, pageW - MARGIN, y, { align: "right" });
  doc.setTextColor(0);
  y += 4;
  y = divider(doc, y);

  doc.setFontSize(9);
  doc.text("L.R No", MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(` : ${displayOrderId || "-"}`, MARGIN + 14, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(GREY);
  doc.text("Payment Type", MARGIN, y);
  y += 4;
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(String(paymentType || "-").toUpperCase(), MARGIN, y);
  y += 6;

  function endpointBlock(title, hubName, hubAddress) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(GREY);
    doc.text(title, MARGIN, y);
    y += 4;
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    doc.text(`Hub: ${hubName || "-"}`, MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    const addr = hubAddress || hubName || "-";
    const lines = doc.splitTextToSize(`Address: ${addr}`, 210 - MARGIN * 2);
    doc.text(lines, MARGIN, y);
    y += lines.length * 4 + 1;
  }

  endpointBlock("From", fromHub, fromHubAddress);
  endpointBlock("To", toHub, toHubAddress);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Booked Date : ${formatBookedDate(createdAt)}`, MARGIN, y);
  y += 5;
  y = divider(doc, y);

  const mid = pageW / 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Sender", MARGIN, y);
  doc.text("Receiver", mid + 4, y);
  y += 5;
  doc.text(senderName || "-", MARGIN, y);
  doc.text(receiverName || "-", mid + 4, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.text(senderPhone || "-", MARGIN, y);
  doc.text(receiverPhone || "-", mid + 4, y);
  y += 5;
  doc.line(mid, y - 12, mid, y);
  y = divider(doc, y);

  doc.setFontSize(9);
  doc.text("Article", MARGIN, y);
  doc.setFont("helvetica", "bold");
  doc.text(categoryName?.trim() ? categoryName.trim() : "-", MARGIN, y + 4);

  y = priceRow(doc, y, "Freight :", subtotal);
  y = priceRow(doc, y, "L Charges :", platformFee);
  y = priceRow(doc, y, "GST :", gstAmount);
  if (couponAmount != null && couponAmount > 0) {
    const label = couponCode ? `Coupon (${couponCode}) :` : "Coupon Discount :";
    y = priceRow(doc, y, label, -couponAmount);
  }
  y = priceRow(doc, y, "Total Amount :", totalAmount, true);
  const pt = String(paymentType || "").toUpperCase();
  const showPaid = pt.includes("COD") || pt.includes("ONLINE") || pt.includes("PAID") || pt.includes("PREPAID");
  y = priceRow(doc, y, "Amount Paid :", showPaid ? totalAmount : null, true);
  y += 2;
  y = divider(doc, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(
    "Unloading / Service charges paid by party at the time of delivery",
    pageW / 2,
    y,
    { align: "center" },
  );
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Thank you WWW.YOUDASH EXPRESS DELIVERY .COM", pageW / 2, y, { align: "center" });
  y += 5;
  y = divider(doc, y);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(GREY);
  doc.text("Powered By YouDash Express Delivery", pageW / 2, y, { align: "center" });

  const safeId = String(displayOrderId || "order").replace(/[^A-Za-z0-9_-]/g, "_");
  doc.save(`LR_${safeId}.pdf`);
}

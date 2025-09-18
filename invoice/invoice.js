// invoice/invoice.js
import PDFDocument from "pdfkit";
import { supabase } from "../utils/supabaseClient.js";

export async function generateInvoice(orders) {
  for (const order of orders) {
    const doc = new PDFDocument({ size: "A4" });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);

      // Upload invoice to Supabase Storage
      const { error } = await supabase.storage
        .from("invoices")
        .upload(`Invoice_${order.order_id}.pdf`, pdfBuffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (error) {
        console.error(`❌ Failed to upload Invoice_${order.order_id}.pdf:`, error.message);
      } else {
        console.log(`✅ Invoice uploaded: Invoice_${order.order_id}.pdf`);
      }
    });

    const pageHeight = 842;
    const yTop = 50;

    // Company Header
    doc.font("Helvetica-Bold").fontSize(16).text("Indalnova", 50, yTop);
    doc.font("Helvetica").fontSize(9)
      .text("123H PATEL NAGAR RAMADEVI KANPUR UTTARPRADESH, Pin-208007", 50, yTop + 20)
      .text("Email: teamindalnova@gmail.com | Phone: +91-8840393051", 50, yTop + 35);

    // Invoice Info
    doc.font("Helvetica-Bold").fontSize(14).text("INVOICE", 400, yTop);
    doc.font("Helvetica").fontSize(9)
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 400, yTop + 20)
      .text(`Order ID: ${order.order_id}`, 400, yTop + 35);

    // Customer Info
    doc.font("Helvetica-Bold").fontSize(12).text("Bill To:", 50, yTop + 60);
    doc.font("Helvetica").fontSize(9)
      .text(`Name: ${order.name}`, 50, yTop + 75)
      .text(`Email: ${order.email}`, 50, yTop + 90)
      .text(`Phone: ${order.phone}`, 50, yTop + 105)
      .text(`Address: ${order.address1} ${order.address2 || ""}, ${order.city}, ${order.state} - ${order.pin}`, 50, yTop + 120);

    // Products Table (only product IDs)
    const tableTop = yTop + 150;
    doc.font("Helvetica-Bold").text("Product ID", 50, tableTop);
    doc.text("Qty", 150, tableTop);
    doc.text("Price (₹)", 200, tableTop);
    doc.text("Total (₹)", 280, tableTop);

    let rowY = tableTop + 20;
    doc.font("Helvetica").fontSize(9);

    // ✅ Safety check
    const productIds = order.product_ids || [];
    const quantities = (order.quantities || []).map(Number);
    const prices = (order.prices || []).map(Number);

    productIds.forEach((pid, i) => {
      const qty = quantities[i] || 0;
      const price = prices[i] || 0;
      doc.text(pid.toString(), 50, rowY);
      doc.text(qty.toString(), 150, rowY, { width: 40, align: "center" });
      doc.text(price.toString(), 200, rowY, { width: 60, align: "center" });
      doc.text((qty * price).toString(), 280, rowY, { width: 60, align: "center" });
      rowY += 20;
    });

    // Total Row
    doc.font("Helvetica-Bold").text("TOTAL", 200, rowY);
    doc.text(Number(order.total_price).toString(), 280, rowY);

    doc.font("Helvetica").fontSize(9)
      .text(`Payment Method: ${order.payment_method}`, 50, rowY + 30)
      .text(`Payment ID: ${order.payment_id || ""}`, 200, rowY + 30);

    doc.end();
  }
}

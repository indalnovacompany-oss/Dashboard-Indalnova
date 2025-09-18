import PDFDocument from "pdfkit";
import fs from "fs";
import { supabase } from "../utils/supabaseClient.js";

export async function generateInvoice(orders) {
  for (const order of orders) {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);

      // Save locally for testing
      fs.writeFileSync(`Invoice_${order.order_id}.pdf`, pdfBuffer);
      console.log(`✅ Invoice saved locally: Invoice_${order.order_id}.pdf`);

      // Upload to Supabase (optional)
      // const { error } = await supabase.storage
      //   .from("invoices")
      //   .upload(`Invoice_${order.order_id}.pdf`, pdfBuffer, {
      //     contentType: "application/pdf",
      //     upsert: true,
      //   });
      // if (error) console.error(error);
    });

    // ===== HEADER =====
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#333").text("INDALNOVA", 50, 40);
    doc.font("Helvetica").fontSize(10).fillColor("#555")
      .text("123H PATEL NAGAR, RAMADEVI, KANPUR, UTTAR PRADESH - 208007", 50, 65)
      .text("Email: teamindalnova@gmail.com | Phone: +91-8840393051", 50, 80);

    // Invoice info box
    doc.rect(400, 50, 150, 50).stroke();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#333").text("INVOICE", 410, 55);
    doc.font("Helvetica").fontSize(9).fillColor("#555")
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 410, 75)
      .text(`Order ID: ${order.order_id}`, 410, 90);

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#333").text("Bill To:", 50, 120);
    doc.font("Helvetica").fontSize(10).fillColor("#555")
      .text(order.name, 50, 135)
      .text(order.email, 50, 150)
      .text(order.phone, 50, 165)
      .text(`${order.address1} ${order.address2 || ""}, ${order.city}, ${order.state} - ${order.pin}`, 50, 180, { width: 300 });

    // ===== PRODUCTS TABLE WITH BOXES =====
    const tableTop = 220;
    const startX = 50;
    const columnWidths = { product: 150, qty: 50, price: 80, total: 80 };
    const rowHeight = 25;

    // Draw table header
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333");
    doc.rect(startX, tableTop, columnWidths.product, rowHeight).stroke();
    doc.text("Product ID", startX + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product, tableTop, columnWidths.qty, rowHeight).stroke();
    doc.text("Qty", startX + columnWidths.product + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty, tableTop, columnWidths.price, rowHeight).stroke();
    doc.text("Price (₹)", startX + columnWidths.product + columnWidths.qty + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, tableTop, columnWidths.total, rowHeight).stroke();
    doc.text("Total (₹)", startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, tableTop + 7);

    // Draw table rows
    const productIds = order.product_ids || [];
    const quantities = (order.quantities || []).map(Number);
    const prices = (order.prices || []).map(Number);

    let rowY = tableTop + rowHeight;
    doc.font("Helvetica").fontSize(10).fillColor("#555");

    productIds.forEach((pid, i) => {
      const qty = quantities[i] || 0;
      const price = prices[i] || 0;
      const total = qty * price;

      doc.rect(startX, rowY, columnWidths.product, rowHeight).stroke();
      doc.text(pid.toString(), startX + 5, rowY + 7);
      doc.rect(startX + columnWidths.product, rowY, columnWidths.qty, rowHeight).stroke();
      doc.text(qty.toString(), startX + columnWidths.product + 5, rowY + 7, { width: columnWidths.qty - 10, align: "center" });
      doc.rect(startX + columnWidths.product + columnWidths.qty, rowY, columnWidths.price, rowHeight).stroke();
      doc.text(price.toFixed(2), startX + columnWidths.product + columnWidths.qty + 5, rowY + 7, { width: columnWidths.price - 10, align: "center" });
      doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, rowY, columnWidths.total, rowHeight).stroke();
      doc.text(total.toFixed(2), startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, rowY + 7, { width: columnWidths.total - 10, align: "center" });

      rowY += rowHeight;
    });

    // ===== TOTAL ROW =====
    doc.rect(startX + columnWidths.product + columnWidths.qty, rowY, columnWidths.price, rowHeight).stroke();
    doc.font("Helvetica-Bold").text("TOTAL", startX + columnWidths.product + columnWidths.qty + 5, rowY + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, rowY, columnWidths.total, rowHeight).stroke();
    doc.text(Number(order.total_price).toFixed(2), startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, rowY + 7, { width: columnWidths.total - 10, align: "center" });

    // ===== PAYMENT INFO =====
    doc.font("Helvetica").fontSize(10).fillColor("#555");
    doc.text(`Payment Method: ${order.payment_method}`, startX, rowY + 40);
    doc.text(`Payment ID: ${order.payment_id || ""}`, startX + 200, rowY + 40);

    // ===== FOOTER =====
    doc.fontSize(9).fillColor("#999")
      .text("Thank you for your business!", 50, 780, { align: "center", width: 500 });

    doc.end();
  }
}

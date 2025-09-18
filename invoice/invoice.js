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

      // Optional: upload to Supabase
      // const { error } = await supabase.storage
      //   .from("invoices")
      //   .upload(`Invoice_${order.order_id}.pdf`, pdfBuffer, {
      //     contentType: "application/pdf",
      //     upsert: true,
      //   });
      // if (error) console.error(error);
    });

    // ======== SAFE DATA EXTRACTION ========
    const name = typeof order.name === "string" ? order.name : order.name?.first ? `${order.name.first} ${order.name.last || ""}` : "";
    const phone = typeof order.phone === "string" ? order.phone : order.phone?.number || "";
    const email = order.email || "";
    const address = `${order.address1 || ""} ${order.address2 || ""}, ${order.city || ""}, ${order.state || ""} - ${order.pin || ""}`;
    const paymentMethod = order.payment_method || "";
    const paymentId = order.payment_id || "";
    const productIds = (order.product_ids || []).map(p => typeof p === "string" ? p : p.id || "");
    const quantities = (order.quantities || []).map(Number);
    const prices = (order.prices || []).map(Number);
    const totalPrice = Number(order.total_price || 0);

    // ===== HEADER =====
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#333").text("INDALNOVA", 50, 40);
    doc.font("Helvetica").fontSize(10).fillColor("#555")
      .text("123H PATEL NAGAR, RAMADEVI, KANPUR, UTTAR PRADESH - 208007", 50, 65)
      .text("Email: teamindalnova@gmail.com | Phone: +91-8840393051", 50, 80);

    // Invoice Info Box
    doc.rect(400, 50, 150, 50).stroke();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#333").text("INVOICE", 410, 55);
    doc.font("Helvetica").fontSize(9).fillColor("#555")
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 410, 75)
      .text(`Order ID: ${order.order_id}`, 410, 90);

    // ===== CUSTOMER INFO =====
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#333").text("Bill To:", 50, 120);
    doc.font("Helvetica").fontSize(10).fillColor("#555")
      .text(name, 50, 135)
      .text(email, 50, 150)
      .text(phone, 50, 165)
      .text(address, 50, 180, { width: 300 });

    // ===== PRODUCTS TABLE WITH BOXES =====
    const tableTop = 220;
    const startX = 50;
    const columnWidths = { product: 150, qty: 50, price: 80, total: 80 };
    const rowHeight = 25;

    // Table Header
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333");
    doc.rect(startX, tableTop, columnWidths.product, rowHeight).stroke();
    doc.text("Product ID", startX + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product, tableTop, columnWidths.qty, rowHeight).stroke();
    doc.text("Qty", startX + columnWidths.product + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty, tableTop, columnWidths.price, rowHeight).stroke();
    doc.text("Price (₹)", startX + columnWidths.product + columnWidths.qty + 5, tableTop + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, tableTop, columnWidths.total, rowHeight).stroke();
    doc.text("Total (₹)", startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, tableTop + 7);

    // Table Rows
    let rowY = tableTop + rowHeight;
    doc.font("Helvetica").fontSize(10).fillColor("#555");

    productIds.forEach((pid, i) => {
      const qty = quantities[i] || 0;
      const price = prices[i] || 0;
      const total = qty * price;

      doc.rect(startX, rowY, columnWidths.product, rowHeight).stroke();
      doc.text(pid, startX + 5, rowY + 7);
      doc.rect(startX + columnWidths.product, rowY, columnWidths.qty, rowHeight).stroke();
      doc.text(qty.toString(), startX + columnWidths.product + 5, rowY + 7, { width: columnWidths.qty - 10, align: "center" });
      doc.rect(startX + columnWidths.product + columnWidths.qty, rowY, columnWidths.price, rowHeight).stroke();
      doc.text(price.toFixed(2), startX + columnWidths.product + columnWidths.qty + 5, rowY + 7, { width: columnWidths.price - 10, align: "center" });
      doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, rowY, columnWidths.total, rowHeight).stroke();
      doc.text(total.toFixed(2), startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, rowY + 7, { width: columnWidths.total - 10, align: "center" });

      rowY += rowHeight;
    });

    // Total Row
    doc.rect(startX + columnWidths.product + columnWidths.qty, rowY, columnWidths.price, rowHeight).stroke();
    doc.font("Helvetica-Bold").text("TOTAL", startX + columnWidths.product + columnWidths.qty + 5, rowY + 7);
    doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, rowY, columnWidths.total, rowHeight).stroke();
    doc.text(totalPrice.toFixed(2), startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, rowY + 7, { width: columnWidths.total - 10, align: "center" });

    // ===== PAYMENT INFO =====
    doc.font("Helvetica").fontSize(10).fillColor("#555");
    doc.text(`Payment Method: ${paymentMethod}`, startX, rowY + 40);
    doc.text(`Payment ID: ${paymentId}`, startX + 200, rowY + 40);

    // ===== FOOTER =====
    doc.fontSize(9).fillColor("#999")
      .text("Thank you for your business!", 50, 780, { align: "center", width: 500 });

    doc.end();
  }
}


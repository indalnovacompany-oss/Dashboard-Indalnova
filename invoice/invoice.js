// invoice/invoice.js
import PDFDocument from "pdfkit";
import { supabase } from "../utils/supabaseClient.js";

/**
 * Generate invoices for multiple orders and upload to Supabase Storage
 * @param {Array} orders - Array of order objects
 */
export async function generateInvoice(orders) {
  for (const order of orders) {
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];

      // Collect PDF chunks
      doc.on("data", (chunk) => chunks.push(chunk));

      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);
          const fileName = `Invoice_${order.order_id}.pdf`;

          // Upload to Supabase
          const { error } = await supabase.storage
            .from("invoices")
            .upload(fileName, pdfBuffer, { contentType: "application/pdf", upsert: true });

          if (error) {
            console.error(`❌ Failed to upload ${fileName}:`, error.message);
          } else {
            console.log(`✅ Invoice uploaded: ${fileName}`);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });

      // ===== HEADER =====
      doc.font("Helvetica-Bold").fontSize(20).text("INDALNOVA", 50, 40);
      doc.font("Helvetica").fontSize(10)
        .text("123H PATEL NAGAR, RAMADEVI, KANPUR, UTTAR PRADESH - 208007", 50, 65)
        .text(`Email: teamindalnova@gmail.com | Phone: +91-8840393051`, 50, 80);

      // ===== INVOICE INFO =====
      doc.rect(400, 50, 150, 50).stroke();
      doc.font("Helvetica-Bold").fontSize(14).text("INVOICE", 410, 55);
      doc.font("Helvetica").fontSize(9)
        .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 410, 75)
        .text(`Order ID: ${order.order_id}`, 410, 90);

      // ===== CUSTOMER INFO =====
      const name = order.name || "-";
      const phone = order.phone || "-";
      const email = order.email || "-";
      const address = `${order.address1 || ""} ${order.address2 || ""}, ${order.city || ""}, ${order.state || ""} - ${order.pin || ""}`;

      doc.font("Helvetica-Bold").fontSize(12).text("Bill To:", 50, 120);
      doc.font("Helvetica").fontSize(10)
        .text(name, 50, 135)
        .text(email, 50, 150)
        .text(phone, 50, 165)
        .text(address, 50, 180, { width: 300 });

      // ===== PRODUCTS TABLE =====
      const tableTop = 220;
      const startX = 50;
      const columnWidths = { product: 150, qty: 50, price: 80, total: 80 };
      const rowHeight = 25;

      const productIds = (order.product_ids || []).map(p => typeof p === "string" ? p : p.id || "-");
      const quantities = (order.quantities || []).map(Number);
      const prices = (order.prices || []).map(Number);
      const totalPrice = Number(order.total_price || 0);
      const paymentMethod = order.payment_method || "-";
      const paymentId = order.payment_id || "-";
      const paymentStatus = order.payment_status ? order.payment_status.toLowerCase() : "unpaid";

      // Table Header
      doc.font("Helvetica-Bold").fontSize(10);
      const headers = ["Product ID", "Qty", "Price (₹)", "Total (₹)"];
      let x = startX;
      headers.forEach((header, i) => {
        const width = Object.values(columnWidths)[i];
        doc.rect(x, tableTop, width, rowHeight).stroke();
        doc.text(header, x + 5, tableTop + 7);
        x += width;
      });

      // Table Rows
      let rowY = tableTop + rowHeight;
      doc.font("Helvetica").fontSize(10);
      productIds.forEach((pid, i) => {
        const qty = quantities[i] || 0;
        const price = prices[i] || 0;
        const total = qty * price;

        let x = startX;
        const values = [pid, qty.toString(), price.toFixed(2), total.toFixed(2)];
        values.forEach((val, j) => {
          const width = Object.values(columnWidths)[j];
          doc.rect(x, rowY, width, rowHeight).stroke();
          doc.text(val, x + 5, rowY + 7, { width: width - 10, align: j === 0 ? "left" : "center" });
          x += width;
        });
        rowY += rowHeight;
      });

      // Total Row
      doc.rect(startX + columnWidths.product + columnWidths.qty, rowY, columnWidths.price, rowHeight).stroke();
      doc.font("Helvetica-Bold").text("TOTAL", startX + columnWidths.product + columnWidths.qty + 5, rowY + 7);
      doc.rect(startX + columnWidths.product + columnWidths.qty + columnWidths.price, rowY, columnWidths.total, rowHeight).stroke();
      doc.text(totalPrice.toFixed(2), startX + columnWidths.product + columnWidths.qty + columnWidths.price + 5, rowY + 7, { width: columnWidths.total - 10, align: "center" });

      // Payment Info
      doc.font("Helvetica").fontSize(10);
      doc.text(`Payment Method: ${paymentMethod}`, startX, rowY + 40);
      doc.text(`Payment ID: ${paymentId}`, startX + 200, rowY + 40);
      doc.text(`Payment Status: ${paymentStatus}`, startX + 400, rowY + 40);

      // Footer
      doc.fontSize(9).fillColor("#999").text("Thank you for your business!", 50, 780, { align: "center", width: 500 });

      // End PDF stream
      doc.end();
    });
  }
}


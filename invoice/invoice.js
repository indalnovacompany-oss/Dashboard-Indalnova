// invoice/invoice.js
import PDFDocument from "pdfkit";
import { supabase } from "../utils/supabaseClient.js";

export async function generateInvoice(orders) {
  for (const order of orders) {
    await new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4" });
      const chunks = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", async () => {
        try {
          const pdfBuffer = Buffer.concat(chunks);

          // Upload invoice to Supabase Storage
          const filePath = `Invoice_${order.order_id}.pdf`;
          const { error } = await supabase.storage
            .from("invoices") // 👈 Bucket name (must exist in Supabase Storage)
            .upload(filePath, pdfBuffer, {
              contentType: "application/pdf",
              upsert: true, // overwrite if file exists
            });

          if (error) {
            console.error(`❌ Failed to upload ${filePath}:`, error.message);
            reject(error);
          } else {
            // Get Public URL for download
            const { data } = supabase.storage
              .from("invoices")
              .getPublicUrl(filePath);

            console.log(`✅ Invoice uploaded: ${filePath}`);
            console.log(`🌍 Public URL: ${data.publicUrl}`);
            resolve();
          }
        } catch (err) {
          reject(err);
        }
      });

      // === PDF Content ===
      const pageHeight = 842; // A4 height in points
      const blockHeight = pageHeight / 2;
      const yTop = pageHeight - 50;

      // --- Company Header ---
      doc.font("Helvetica-Bold").fontSize(16).text("Indalnova", 50, yTop);
      doc.font("Helvetica").fontSize(9)
        .text("123H PATEL NAGAR RAMADEVI KANPUR UTTARPRADESH, Pin-208007", 50, yTop + 15)
        .text("Email: teamindalnova@gmail.com | Phone: +91-8840393051", 50, yTop + 30);

      // --- Invoice Title & Info ---
      doc.font("Helvetica-Bold").fontSize(14).text("INVOICE", 400, yTop);
      const dateStr = new Date().toLocaleDateString();
      doc.font("Helvetica").fontSize(9)
        .text(`Invoice Date: ${dateStr}`, 400, yTop + 15)
        .text(`Order ID: ${order.order_id}`, 400, yTop + 30);

      // --- Customer Info ---
      doc.font("Helvetica-Bold").fontSize(12).text("Bill To:", 50, yTop + 60);
      doc.font("Helvetica").fontSize(9)
        .text(`Name: ${order.name}`, 50, yTop + 75)
        .text(`Email: ${order.email}`, 50, yTop + 90)
        .text(`Phone: ${order.phone}`, 50, yTop + 105)
        .text(
          `Address: ${order.address1} ${order.address2 || ""}, ${order.city}, ${order.state} - ${order.pin}`,
          50,
          yTop + 120
        );

      // --- Products Table ---
      const tableTop = yTop + 150;
      doc.font("Helvetica-Bold").text("Product ID", 50, tableTop);
      doc.text("Qty", 150, tableTop);
      doc.text("Price (₹)", 200, tableTop);
      doc.text("Total (₹)", 280, tableTop);

      let rowY = tableTop + 20;
      doc.font("Helvetica").fontSize(9);
      order.products.forEach((pid, i) => {
        const qty = order.quantities[i];
        const price = order.prices[i];
        doc.text(pid.toString(), 50, rowY);
        doc.text(qty.toString(), 150, rowY, { width: 40, align: "center" });
        doc.text(price.toString(), 200, rowY, { width: 60, align: "center" });
        doc.text((qty * price).toString(), 280, rowY, { width: 60, align: "center" });
        rowY += 20;
      });

      // --- Total Row ---
      doc.font("Helvetica-Bold").text("TOTAL", 200, rowY);
      doc.text(order.total.toString(), 280, rowY);

      // --- Payment Info ---
      doc.font("Helvetica").fontSize(9)
        .text(`Payment Method: ${order.payment_method}`, 50, rowY + 30);
      if (order.payment_method.toLowerCase() !== "cod") {
        doc.text(`Payment ID: ${order.payment_id || ""}`, 200, rowY + 30);
      }

      // --- Separator Line ---
      doc.moveTo(30, yTop + blockHeight - 20).lineTo(555, yTop + blockHeight - 20).stroke();

      doc.end();
    });
  }
}

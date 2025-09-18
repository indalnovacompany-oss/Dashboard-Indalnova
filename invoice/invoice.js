// invoice/invoice.js
import PDFDocument from "pdfkit";
import { supabase } from "../utils/supabaseClient.js";

export async function generateInvoice(orders) {
  for (const order of orders) {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
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

    // ====== HEADER ======
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#333333").text("INDALNOVA", 50, 40);
    doc.font("Helvetica").fontSize(10).fillColor("#555555")
      .text("123H PATEL NAGAR, RAMADEVI, KANPUR, UTTAR PRADESH - 208007", 50, 65)
      .text("Email: teamindalnova@gmail.com | Phone: +91-8840393051", 50, 80);

    // Invoice info box
    doc.rect(400, 50, 150, 50).stroke();
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#333333").text("INVOICE", 410, 55);
    doc.font("Helvetica").fontSize(9).fillColor("#555555")
      .text(`Invoice Date: ${new Date().toLocaleDateString()}`, 410, 75)
      .text(`Order ID: ${order.order_id}`, 410, 90);

    // ====== CUSTOMER INFO ======
    doc.font("Helvetica-Bold").fontSize(12).fillColor("#333333").text("Bill To:", 50, 120);
    doc.font("Helvetica").fontSize(10).fillColor("#555555")
      .text(order.name, 50, 135)
      .text(order.email, 50, 150)
      .text(order.phone, 50, 165)
      .text(`${order.address1} ${order.address2 || ""}, ${order.city}, ${order.state} - ${order.pin}`, 50, 180, { width: 300 });

    // ====== PRODUCTS TABLE ======
    const tableTop = 220;
    const tableLeft = 50;
    const tableWidth = 500;

    // Draw table headers
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#333333");
    doc.text("Product ID", tableLeft, tableTop, { width: 100 });
    doc.text("Qty", tableLeft + 110, tableTop, { width: 50, align: "center" });
    doc.text("Price (₹)", tableLeft + 170, tableTop, { width: 70, align: "center" });
    doc.text("Total (₹)", tableLeft + 250, tableTop, { width: 70, align: "center" });

    doc.moveTo(tableLeft, tableTop + 15)
       .lineTo(tableLeft + tableWidth, tableTop + 15)
       .strokeColor("#aaaaaa")
       .stroke();

    // Table rows
    let rowY = tableTop + 25;
    const productIds = order.product_ids || [];
    const quantities = (order.quantities || []).map(Number);
    const prices = (order.prices || []).map(Number);

    doc.font("Helvetica").fontSize(10).fillColor("#555555");
    productIds.forEach((pid, i) => {
      const qty = quantities[i] || 0;
      const price = prices[i] || 0;
      doc.text(pid.toString(), tableLeft, rowY, { width: 100 });
      doc.text(qty.toString(), tableLeft + 110, rowY, { width: 50, align: "center" });
      doc.text(price.toFixed(2), tableLeft + 170, rowY, { width: 70, align: "center" });
      doc.text((qty * price).toFixed(2), tableLeft + 250, rowY, { width: 70, align: "center" });
      rowY += 20;
    });

    // Total Row
    doc.moveTo(tableLeft, rowY + 5)
       .lineTo(tableLeft + tableWidth, rowY + 5)
       .strokeColor("#aaaaaa")
       .stroke();

    doc.font("Helvetica-Bold").text("TOTAL", tableLeft + 170, rowY + 10, { width: 70, align: "center" });
    doc.text(Number(order.total_price).toFixed(2), tableLeft + 250, rowY + 10, { width: 70, align: "center" });

    // Payment info
    doc.font("Helvetica").fontSize(10).fillColor("#555555");
    doc.text(`Payment Method: ${order.payment_method}`, tableLeft, rowY + 40);
    doc.text(`Payment ID: ${order.payment_id || ""}`, tableLeft + 200, rowY + 40);

    // Footer
    doc.fontSize(9).fillColor("#999999")
      .text("Thank you for your business!", 50, 780, { align: "center", width: 500 });

    doc.end();
  }
}


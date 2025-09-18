// api/process_orders.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../utils/supabaseClient.js";
import { validateOrder } from "../utils/validateOrder.js";
import { generateInvoice } from "../invoice/invoice.js";

const app = express();
app.use(express.json());

/**
 * -------------------------
 * 1️⃣ Process Orders API
 * -------------------------
 */
app.get("/api/process_orders", async (req, res) => {
  try {
    const { data: orders = [], error } = await supabase
      .from("orders")
      .select("*")
      .eq("invoice_generated", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const confirmedOrders = [];

    for (const order of orders) {
      const validation = validateOrder(order);
      if (!validation.valid) {
        console.log(`❌ Order ${order.order_id || order.id} skipped: ${validation.reason}`);
        continue;
      }

      if (order.payment_method?.toLowerCase() === "cod") {
        confirmedOrders.push(order);
      } else if (order.payment_id) {
        confirmedOrders.push(order);
      }
    }

    if (confirmedOrders.length > 0) {
      // Generate invoices for confirmed orders
      await generateInvoice(confirmedOrders);

      // Mark as invoiced
      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    res.json({
      total_orders: orders.length,
      confirmed_orders: confirmedOrders.length,
      orders
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * ------------------------------
 * 2️⃣ Download Invoice API
 * ------------------------------
 */
app.get("/api/download_invoice/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .limit(1);

    if (error) throw error;
    if (!orders || orders.length === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    const order = orders[0];

    // Generate PDF as Buffer
    const pdfBuffer = await generateInvoice([order], { returnBuffer: true });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${orderId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Invoice error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------
// Start server
// -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});

export default app;


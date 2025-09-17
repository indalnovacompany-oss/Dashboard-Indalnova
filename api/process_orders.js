// api/process_orders.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../utils/supabaseClient.js";
import { validateOrder } from "../utils/validateOrder.js";
import { generateInvoice } from "../invoice/invoice.js";

const app = express();
app.use(express.json());

// -----------------
// Process Orders API
// -----------------
app.get("/api/process_orders", async (req, res) => {
  try {
    // 1️⃣ Fetch new orders (invoice_generated = false)
    const { data: orders = [], error } = await supabase
      .from("orders")
      .select("*")
      .eq("invoice_generated", false)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const confirmedOrders = [];

    // 2️⃣ Validate orders
    for (const order of orders) {
      const validation = validateOrder(order); // Corrected
      if (!validation.valid) {
        console.log(`❌ Order ${order.order_id || order.id} skipped: ${validation.reason}`);
        continue;
      }

      // 3️⃣ Payment check (for COD just confirm)
      if (order.payment_method?.toLowerCase() === "cod") {
        confirmedOrders.push(order);
      } else if (order.payment_id) {
        // 🔹 Optional: verify Razorpay payment here
        // For now, assume paid if payment_id exists
        confirmedOrders.push(order);
      }
    }

    // 4️⃣ Generate PDF invoices
    if (confirmedOrders.length > 0) {
      generateInvoice(confirmedOrders); // Calls your invoice.js logic

      // 5️⃣ Mark orders as invoiced
      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    // 6️⃣ Return result
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

// -----------------
// Start server
// -----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Process Orders API running on port ${PORT}`);
});


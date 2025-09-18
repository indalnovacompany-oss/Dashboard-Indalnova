// api/process_orders.js
import express from "express";
import dotenv from "dotenv";
dotenv.config();

import { supabase } from "../utils/supabaseClient.js";
import { validateOrder } from "../utils/validateOrder.js";
import { generateInvoice } from "../invoice/invoice.js";

const app = express();
app.use(express.json());

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
    const skippedOrders = [];

    // 2️⃣ Validate and confirm orders
    for (const order of orders) {
      const [isValid, reason] = validateOrder(order);
      if (!isValid) {
        skippedOrders.push({ order_id: order.order_id || order.id, reason });
        console.log(`❌ Order ${order.order_id || order.id} skipped: ${reason}`);
        continue;
      }

      // Confirm based on COD or payment_id
      if (order.payment_method?.toLowerCase() === "cod" || order.payment_id) {
        confirmedOrders.push(order);
      }
    }

    // 3️⃣ Generate invoices for confirmed orders
    if (confirmedOrders.length > 0) {
      await generateInvoice(confirmedOrders);

      // Mark orders as invoiced
      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    // 4️⃣ Prepare response (only product IDs)
    const responseOrders = confirmedOrders.map(o => ({
      order_id: o.order_id,
      product_ids: o.products, // ✅ Only product IDs
      quantities: o.quantities,
      prices: o.prices,
      total: o.total,
      name: o.name,
      phone: o.phone,
      address1: o.address1,
      address2: o.address2 || "",
      city: o.city,
      state: o.state,
      pin: o.pin,
      payment_method: o.payment_method,
      payment_id: o.payment_id,
      created_at: o.created_at,
      tracking_number: o.tracking_number || ""
    }));

    // 5️⃣ Send JSON response
    res.json({
      total_orders: orders.length,
      confirmed_orders: responseOrders.length,
      skipped_orders: skippedOrders,
      orders: responseOrders
    });

  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: "A server error occurred. Check logs." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Process Orders API running on port ${PORT}`);
});


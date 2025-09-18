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
      .order("created_at", { ascending: false });

    if (error) throw error;

    const confirmedOrders = [];
    const skippedOrders = [];

    // 2️⃣ Validate orders
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

    const invoiceData = [];

    // 3️⃣ Generate invoices for confirmed orders
    if (confirmedOrders.length > 0) {
      await generateInvoice(confirmedOrders);

      // 4️⃣ Mark orders as invoiced and get public URL
      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);

        const { data: publicUrlData, error: urlError } = supabase.storage
          .from("invoices")
          .getPublicUrl(`Invoice_${order.order_id}.pdf`);

        if (urlError) console.error(`❌ Failed to get URL for ${order.order_id}:`, urlError);

        invoiceData.push({
          order_id: order.order_id,
          product_ids: order.product_ids || order.products,
          quantities: order.quantities,
          prices: order.prices,
          total: order.total_price || order.total,
          name: order.name,
          phone: order.phone,
          address1: order.address1,
          address2: order.address2 || "",
          city: order.city,
          state: order.state,
          pin: order.pin,
          payment_method: order.payment_method,
          payment_id: order.payment_id,
          created_at: order.created_at,
          tracking_number: order.tracking_number || "",
          invoice_url: publicUrlData?.publicUrl || ""
        });
      }
    }

    // 5️⃣ Send JSON response
    res.json({
      total_orders: orders.length,
      confirmed_orders: invoiceData.length,
      skipped_orders: skippedOrders,
      orders: invoiceData
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

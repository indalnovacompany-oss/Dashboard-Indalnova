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
    // Fetch all orders, even if invoice_generated = true (optional)
    const { data: orders = [], error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const confirmedOrders = [];
    const processedOrders = [];

    for (const order of orders) {
      const [isValid, reason] = validateOrder(order);

      // Add validation info to order object
      order.validation_status = isValid ? "valid" : reason;

      // Only generate invoice for valid + paid/COD orders
      if (isValid && (order.payment_method?.toLowerCase() === "cod" || order.payment_id)) {
        confirmedOrders.push(order);
      }

      processedOrders.push(order); // Push all orders
    }

    // Generate invoices for confirmed orders
    if (confirmedOrders.length > 0) {
      await generateInvoice(confirmedOrders);

      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    // Return **all orders** with validation info
    res.json({
      total_orders: orders.length,
      confirmed_orders: confirmedOrders.length,
      orders: processedOrders
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Process Orders API running on port ${PORT}`);
});


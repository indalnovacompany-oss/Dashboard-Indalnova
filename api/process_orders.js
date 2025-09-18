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

      if (order.payment_method?.toLowerCase() === "cod" || order.payment_id) {
        confirmedOrders.push(order);
      }
    }

    const uploadedFiles = [];

    if (confirmedOrders.length > 0) {
      // Generate PDF invoices and upload to Supabase
      await generateInvoice(confirmedOrders); // Make sure generateInvoice uploads to Supabase

      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);

        const { data: publicData, error } = supabase.storage
          .from("invoices")
          .getPublicUrl(`Invoice_${order.order_id}.pdf`);

        if (error) console.error(error);

        uploadedFiles.push({
          order_id: order.order_id,
          invoice_url: publicData?.publicUrl || null
        });
      }
    }

    res.json({
      total_orders: orders.length,
      confirmed_orders: confirmedOrders.length,
      invoices: uploadedFiles
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

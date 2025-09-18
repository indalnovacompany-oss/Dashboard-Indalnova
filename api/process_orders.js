// api/process_orders.js
import { supabase } from "../utils/supabaseClient.js";
import { validateOrder } from "../utils/validateOrder.js";
import { generateInvoice } from "../invoice/invoice.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

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
      const validation = validateOrder(order);
      if (!validation.valid) {
        console.log(`❌ Order ${order.order_id || order.id} skipped: ${validation.reason}`);
        continue;
      }

      // 3️⃣ Payment check (COD or paid)
      if (order.payment_method?.toLowerCase() === "cod") {
        confirmedOrders.push(order);
      } else if (order.payment_id) {
        // ✅ TODO: Add Razorpay verification here
        confirmedOrders.push(order);
      }
    }

    // 4️⃣ Generate PDF invoices
    if (confirmedOrders.length > 0) {
      await generateInvoice(confirmedOrders);

      // 5️⃣ Mark orders as invoiced
      for (const order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    // 6️⃣ Return result
    return res.status(200).json({
      total_orders: orders.length,
      confirmed_orders: confirmedOrders.length,
      orders
    });

  } catch (err) {
    console.error("❌ process_orders error:", err);
    return res.status(500).json({ error: err.message });
  }
}

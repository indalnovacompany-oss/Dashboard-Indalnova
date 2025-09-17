import { supabase } from "../utils/supabaseClient.js";
import { razorpay } from "../utils/razorpayClient.js";
import { validateOrder } from "../utils/validateOrder.js";
import { generateInvoice } from "../invoice/invoice.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // 1️⃣ Fetch new orders
    const { data: ordersData, error } = await supabase
      .from("orders")
      .select("*")
      .eq("invoice_generated", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    const orders = ordersData || [];

    const confirmedOrders = [];

    // 2️⃣ Validate & verify payment
    for (let order of orders) {
      const { valid, reason } = validateOrder(order);
      if (!valid) continue;

      if (order.payment_method.toLowerCase() === "cod") {
        confirmedOrders.push(order);
      } else if (order.payment_id) {
        try {
          const payment = await razorpay.payments.fetch(order.payment_id);
          if (payment.status === "captured") confirmedOrders.push(order);
        } catch (e) {
          console.error(`Error verifying payment ${order.payment_id}:`, e.message);
        }
      }
    }

    // 3️⃣ Generate invoices
    if (confirmedOrders.length > 0) {
      generateInvoice(confirmedOrders);

      // 4️⃣ Mark orders invoiced
      for (let order of confirmedOrders) {
        await supabase
          .from("orders")
          .update({ invoice_generated: true })
          .eq("id", order.id);
      }
    }

    res.status(200).json({
      total_orders: orders.length,
      confirmed_orders: confirmedOrders.length
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

// api/download_invoice.js
import express from "express";
import { supabase } from "../utils/supabaseClient.js";
import { generateInvoice } from "../invoice/invoice.js";

const app = express();

app.get("/api/download_invoice/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1️⃣ Fetch the order from Supabase
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

    // 2️⃣ Generate PDF buffer
    const pdfBuffer = await generateInvoice([order], { returnBuffer: true });

    // 3️⃣ Send PDF as response
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${orderId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error("❌ Invoice error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default app;


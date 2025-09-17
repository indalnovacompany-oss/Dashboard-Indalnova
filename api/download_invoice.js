// api/download_invoice.js
import express from "express";
import { generateInvoice } from "../invoice/invoice.js";
import { supabase } from "../utils/supabaseClient.js";

const router = express.Router();

router.get("/api/download_invoice/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // Fetch order from Supabase
    const { data: orders, error } = await supabase
      .from("orders")
      .select("*")
      .eq("order_id", orderId)
      .single();

    if (error || !orders) return res.status(404).send("Order not found");

    // Generate PDF
    const pdfBuffer = await generateInvoice(orders);

    // Send PDF to browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${orderId}.pdf`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error(err);
    res.status(500).send("Error generating invoice");
  }
});

export default router;

// api/download_invoice/[orderId].js
import fs from "fs";
import path from "path";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { orderId } = req.query; // 👈 dynamic param

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId" });
    }

    // 🔹 Where invoices are stored (make sure your invoice.js saves here)
    const filePath = path.join(process.cwd(), "invoices", `Invoice_${orderId}.pdf`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // ✅ Send PDF as download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=Invoice_${orderId}.pdf`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (err) {
    console.error("❌ download_invoice error:", err);
    return res.status(500).json({ error: err.message });
  }
}

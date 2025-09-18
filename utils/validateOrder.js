// utils/validateOrder.js

export function validateOrder(order) {
  const requiredFields = [
    "order_id", "name", "email", "phone",
    "address1", "city", "state", "pin",
    "product_ids", "quantities", "prices", "total"
  ];

  for (let field of requiredFields) {
    if (
      order[field] === undefined ||
      order[field] === null ||
      (Array.isArray(order[field]) && order[field].length === 0) ||
      (typeof order[field] === "string" && order[field].trim() === "")
    ) {
      return [false, `Missing ${field}`];
    }
  }

  // Ensure product_id, quantities, prices have same length
  if (!(order.product_id.length === order.quantities.length && order.quantities.length === order.prices.length)) {
    return [false, "product_id, quantities, and prices length mismatch"];
  }

  // Phone validation (Indian 10-digit)
  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) return [false, "Invalid phone"];

  // Quantities validation
  if (!order.quantities.every(q => Number.isInteger(q) && q >= 1)) return [false, "Invalid quantity"];

  // Suspicious quantity
  if (order.quantities.some(q => q > 5)) return [false, "Suspicious quantity"];

  // Prices validation
  if (!order.prices.every(p => typeof p === "number" && p > 0)) return [false, "Invalid prices"];

  // Total price check
  const totalCalc = order.quantities.reduce((acc, q, i) => acc + q * order.prices[i], 0);
  if (totalCalc !== order.total) return [false, "Total mismatch"];

  // Address check
  if (!order.address1 || !order.pin) return [false, "Missing address/pin"];

  return [true, null];
}

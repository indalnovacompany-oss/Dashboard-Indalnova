// utils/validateOrder.js
// utils/validateOrder.js
export function validateOrder(order) {
  const requiredFields = [
    "order_id", "name", "email", "phone",
    "address1", "city", "state", "pin",
    "products", "quantities", "prices", "total"
  ];

  for (let field of requiredFields) {
    if (
      order[field] === undefined ||
      order[field] === null ||
      (Array.isArray(order[field]) && order[field].length === 0) ||
      (typeof order[field] === "string" && order[field].trim() === "")
    ) {
      return { valid: false, reason: `Missing ${field}` };
    }
  }

  if (!Array.isArray(order.products) || order.products.length === 0) {
    return { valid: false, reason: "Products must be a non-empty array" };
  }

  if (!(order.products.length === order.quantities.length && order.quantities.length === order.prices.length)) {
    return { valid: false, reason: "Products, quantities, and prices length mismatch" };
  }

  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) return { valid: false, reason: "Invalid phone" };

  if (!order.quantities.every(q => Number.isInteger(q) && q >= 1)) return { valid: false, reason: "Invalid quantity" };

  if (order.quantities.some(q => q > 5)) return { valid: false, reason: "Suspicious quantity" };

  if (!order.prices.every(p => typeof p === "number" && p > 0)) return { valid: false, reason: "Invalid prices" };

  const totalCalc = order.quantities.reduce((acc, q, i) => acc + q * order.prices[i], 0);
  if (totalCalc !== order.total) return { valid: false, reason: "Total mismatch" };

  if (!order.address1 || !order.pin) return { valid: false, reason: "Missing address/pin" };

  return { valid: true, reason: null };
}

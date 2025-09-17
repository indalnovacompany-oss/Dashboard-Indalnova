export function validateOrder(order) {
  const requiredFields = [
    "order_id", "name", "email", "phone",
    "address1", "city", "state", "pin",
    "products", "quantities", "prices", "total"
  ];

  for (let field of requiredFields) {
    if (!order[field] || (Array.isArray(order[field]) && order[field].length === 0)) {
      return { valid: false, reason: `Missing ${field}` };
    }
  }

  // Phone validation
  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) return { valid: false, reason: "Invalid phone" };

  // Quantity validation
  if (!order.quantities.every(q => Number.isInteger(q) && q >= 1)) {
    return { valid: false, reason: "Invalid quantity" };
  }

  // Suspicious quantity
  if (order.quantities.some(q => q > 5)) {
    return { valid: false, reason: "Suspicious quantity" };
  }

  // Total price check
  const totalCalc = order.quantities.reduce((acc, q, i) => acc + q * order.prices[i], 0);
  if (totalCalc !== order.total) return { valid: false, reason: "Total mismatch" };

  // Address check
  if (!order.address1 || !order.pin) return { valid: false, reason: "Missing address/pin" };

  return { valid: true };
}

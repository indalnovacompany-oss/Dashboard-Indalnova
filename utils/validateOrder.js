// utils/validateOrder.js

export function validateOrder(order) {
  const requiredFields = [
    "order_id", "name", "email", "phone",
    "address1", "city", "state", "pin",
    "products", "quantities", "prices", "total"
  ];

  // ✅ Check required fields
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

  // ✅ Products validation (must be array of IDs)
  if (!Array.isArray(order.products) || order.products.length === 0) {
    return [false, "Products must be a non-empty array"];
  }

  // ✅ Phone validation (Indian 10-digit numbers)
  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) {
    return [false, "Invalid phone"];
  }

  // ✅ Quantities validation
  if (!Array.isArray(order.quantities) || !order.quantities.every(q => Number.isInteger(q) && q >= 1)) {
    return [false, "Invalid quantity"];
  }

  // 🚨 Suspicious quantity check
  if (order.quantities.some(q => q > 5)) {
    return [false, "Suspicious quantity"];
  }

  // ✅ Prices validation
  if (!Array.isArray(order.prices) || !order.prices.every(p => typeof p === "number" && p > 0)) {
    return [false, "Invalid prices"];
  }

  // ✅ Total price check
  const totalCalc = order.quantities.reduce((acc, q, i) => acc + q * order.prices[i], 0);
  if (totalCalc !== order.total) {
    return [false, "Total mismatch"];
  }

  // ✅ Address check
  if (!order.address1 || !order.pin) {
    return [false, "Missing address/pin"];
  }

  return [true];
}

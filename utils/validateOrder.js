// utils/validateOrder.js

export function validateOrder(order) {
  // ✅ Required fields
  const requiredFields = [
    "order_id",
    "name",
    "email",
    "phone",
    "address1",
    "city",
    "state",
    "pin",
    "product_ids",
    "quantities",
    "prices",
    "total"
  ];

  // ✅ Check all required fields
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

  // ✅ Ensure product_ids, quantities, and prices arrays match in length
  if (
    !Array.isArray(order.product_ids) ||
    !Array.isArray(order.quantities) ||
    !Array.isArray(order.prices) ||
    order.product_ids.length !== order.quantities.length ||
    order.quantities.length !== order.prices.length
  ) {
    return [false, "product_ids, quantities, and prices length mismatch"];
  }

  // ✅ Validate phone (Indian 10-digit)
  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) return [false, "Invalid phone"];

  // ✅ Validate quantities
  if (!order.quantities.every(q => Number.isInteger(q) && q >= 1)) {
    return [false, "Invalid quantity"];
  }

  // 🚨 Suspicious quantity check
  if (order.quantities.some(q => q > 5)) return [false, "Suspicious quantity"];

  // ✅ Validate prices
  if (!order.prices.every(p => typeof p === "number" && p > 0)) {
    return [false, "Invalid prices"];
  }

  // ✅ Validate total price
  const totalCalc = order.quantities.reduce((acc, q, i) => acc + q * order.prices[i], 0);
  if (totalCalc !== Number(order.total)) return [false, "Total mismatch"];

  // ✅ Address validation
  if (!order.address1 || !order.pin) return [false, "Missing address/pin"];

  return [true, null]; // ✅ Valid order
}

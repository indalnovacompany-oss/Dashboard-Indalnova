export function validateOrder(order) {
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
    "total_price" // match DB
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

  // Convert strings to numbers if needed
  const quantities = order.quantities.map(q => Number(q));
  const prices = order.prices.map(p => Number(p));
  const total = Number(order.total_price);

  // Ensure lengths match
  if (
    order.product_ids.length !== quantities.length ||
    quantities.length !== prices.length
  ) {
    return [false, "product_ids, quantities, and prices length mismatch"];
  }

  // Phone validation
  const phone = order.phone.replace("+91", "").replace(/^0+/, "");
  if (!/^\d{10}$/.test(phone)) return [false, "Invalid phone"];

  // Quantities validation
  if (!quantities.every(q => Number.isInteger(q) && q >= 1)) return [false, "Invalid quantity"];

  // Suspicious quantity
  if (quantities.some(q => q > 5)) return [false, "Suspicious quantity"];

  // Prices validation
  if (!prices.every(p => typeof p === "number" && p > 0)) return [false, "Invalid prices"];

  // Total price check
  const totalCalc = quantities.reduce((acc, q, i) => acc + q * prices[i], 0);
  if (totalCalc !== total) return [false, "Total mismatch"];

  // Address check
  if (!order.address1 || !order.pin) return [false, "Missing address/pin"];

  return [true, null];
}


# main.py
import os
from flask import Flask, jsonify
from supabase import create_client
from dotenv import load_dotenv
import razorpay
from invoice import generate_invoice  # Make sure this file exists

# --- Load environment variables ---
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# --- Supabase & Razorpay clients ---
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- Flask app ---
app = Flask(__name__)

# --- Fetch new orders ---
def get_new_orders():
    response = supabase.table("orders").select("*").eq("invoice_generated", False).execute()
    if not response.data:
        return []
    orders = []
    for order in response.data:
        orders.append({
            "id": order['id'],
            "order_id": order.get('order_id', ''),
            "name": order.get('name', ''),
            "email": order.get('email', ''),
            "phone": order.get('phone', ''),
            "address1": order.get('address1', ''),
            "address2": order.get('address2', ''),
            "city": order.get('city', ''),
            "state": order.get('state', ''),
            "pin": order.get('pin', ''),
            "notes": order.get('notes', ''),
            "products": order.get('product_ids', []),
            "quantities": order.get('quantities', []),
            "prices": order.get('prices', []),
            "total": order.get('total_price', 0),
            "payment_method": order.get('payment_method', ''),
            "payment_status": order.get('payment_status', ''),
            "payment_id": order.get('payment_id', ''),
        })
    return orders

# --- Verify Razorpay payment ---
def verify_razorpay_payment(payment_id):
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return payment['status'] == "captured"
    except Exception as e:
        print(f"Error verifying payment {payment_id}: {e}")
        return False

# --- Validate order ---
def validate_order(order):
    required_fields = ["order_id", "name", "email", "phone", "address1", "city", "state", "pin", "products", "quantities", "prices", "total"]
    for field in required_fields:
        if not order.get(field):
            return False, f"Missing {field}"

    phone = order['phone'].replace("+91", "").lstrip("0")
    if not phone.isdigit() or len(phone) != 10:
        return False, "Invalid phone"

    quantities = order['quantities']
    if not all(isinstance(q, int) and q >= 1 for q in quantities):
        return False, "Invalid quantity"

    if any(q > 5 for q in quantities):
        return False, "Suspicious quantity"

    total_calc = sum(q * p for q, p in zip(order['quantities'], order['prices']))
    if total_calc != order['total']:
        return False, "Total mismatch"

    if not order['address1'] or not order['pin']:
        return False, "Missing address/pin"

    return True, "Valid order"

# --- Mark orders invoiced ---
def mark_orders_invoiced(orders):
    for order in orders:
        supabase.table("orders").update({"invoice_generated": True}).eq("id", order['id']).execute()

# --- Process orders ---
def process_orders(orders):
    confirmed_orders = []
    for order in orders:
        is_valid, reason = validate_order(order)
        if not is_valid:
            continue

        if order['payment_method'].lower() == "cod":
            confirmed_orders.append(order)
        else:
            payment_id = order.get('payment_id')
            if payment_id and verify_razorpay_payment(payment_id):
                confirmed_orders.append(order)

    if confirmed_orders:
        generate_invoice(confirmed_orders)
        mark_orders_invoiced(confirmed_orders)

    return {
        "total_orders": len(orders),
        "confirmed_orders": len(confirmed_orders)
    }

# --- Flask route ---
@app.route("/api/process_orders", methods=["GET"])
def process_orders_route():
    orders = get_new_orders()
    result = process_orders(orders)
    return jsonify(result)

# --- Main entry point for Render ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

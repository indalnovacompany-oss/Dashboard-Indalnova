# main.py
import os
from supabase import create_client
from dotenv import load_dotenv
import razorpay
from invoice import generate_invoice

# --- Load environment variables ---
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET")

# --- Supabase & Razorpay Clients ---
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))

# --- Fetch new orders (invoice_generated = False) ---
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

# --- Verify Razorpay online payment ---
def verify_razorpay_payment(payment_id):
    try:
        payment = razorpay_client.payment.fetch(payment_id)
        return payment['status'] == "captured"
    except Exception as e:
        print(f"Error verifying payment {payment_id}: {e}")
        return False

# --- Validate order ---
def validate_order(order):
    # Required fields
    required_fields = ["order_id", "name", "email", "phone", "address1", "city", "state", "pin", "products", "quantities", "prices", "total"]
    for field in required_fields:
        if not order.get(field):
            print(f"⚠️ Missing required field: {field}")
            return False, "Missing field"

    # Phone validation (10 digits ignoring +91 or 0)
    phone = order['phone'].replace("+91", "").lstrip("0")
    if not phone.isdigit() or len(phone) != 10:
        print(f"⚠️ Invalid phone number: {order['phone']}")
        return False, "Invalid phone"

    # Quantities validation
    quantities = order['quantities']
    if not all(isinstance(q, int) and q >= 1 for q in quantities):
        print(f"⚠️ Invalid quantities: {quantities}")
        return False, "Invalid quantity"

    # Suspicious order if any quantity > 5
    if any(q > 5 for q in quantities):
        print(f"⚠️ Suspicious order (quantity > 5): {quantities}")
        return False, "Suspicious quantity"

    # Total price validation
    total_calc = sum(q * p for q, p in zip(order['quantities'], order['prices']))
    if total_calc != order['total']:
        print(f"⚠️ Total price mismatch: expected {total_calc}, got {order['total']}")
        return False, "Total mismatch"

    # Optional: Check address and pin presence
    if not order['address1'] or not order['pin']:
        print("⚠️ Address or pin missing")
        return False, "Missing address/pin"

    return True, "Valid order"

# --- Mark orders as invoiced ---
def mark_orders_invoiced(orders):
    for order in orders:
        supabase.table("orders").update({"invoice_generated": True}).eq("id", order['id']).execute()

# --- Process orders ---
def process_orders(orders):
    confirmed_orders = []
    for order in orders:
        print(f"\nProcessing Order ID: {order['order_id']}")
        is_valid, reason = validate_order(order)
        if not is_valid:
            print(f"❌ Order not confirmed ({reason})")
            continue

        # Payment verification
        if order['payment_method'].lower() == 'cod':
            print("✅ COD order — confirmed")
            confirmed_orders.append(order)
        else:
            payment_id = order.get('payment_id')
            if not payment_id:
                print("⚠️ No payment ID found — cannot verify")
                continue
            if verify_razorpay_payment(payment_id):
                print("✅ Online payment verified — confirmed")
                confirmed_orders.append(order)
            else:
                print("⚠️ Online payment failed — do NOT confirm")

    # Generate invoices and mark as invoiced
    if confirmed_orders:
        generate_invoice(confirmed_orders)
        mark_orders_invoiced(confirmed_orders)
        print(f"\n✅ {len(confirmed_orders)} orders invoiced successfully.")
    else:
        print("\nNo confirmed orders to generate invoices.")

# --- Main ---
if __name__ == "__main__":
    orders = get_new_orders()
    print(f"\nTotal new orders fetched: {len(orders)}")
    process_orders(orders)

# invoice.py
import os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.platypus import Table, TableStyle
from reportlab.lib import colors
from datetime import datetime

def generate_invoice(orders, output_dir="invoices"):
    """
    Generate compact PDF invoices for multiple orders per A4 page.
    Each page contains up to 2 invoices.
    """
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    filename = f"{output_dir}/Invoices_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
    c = canvas.Canvas(filename, pagesize=A4)
    width, height = A4

    block_height = height / 2  # 2 orders per page
    orders_per_page = 2

    for idx, order in enumerate(orders):
        # New page for every 2 orders
        if idx % orders_per_page == 0 and idx != 0:
            c.showPage()

        # Calculate y_top position
        y_top = height - 50 - (block_height * (idx % orders_per_page))

        # --- Company Header ---
        c.setFont("Helvetica-Bold", 16)
        c.drawString(50, y_top, "Indalnova")
        c.setFont("Helvetica", 9)
        c.drawString(50, y_top - 15, "123H  PATEL NAGAR RAMADEVI KANPUR UTTARPRADESH,Pin-208007")
        c.drawString(50, y_top - 30, "Email:teamindalnova@gmail.com | Phone: +91-8840393051")

        # --- Invoice Title & Info ---
        c.setFont("Helvetica-Bold", 14)
        c.drawString(400, y_top, "INVOICE")
        c.setFont("Helvetica", 9)
        c.drawString(400, y_top - 15, f"Invoice Date: {datetime.now().strftime('%d-%m-%Y')}")
        c.drawString(400, y_top - 30, f"Order ID: {order['order_id']}")

        # --- Customer Info ---
        c.setFont("Helvetica-Bold", 12)
        c.drawString(50, y_top - 60, "Bill To:")
        c.setFont("Helvetica", 9)
        c.drawString(50, y_top - 75, f"Name: {order['name']}")
        c.drawString(50, y_top - 90, f"Email: {order['email']}")
        c.drawString(50, y_top - 105, f"Phone: {order['phone']}")
        c.drawString(50, y_top - 120, f"Address: {order['address1']} {order.get('address2','')}, {order['city']}, {order['state']} - {order['pin']}")

        # --- Products Table ---
        data = [["Product ID", "Qty", "Price (₹)", "Total (₹)"]]
        for pid, qty, price in zip(order['products'], order['quantities'], order['prices']):
            data.append([str(pid), str(qty), f"{price}", f"{qty * price}"])
        data.append(["", "", "TOTAL", f"{order['total']}"])

        table = Table(data, colWidths=[100, 40, 60, 60])
        style = TableStyle([
            ('BACKGROUND', (0,0), (-1,0), colors.grey),
            ('TEXTCOLOR',(0,0),(-1,0),colors.whitesmoke),
            ('ALIGN',(1,1),(-1,-1),'CENTER'),
            ('FONTNAME',(0,0),(-1,0),'Helvetica-Bold'),
            ('BOTTOMPADDING',(0,0),(-1,0),6),
            ('GRID',(0,0),(-1,-1),0.5,colors.black),
            ('BACKGROUND', (0,1), (-1,-2), colors.beige),
            ('BACKGROUND', (-2,-1), (-1,-1), colors.lightgrey),
            ('FONTNAME', (-2,-1), (-1,-1), 'Helvetica-Bold'),
        ])
        table.setStyle(style)

        table.wrapOn(c, width, height)
        table.drawOn(c, 50, y_top - 300)

        # --- Payment Info (Mode only) ---
        c.setFont("Helvetica", 9)
        c.drawString(50, y_top - 310, f"Payment Method: {order['payment_method']}")
        if order['payment_method'].lower() != 'cod':
            c.drawString(200, y_top - 310, f"Payment ID: {order.get('payment_id','')}")

        # --- Separator Line ---
        c.line(30, y_top - block_height + 20, width - 30, y_top - block_height + 20)

    c.save()
    print(f"✅ Professional invoice PDF saved: {filename}")

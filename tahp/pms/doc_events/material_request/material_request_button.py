import frappe
from frappe.utils import now, now_datetime, today, getdate
import json

@frappe.whitelist()
def create_purchase_approval(material_request, supplier, items, payment_method, payment_note, delivery_address, delivery_note, delivery_amount_note):
    doc = frappe.new_doc("Purchase Approval")
    doc.supplier = supplier
    doc.posting_date = now()

    if isinstance(items, str):
        items = json.loads(items)
    
    # frappe.session.user
    for item in items:
        doc.append("items", {
            "item_code": item["item_code"],
            "item_name": item["item_name"],
            "qty": item["qty"],
            "stock_uom": item["uom"]
        })

    # Mandatory field
    doc.payment_method = payment_method
    doc.payment_note = payment_note
    doc.delivery_address = delivery_address
    doc.delivery_note = delivery_note
    doc.delivery_amount_note = delivery_amount_note

    doc.insert()
    return doc.as_dict()
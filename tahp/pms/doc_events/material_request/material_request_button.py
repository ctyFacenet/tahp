import frappe
from frappe.model.mapper import get_mapped_doc
from frappe.utils import now_datetime
import json

@frappe.whitelist()
def create_purchase_approval(material_request, supplier, selected_items, payment_method, payment_note, delivery_address, delivery_note, delivery_amount_note):
    if isinstance(selected_items, str):
        selected_items = json.loads(selected_items)
    
    qty_map = {item["item_code"]: item["qty"] for item in selected_items}
    selected_item_codes = set(qty_map.keys())
    
    # Material Request Item -> Purchase Approval Item
    doc = get_mapped_doc(
        "Material Request",
        material_request,
        {
            "Material Request": {
                "doctype": "Purchase Approval"
            },
            "Material Request Item": {
                "doctype": "Purchase Approval Item",
                "condition": lambda source: source.item_code in selected_item_codes
            }
        }
    )
    
    # Required field    
    doc.supplier = supplier
    doc.posting_date = now_datetime()
    doc.payment_method = payment_method
    doc.payment_note = payment_note
    doc.delivery_address = delivery_address
    doc.delivery_note = delivery_note
    doc.delivery_amount_note = delivery_amount_note
    
    for item in doc.items:
        if item.item_code in qty_map:
            item.qty = qty_map[item.item_code]
    
    doc.insert()
    return doc.as_dict()
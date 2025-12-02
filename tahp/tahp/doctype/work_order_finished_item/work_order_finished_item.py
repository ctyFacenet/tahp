# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
import json

class WorkOrderFinishedItem(Document):
    pass

@frappe.whitelist()
def get_finished_items(item_code, qty):
    doc = frappe.get_doc("Item", item_code)
    if not doc.variant_of: return [{"item_code": item_code, "item_name": doc.item_name, "qty": qty}]
    result = []

    result.append({"item_code": doc.name, "item_name": doc.item_name,"qty": qty})

    variants = frappe.db.get_all(
        "Item",
        filters={"variant_of": doc.variant_of, "name": ["!=", doc.name]},
        fields=["name", "item_name"]
    )

    for v in variants:
        result.append({ "item_code": v.name, "item_name": v.item_name, "qty": 0})
    return result

@frappe.whitelist()
def process_finished_items(doc_name, items):
    if isinstance(items, str): items = json.loads(items)
    doc = frappe.get_doc("Work Order Finished Item", doc_name)

    for item in items:
        item = frappe._dict(item)
        qty = float(item.qty) if item.qty is not None else 0
        if item.item_code == doc.item_code:
            frappe.db.set_value("Work Order", doc.work_order, "produced_qty", qty)
            doc.actual_qty = item.qty
            doc.append("items", {"item_code": item.item_code, "qty": qty})
        else:
            if qty > 0:
                doc.append("items", {"item_code": item.item_code, "qty": qty})

    doc.type_posting = "Thành phẩm sau QC"
    doc.save(ignore_permissions=True)
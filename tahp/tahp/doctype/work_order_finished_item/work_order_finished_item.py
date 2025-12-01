# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
import json
from frappe.utils import now_datetime


class WorkOrderFinishedItem(Document):
    pass

@frappe.whitelist()
def get_finished_items(item_code, qty, attribute):
    doc = frappe.get_doc("Item", item_code)
    if not doc.variant_of: return

    attribute_value = None
    result = [{"item_code": item_code, "item_name": doc.item_name, "qty": qty}]
    for row in doc.attributes:
        if row.attribute == attribute:
            attribute_value = row.attribute_value
            break

    variants = frappe.db.get_all("Item", filters={"variant_of": doc.variant_of, "name": ["!=", item_code]}, fields=["name"])
    for variant in variants:
        variant_doc = frappe.get_doc("Item", variant.name)
        for row in variant_doc.attributes:
            if row.attribute == attribute and row.attribute_value == attribute_value:
                result.append({"item_code": variant.name, "item_name": variant_doc.item_name, "qty": 0})
                break

    return result

@frappe.whitelist()
def process_finished_items(doc_name, items):
    if isinstance(items, str): items = json.loads(items)
    doc = frappe.get_doc("Work Order Finished Item", doc_name)

    for item in items:
        item = frappe._dict(item)
        item.qty = float(item.qty)
        if item.item_code == doc.item_code:
            frappe.db.set_value("Work Order", doc.work_order, "produced_qty", item.qty)
            doc.actual_qty = item.qty
            doc.append("items", {"item_code": item.item_code, "qty": item.qty})
        else:
            if item.qty > 0:
                doc.append("items", {"item_code": item.item_code, "qty": item.qty})

    doc.type_posting = "Thành phẩm sau QC"
    doc.save(ignore_permissions=True)
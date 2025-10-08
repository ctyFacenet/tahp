# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document


class CustomInvoiceAllocation(Document):
	pass

@frappe.whitelist()
def get_invoice_allocation_items(items):
    data = {"Phiếu nhập kho": [], "Phiếu xuất kho": []}
    flag = False

    if isinstance(items, str):
        items = json.loads(items)

    for name in items:
        doc = frappe.get_doc("Custom Invoice Allocation", name)
        if doc.docstatus == 0:
            flag = True 
            if doc.type_posting == "Phiếu nhập":
                data["Phiếu nhập kho"].append({
                    "invoice_allocation": name,
                    "qty": doc.in_qty
                })
            elif doc.type_posting == "Phiếu xuất":
                data["Phiếu xuất kho"].append({
                    "invoice_allocation": name,
                    "qty": doc.out_qty
                })                
            doc.status = "In xong"
            doc.submit()
        else:
            continue

    result = []

    for key, row in data.items():
        if len(row) > 0:
            summary = frappe.new_doc("Custom Invoice Summary")
            summary.type_posting = key
            for value in row:
                summary.append("items", value)
            employee_name = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
            if employee_name:
                summary.w_representative = employee_name
            summary.save(ignore_permissions=True)
            summary.submit()
            result.append(summary.name)

    return {"flag": flag, "result": result}
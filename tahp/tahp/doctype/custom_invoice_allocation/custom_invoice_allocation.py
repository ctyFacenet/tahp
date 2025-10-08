# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document


class CustomInvoiceAllocation(Document):
	pass

@frappe.whitelist()
def get_invoice_allocation_items(items):
    """
    items: list các name của Custom Invoice Allocation
    Trả về danh sách chi tiết + flag
    """
    data = []
    flag = False

    if isinstance(items, str):
        items = json.loads(items)

    for name in items:
        doc = frappe.get_doc("Custom Invoice Allocation", name)
        if doc.docstatus == 0:
            flag = True  # có ít nhất 1 bản ghi chưa submit
            data.append({
                "posting_date": doc.posting_date,
                "stock_entry": doc.stock_entry,
                "approved_date": doc.approved_date,
                "item_code": doc.item_code,
                "item_name": doc.item_name,
                "stock_uom": doc.stock_uom,
                "in_qty": doc.in_qty,
                "out_qty": doc.out_qty,
            })
            doc.status = "In xong"
            doc.submit()
        else:
            # chỉ bỏ qua, không thêm data
            continue

    return {"flag": flag, "data": data}
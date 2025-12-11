import frappe
from frappe.utils import flt
import json

import frappe
from frappe.utils import flt
import json

@frappe.whitelist()
def update_payment_info(docname, payment_rows):
    if isinstance(payment_rows, str):
        payment_rows = json.loads(payment_rows)

    doc = frappe.get_doc("Purchase Order", docname)

    total_amount = flt(doc.custom_total_amount)
    new_children = []
    total_billed_percent = 0

    for row in payment_rows:
        percent = flt(row.get("percent", 0))

        total = flt(total_amount * (percent / 100))

        child = {
            "from_time": row.get("from_time"),
            "payment_type": row.get("payment_type"),
            "percent": percent,
            "total": total,
            "status": row.get("status")
        }

        new_children.append(child)

        if row.get("status") == "Đã thanh toán":
            total_billed_percent += percent

    doc.set("custom_payment", [])
    for c in new_children:
        doc.append("custom_payment", c)
    doc.db_set("per_billed", min(flt(total_billed_percent), 100))
    doc.save(ignore_permissions=True)
    return {
        "status": "success",
        "message": "Cập nhật thông tin thanh toán thành công",
        "per_billed": doc.per_billed
    }


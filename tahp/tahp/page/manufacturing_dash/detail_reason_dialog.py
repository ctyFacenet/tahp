import frappe
import json

def get_detail_reason(work_orders):
    if isinstance(work_orders, str):
        work_orders = json.loads(work_orders)

    results = []
    for wo in work_orders:
        wo_doc = frappe.get_doc("Work Order", wo)
        shift_leader = frappe.db.get_value("Employee", wo_doc.custom_shift_leader, "employee_name")
        comments = frappe.get_all("Comment", filters={"reference_name": wo.name, "comment_type": "Workflow"}, fields=["creation", "owner", "content"], order_by="creation asc")
        comment = next((c for c in comments if c["content"] == "Duyệt xong"), None)
        foreman = frappe.db.get_value("Employee", comment.owner, "employee_name") if comment else None
        requireds = []
        for row in wo_doc.required_items:
            requireds.append({
                "item_code": row.item_code, 
                "item_name": row.item_name, 
                "standard_qty": row.required_qty, 
                "actual_qty": row.consumed_qty,
                "stock_uom": row.stock_uom
            })

        results.append({
            "name": wo_doc.name,
            "finished_reason": wo_doc.custom_finished_reason,
            "required_reason": wo_doc.custom_requireds_reason,
            "shift_leader": shift_leader,
            "foreman": foreman,
            "employee_count": wo_doc.custom_employee_count,
            "shift": wo_doc.custom_shift,

        })


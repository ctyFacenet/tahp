import frappe
import json

@frappe.whitelist()
def get_detail_reason(work_orders=None, from_date=None, to_date=None):
    if not work_orders:
        if from_date:
            from_date = frappe.utils.getdate(from_date)
        if to_date:
            to_date = frappe.utils.getdate(to_date)
        work_orders = frappe.db.get_all("Work Order", filters={"planned_start_date": ["between", [from_date, to_date]]}, fields=["name"], pluck="name")

    if isinstance(work_orders, str):
        try:
            work_orders = json.loads(work_orders)
        except Exception:
            work_orders = [work_orders]

    results = []
    for wo in work_orders:
        wo_doc = frappe.get_doc("Work Order", wo)
        shift_leader = frappe.db.get_value("Employee", wo_doc.custom_shift_leader, "employee_name")
        comments = frappe.get_all("Comment", filters={"reference_name": wo_doc.name, "comment_type": "Workflow"}, fields=["creation", "owner", "content"], order_by="creation asc")
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

        production = []
        finished = frappe.db.get_all("Work Order Finished Item", filters={"work_order": wo, "type_posting": ["in", ["Thành phẩm", "Thành phẩm sau QC", "Phụ phẩm"]]})
        for f in finished:
            f_doc = frappe.get_doc("Work Order Finished Item", f)
            if f_doc.type_posting == "Thành phẩm" or f_doc.type_posting == "Phụ phẩm":
                stock_uom = frappe.db.get_value("Item", f_doc.item_code, "stock_uom")
                production.append({
                    "item_Code": f_doc.item_code,
                    "item_name": f_doc.item_name,
                    "standard_qty": f_doc.standard_qty,
                    "actual_qty": f_doc.actual_qty,
                    "stock_uom": stock_uom,
                    "scrap": True if f_doc.type_posting == "Phụ phẩm" else False
                })
            elif f_doc.type_posting == "Thành phẩm sau QC":
                for item in f_doc.items:
                    production.append({
                        "item_Code": item.item_code,
                        "item_name": item.item_name,
                        "standard_qty": f_doc.standard_qty if item.item_code == f_doc.item_code else 0,
                        "actual_qty": item.qty,
                        "stock_uom": item.stock_uom
                    })

        handover = frappe.db.get_all("Shift Handover", filters={"work_order": wo, "docstatus": ["!=", "2"]}, fields=["name"], limit=1)
        shift_handover = None

        if handover:
            shift_doc = frappe.get_doc("Shift Handover", handover[0].name)
            notes = { 
                "name": shift_doc.name, 
                "notes_1": getattr(shift_doc, 'notes_1', None), 
                "notes_2": getattr(shift_doc, 'notes_2', None), 
                "notes_3": getattr(shift_doc, 'notes_3', None),
            }
            notes = {k: v for k, v in notes.items() if v}
            if notes: shift_handover = notes

        results.append({
            "name": wo_doc.name,
            "finished_reason": wo_doc.custom_finished_reason,
            "required_reason": wo_doc.custom_requireds_reason,
            "shift_leader": shift_leader,
            "foreman": foreman,
            "employee_count": wo_doc.custom_employee_count,
            "shift": wo_doc.custom_shift,
            "requireds": requireds,
            "production": production,
            "shift_handover": shift_handover,
            "plan": wo_doc.custom_plan,
            "actual_qty": wo_doc.produced_qty,
            "standard_qty": wo_doc.qty,
            "item_name": wo_doc.item_name,
            "item_code": wo_doc.production_item,
        })

    return results


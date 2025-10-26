import frappe

def on_submit(doc, method):
    if doc.status == "Completed" and doc.work_order:
        wo = frappe.get_doc("Work Order", doc.work_order)
        shift_leader = wo.custom_shift_leader
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if user:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": f"LSX công đoạn <b>{doc.operation}</b> của LSX ca {wo.name} đã hoàn thành",
                "email_content": f"LSX công đoạn <b>{doc.operation}</b> của LSX ca {wo.name} đã hoàn thành",
                "type": "Alert",
                "document_type": "Job Card",
                "document_name": doc.name
            }).insert(ignore_permissions=True)
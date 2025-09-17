import frappe

def after_insert(doc, method):
    if doc.custom_shift_leader:
        shift_leader = doc.custom_shift_leader
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if user:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": f"Trưởng ca đã được giao LSX ca mới: <b style='font-weight:bold'>{doc.name}</b>",
                "email_content": f"Trưởng ca đã được giao LSX ca mới: <b style='font-weight:bold'>{doc.name}</b>",
                "type": "Alert",
                "document_type": "Work Order",
                "document_name": doc.name
            }).insert(ignore_permissions=True)

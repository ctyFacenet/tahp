import frappe

def on_submit(doc, method):
    if doc.status == "Completed" and doc.work_order:
        wo = frappe.get_doc("Work Order", doc.work_order)
        shift_leader = wo.custom_shift_leader
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        subject = f"Công đoạn <b>{doc.operation}</b> của LSX ca {wo.name} đã hoàn thành"
        job_card_count = frappe.db.count("Job Card", filters={"work_order": wo.name, "docstatus": 1})
        operation_count = len(wo.operations)
        document_type = "Job Card"
        document_name = doc.name
        if job_card_count == operation_count:
            subject = f"Công đoạn <b style='font-weight:bold'>{doc.operation}</b> đã xong. <b style='font-weight:bold'>Toàn bộ công đoạn của LSX Ca {wo.name} đã hoàn thành</b>"
            document_type = "Work Order"
            document_name = wo.name
        if user != "":
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": subject,
                "email_content": subject,
                "type": "Alert",
                "document_type": document_type,
                "document_name": document_name
            }).insert(ignore_permissions=True)
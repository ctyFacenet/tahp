import frappe
from tahp.doc_events.job_card.job_card import set_inputs, set_subtask

def after_insert(doc, method):
    settings = frappe.get_single("Manufacturing Settings")

    if not doc.wip_warehouse:
        doc.wip_warehouse = settings.default_wip_warehouse

    if not doc.workstation_type:
        ws = frappe.get_doc("Workstation", doc.workstation)
        doc.workstation_type = ws.workstation_type

    doc.save(ignore_permissions=True)

    if not doc.custom_input_table:
        set_inputs(doc.name)

    if not doc.custom_subtask:
        set_subtask(doc.name)

    if doc.work_order:
        wo_doc = frappe.get_doc("Work Order", doc.work_order)
        for op in wo_doc.operations:
            if op.operation and op.operation == doc.operation and op.custom_employee:
                user = frappe.db.get_value("Employee", op.custom_employee, "user_id")
                if user != "":
                    frappe.get_doc({
                        "doctype": "Notification Log",
                        "for_user": user,
                        "subject": f"Bạn có LSX công đoạn mới: <b style='font-weight:bold'>{doc.operation} - {doc.name}</b> cần thực hiện",
                        "email_content": f"Bạn có LSX công đoạn mới: {doc.operation} - {doc.name} cần thực hiện",
                        "type": "Alert",
                        "document_type": "Job Card",
                        "document_name": doc.name
                    }).insert(ignore_permissions=True)
                    return
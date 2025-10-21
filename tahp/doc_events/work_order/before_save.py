import frappe

def before_save(doc, method):
    flag = False
    for row in doc.operations:
        if not row.workstation or row.workstation == None:
            flag = True
            break

    noti_work_order(doc)

    if flag:
        frappe.throw("Vui lòng điền đủ cụm thiết bị/ thiết bị cho công đoạn")

def noti_work_order(doc):
    if doc.workflow_state == "Đợi Quản đốc duyệt":
        users = frappe.db.get_all("User", filters={"enabled": 1}, fields=["name", "full_name"])
        for u in users:
            roles = frappe.get_all("Has Role", filters={"parent": u.name}, fields=["role"])
            role_names = [r.role for r in roles]
            if "Quản đốc" in role_names:
                frappe.get_doc({
                    "doctype": "Notification Log",
                    "for_user": u,
                    "subject": f"Quản đốc vui lòng duyệt LSX ca <b style='font-weight:bold'>{doc.name}</b>",
                    "email_content": f"Quản đốc vui lòng duyệt LSX ca <b style='font-weight:bold'>{doc.name}</b>",
                    "type": "Alert",
                    "document_type": "Work Order",
                    "document_name": doc.name
                }).insert(ignore_permissions=True)
    elif doc.workflow_state == "Duyệt xong":
        shift_leader = doc.custom_shift_leader
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if user:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": f"Quản đốc đã duyệt LSX Ca <b style='font-weight:bold'>{doc.name}</b>",
                "email_content": f"Quản đốc đã duyệt LSX Ca <b style='font-weight:bold'>{doc.name}</b>",
                "type": "Alert",
                "document_type": "Work Order",
                "document_name": doc.name
            }).insert(ignore_permissions=True)
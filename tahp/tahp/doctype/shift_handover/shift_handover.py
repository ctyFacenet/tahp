# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ShiftHandover(Document):
   
   def autoname(self):
       pass

@frappe.whitelist()
def reject(name, comment):
    doc = frappe.get_doc("Shift Handover", name)
    wo_name = doc.work_order
    wo_doc = frappe.get_doc("Work Order", wo_name)
    shift_leader = wo_doc.custom_shift_leader
    user = frappe.db.get_value("Employee", shift_leader, "user_id")

    subject = f"Biên bản giao ca đã bị từ chối: <b style='font-weight:bold'>{wo_name}</b>. Lý do: {comment}"
    frappe.get_doc({
        "doctype": "Notification Log",
        "for_user": user,
        "subject": subject,
        "email_content": comment,
        "type": "Alert",
        "document_type": "Shift Handover",
        "document_name": doc.name
    }).insert(ignore_permissions=True)

    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": "Shift Handover",
        "reference_name": doc.name,
        "content": f"Từ chối: {comment}",
        "comment_email": frappe.session.user,
        "comment_by": frappe.session.user_fullname
    }).insert(ignore_permissions=True)
    doc.save(ignore_permissions=True)


def create_shift_handover(work_order_name):
    work_order = frappe.get_doc('Work Order', work_order_name)
    existing_handover = frappe.db.exists('Shift Handover', {"work_order": work_order_name})
    if existing_handover: return

    shift_handover = frappe.new_doc('Shift Handover')
    shift_handover.work_order = work_order_name
    shift_handover.shift_leader_1 = work_order.custom_shift_leader
    
    operations = [op.operation for op in work_order.operations]
    job_cards = frappe.db.get_all('Job Card', filters = {'work_order': work_order_name, 'operation': ["in", operations]}, fields = ['name', 'operation'])

    for op in operations:
        for jc in job_cards:
            if jc.operation == op:
                shift_handover.append("job_card_list", {"operation": op, "job_card": jc.name})

    for op in work_order.operations:
        if op.workstation:
            childs = frappe.db.get_all("Workstation", filters={"custom_parent": op.workstation}, fields=["name"], order_by="name asc")
            if childs:
                for ch in childs:
                    shift_handover.append("table", {"caption": ch.name})
            else:
                shift_handover.append("table", {"caption": op.workstation})

    shift_handover.insert(ignore_permissions=True)

import frappe
from tahp.tahp.doctype.quality_card.quality_card import end

def on_submit(doc, method):
    if doc.stock_entry_type == 'Manufacture' and doc.work_order:
        # lấy danh sách Shift Handover liên quan
        shift_handovers = frappe.db.get_all(
            'Shift Handover',
            filters={'work_order': doc.work_order},
            fields=['name']
        )
        
        # duyệt từng dict trong list
        for handover in shift_handovers:
            handover_doc = frappe.get_doc('Shift Handover', handover.name)
            handover_doc.stock_entry = doc.name
            handover_doc.save(ignore_permissions=True)

        # if doc.work_order:
        #     end(doc.work_order)

            wo_doc = frappe.get_doc("Work Order", doc.work_order)
            shift_leader = wo_doc.custom_shift_leader
            if not shift_leader: continue
            user = frappe.db.get_value("Employee", shift_leader, "user_id")
            if not user: continue
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": "Vui lòng kiểm tra nội dung BBGC và gửi bàn giao",
                "email_content": "Vui lòng kiểm tra nội dung BBGC và gửi bàn giao",
                "type": "Alert",
                "document_type": "Shift Handover",
                "document_name": handover.name
            }).insert(ignore_permissions=True)
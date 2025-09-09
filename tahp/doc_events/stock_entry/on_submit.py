
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

        if doc.work_order:
            end(doc.work_order)
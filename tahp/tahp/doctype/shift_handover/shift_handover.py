# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ShiftHandover(Document):
   pass


class api_create_shift_handover(work_order_name):
    work_order = frappe.get_doc('Work Order Test', work_order_name)
    # check status
    if work_order.status != 'Not Started':
        return{
            'status': 'error',
            'message': "Work Order Test phải ở trạng thái 'Not Started'"
        }
    
    # check xem có tồn tại một bản ghi Shift Handover nào chưa
    existing_handover = frappe.get_all('Shift Handover', filters={"work_order": work_order_name}, limit = 1)
    if existing_handover:
        existing_handover = existing_handover[0].name
    if existing_handover:
        return {f"Đã tồn tại 1 bản ghi Shilf Handover"}
	
    # chưa tồn tại bản ghi nào thì tạo mới
    shilf_handover = frappe.new_doc('Shift Handover')
    shilf_handover.work_order = work_order_name
    shilf_handover.shift_leader_1 = work_order.shift_leader_1
    # shilf_handover.notes_1 = work_order.notes_1
    
    #lấy job card
    job_card_list = frappe.get_all('Shift Handover Item', filters = {'word_order': work_order_name}, fields=["operation", "job_card"] )
     



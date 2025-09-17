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

    subject = f"Biên bản giao ca đã bị từ chối: <b style='font-weight:bold'>{wo_name}</b>"
    frappe.get_doc({
        "doctype": "Notification Log",
        "for_user": user,
        "subject": subject,
        "email_content": comment,
        "type": "Alert",
        "document_type": "Shift Handover",
        "document_name": doc.name
    }).insert(ignore_permissions=True)

    # Thêm comment vào Work Order (hoặc bạn đổi sang Shift Handover nếu muốn)
    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": "Shift Handover",
        "reference_name": doc.name,
        "content": f"Từ chối: {comment}",
        "comment_email": frappe.session.user,
        "comment_by": frappe.session.user_fullname
    }).insert(ignore_permissions=True)

def create_shift_handover(work_order_name):
    """
    Tạo mới một bản ghi Shift Handover dựa trên Work Order.

    Quy trình:
        1. Lấy Work Order theo `work_order_name`.
        3. Kiểm tra xem đã tồn tại Shift Handover nào cho Work Order này chưa.
            - Nếu có, trả về lỗi.
        4. Nếu chưa có, tạo mới Shift Handover:
            - Gán work_order, shift_leader_1 (từ custom field trên Work Order).
            - Duyệt qua operations của Work Order:
                + Tìm tất cả Job Card theo work_order + operation.
                + Ghi nhận Job Card ID vào child table `job_card_list`.
        5. Lưu Shift Handover vào database.

    Args:
        work_order_name (str): ID của Work Order cần tạo Shift Handover.

    Returns:
        dict: 
            - Nếu lỗi:
                {"status": "error", "message": <lý do>}
            - Nếu thành công:
                {"status": "success", "handover": <ID Shift Handover>}
    """
    work_order = frappe.get_doc('Work Order', work_order_name)
    print("Work Order status:", work_order.status)
    # check xem có tồn tại một bản ghi Shift Handover nào chưa
    existing_handover = frappe.db.exists('Shift Handover', {"work_order": work_order_name})
    if existing_handover:
        return {"status": "error", "message": "Đã tồn tại 1 bản ghi Shift Handover"}
    # chưa tồn tại bản ghi nào thì tạo mới
    shift_handover = frappe.new_doc('Shift Handover')
    shift_handover.work_order = work_order_name
    shift_handover.shift_leader_1 = work_order.custom_shift_leader
    # shilf_handover.notes_1 = work_order.notes_1
    
    #duyêt qua operations của workorder lấy ra job_card
    for op in work_order.operations:
        
        job_cards = frappe.get_all(
            'Job Card',
            filters = {'work_order': work_order_name, 'operation': op.operation},
            fields = ['name']
        )
        
        operation_doc = frappe.get_doc('Operation', op.operation)
        print('check1')
        shift_handover.append("table", {
                                        
                                "caption": operation_doc.name,
                                "status":'',
                                "safe": '',
                                "clean": '',
                                'is_header': 1
                                
                            })
        if hasattr(operation_doc, 'custom_subtasks') and operation_doc.custom_subtasks:
               
                subtasks = operation_doc.custom_subtasks
                
                # Duyệt qua từng row trong child table
                for subtask_row in subtasks:
                    if hasattr(subtask_row, 'reason') and subtask_row.reason:
                       
                        reason = subtask_row.reason.strip()
                        if reason :
                           
                            shift_handover.append("table", {
                                "caption": reason,
                                'is_header': 0
                               
                            })
               
       
        for jd in job_cards:
            shift_handover.append("job_card_list", {
                    "operation": op.operation,
                    "job_card": jd['name']
                })

    shift_handover.insert(ignore_permissions=True)
    return {
        "status": "success",
        "handover": shift_handover.name
    }
import frappe

def after_insert_qc(doc, method):
    """
    Hàm hook được gọi sau khi một chứng từ Quality Inspection (QC) được tạo.

    Chức năng:
        - Kiểm tra nếu QC liên kết với Job Card.
        - Tìm Work Order từ Job Card.
        - Lấy ra chứng từ Shift Handover có trạng thái "Draft" tương ứng với Work Order đó.
        - Chuyển đổi trạng thái QC từ tiếng Anh sang tiếng Việt:
            + "Rejected"  → "Không đạt"
            + "Accepted" → "Đạt"
        - Thêm một dòng vào bảng con (child table) `Shift Handover QC` với thông tin:
            + Công đoạn (operation)
            + Mã phiếu QC (qc_reference)
            + Kết quả (result)
            + Thời gian tạo (created_on)
        - Lưu lại và commit thay đổi vào cơ sở dữ liệu.

    Tham số:
        doc (Document): Document Quality Inspection vừa được insert.
        method (str): Tên method hook gọi (ví dụ: "after_insert").

    Trả về:
        None
    """

    if doc.reference_type != 'Job Card':
        return

    job_card = frappe.get_doc('Job Card', doc.reference_name)
    print(job_card.name)
    work_order = job_card.work_order
    print(work_order)
    shift_handover = frappe.get_all(
        "Shift Handover",
        filters = {'work_order': work_order, "workflow_state": "Draft"},
        fields = ['name'],
        limit = 1
    )
   
    
    if not shift_handover:
        return
    
    sh_doc = frappe.get_doc('Shift Handover', shift_handover[0].name)
    print(sh_doc.name)
    # # map status eng -> vie
    if doc.status == "Rejected":
        result = "Không đạt"
      
    elif doc.status == "Accepted":
        result = "Đạt"
      
        
    else:
        result = doc.status 
    
    # append vao child doctype Shift Handover QC
    sh_doc.append('list_qc', {
        "operation": job_card.operation,
        "qc_reference": doc.name,
        'result': result,
        "created_on": doc.creation 
        
    })
    
    
    sh_doc.save(ignore_permissions=True)
    frappe.db.commit()

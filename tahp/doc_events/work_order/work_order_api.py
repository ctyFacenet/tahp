import frappe

@frappe.whitelist()
def check_shift_handover(work_order, custom_plan, custom_plan_code):
    """
        Kiểm tra tình trạng bàn giao ca trước khi cho phép tạo Work Order mới.

        Args:
            work_order (str): Tên Work Order hiện tại (đang thao tác).
            custom_plan (str): Mã kế hoạch sản xuất (Custom Plan).
            custom_plan_code (str): Mã code kế hoạch sản xuất.

        Returns:
            dict: 
                - Nếu tồn tại Shift Handover của Work Order trước đó chưa Completed, 
                trả về warning chứa link đến biên bản bàn giao chưa hoàn thành.
                - Nếu không có vấn đề, trả về dict rỗng.
    """
    pre_work_order = frappe.get_all(
        'Work Order',
        filters = {
            'custom_plan': custom_plan,
            'custom_plan_code': custom_plan_code,
            "name": ["!=", work_order],
        },
        fields = ['name', 'creation']
    )
   
    if pre_work_order:
        pre_work_order.sort(key=lambda x: x.creation, reverse=True)
        late_work_order = pre_work_order[0]
        
        shift_handover = frappe.db.get_all(
            'Shift Handover',
            filters={'work_order': late_work_order.name},
            fields=['name', 'workflow_state']
        )
        if shift_handover:
            for sh in shift_handover:
                if sh.workflow_state != "Completed":
                    # link đến Shift Handover chưa Submit
                    work_order_link = f"/app/shift-handover/{sh.name}"

                    warning_html = f"""
                        <div class="row">
                            <div class="col-8 d-flex align-items-center">
                                <span>
                                    Vui lòng nhận bàn giao công việc của LSX Ca trước. Mã: <b>{late_work_order.name}</b>
                                </span>
                            </div>
                            <div class="col-4 d-flex align-items-center justify-content-end">
                                <a href="{work_order_link}" class="btn btn-primary">Nhận bàn giao</a>
                            </div>
                        </div>
                    """

                    return {
                        "warning": warning_html
                    }
    
    return {}

@frappe.whitelist()
def complete_shift_handover(shift_handover_name):
    """
        Hoàn tất biên bản bàn giao ca và cập nhật thông tin trưởng ca mới.

        Args:
            shift_handover_name (str): Tên (ID) của Shift Handover cần hoàn tất.

        Returns:
            dict: Nếu không có vấn đề, trả về dict rỗng.
    """
    sh = frappe.get_doc("Shift Handover", shift_handover_name)
    

    # Tìm Work Order mới nhất có cùng custom_plan và custom_plan_code
    prev_wo = frappe.get_doc("Work Order", sh.work_order)
    new_wo = frappe.get_all(
        "Work Order",
        filters={
            "custom_plan": prev_wo.custom_plan,
            "custom_plan_code": prev_wo.custom_plan_code,
            "creation": [">", prev_wo.creation]
        },
        fields=["name", "custom_shift_leader"],
        order_by="creation asc",
        limit=1
    )

    if new_wo:
        sh.db_set("shift_leader_2", new_wo[0].custom_shift_leader, update_modified=True)
        
    sh.db_set("workflow_state", "Completed", update_modified=True)

    return {
        # "status": "success",
        # "message": f"Đã nhận bàn giao. Trưởng ca 2 = {sh.shift_leader_2}"
    }

    # doc = frappe.get_doc
    # doc.shift_ 
    # doc.save()

@frappe.whitelist()
def execute_shift_handover(doc):
    """
    Kiểm tra xem Work Order trước đó (theo cùng custom_plan và custom_plan_code)
    đã được bàn giao xong (Shift Handover completed) chưa. 
    Nếu chưa thì chặn không cho submit Work Order hiện tại.

    Logic:
    1. Lấy danh sách Work Order đã submit có cùng `custom_plan` và `custom_plan_code`,
       trừ Work Order hiện tại.
    2. Chọn Work Order được tạo gần nhất (late_work_order).
    3. Kiểm tra danh sách Shift Handover liên quan đến late_work_order.
    4. Nếu tồn tại biên bản Shift Handover mà trạng thái != "Completed"
       → Raise lỗi, không cho submit Work Order hiện tại.

    Args:
        doc (Document): Work Order document hiện tại.
        method (str): Tên method gọi hook (ở đây là "before_submit").

    Raises:
        frappe.ValidationError: Nếu có biên bản bàn giao (Shift Handover)
                               chưa được hoàn thành.
    """
   
    
    if doc.custom_plan and doc.custom_plan_code:
       
        pre_work_order = frappe.get_all(
            'Work Order',
            filters = { 'custom_plan': doc.custom_plan,
                        'custom_plan_code': doc.custom_plan_code,
                        "name": ["!=", doc.name], # check khac name
                        "docstatus": 1  # 1: submit
                       
                       },
            fields = ['name', 'creation']
            
           
            
        )
        if pre_work_order:
            pre_work_order.sort(key = lambda x: x.creation, reverse=True )
            late_work_order = pre_work_order[0]
            # check Shift Handover của work Order
            shift_handover = frappe.get_all('Shift Handover', 
                                            filters = {'work_order': late_work_order.name},
                                            fields = ['name', 'workflow_state']
                                            ) 
           
            if shift_handover:
                for sh in shift_handover:
                    if sh.workflow_state != "Completed":
                       
                        # link đến Shift Handover chưa Submit
                        work_order_link = f'<a href="/app/shift-handover/{sh.name}" target="_blank">{sh.name}</a>'
                        frappe.throw(
                            f"Không thể submit LSX Ca này."
                            f"Biên bản giao ca {sh.name} của LSX {late_work_order.name} chưa được hoàn thành bàn giao."
                            f"Vui lòng vào biên bản {work_order_link} và nhấn 'Nhận bàn giao'."
                        )
import frappe

def execute(doc, method):
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
    

        
def before_submit(doc, method):
    """
    Hook function chạy trước khi Work Order được submit.

    Thực hiện gọi hàm `execute` để kiểm tra điều kiện bàn giao ca (Shift Handover)
    trước khi cho phép submit Work Order.
    
    Args:
        doc (Document): Work Order document hiện tại.
        method (str): Tên method của hook (ở đây là "before_submit").
    """
    execute(doc, method)
    

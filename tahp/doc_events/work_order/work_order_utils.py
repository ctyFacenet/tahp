import frappe
from frappe.utils import nowdate, now_datetime

@frappe.whitelist()
def create_qc_and_notify(work_order_name):
    """
    Creates Quality Inspection documents for each operation and sends a notification.
    """
    try:
        work_order = frappe.get_doc("Work Order", work_order_name, ignore_permissions=True)
        
        if not work_order.custom_is_qc_tracked:
            return "QC tracking is not enabled for this Work Order."

        qc_docs = []
        for operation in work_order.operations:
            if operation.custom_is_qc_tracked:
                # Tìm Job Card (LSX Công đoạn) tương ứng với Work Order và Operation
                job_card = frappe.get_list(
                    "Job Card",
                    filters={
                        "work_order": work_order_name,
                        "operation": operation.operation
                    },
                    fields=["name"]
                )
                
                if not job_card:
                    frappe.throw(f"Không tìm thấy Job Card cho Công đoạn: {operation.operation}")
                
                job_card_name = job_card[0].get("name")

                # FIX: Lấy tên Mẫu QC từ trường 'qc_template' trên Operation Tracker
                inspection_template_name = frappe.db.get_value(
                    "Operation Tracker",
                    {"operation": operation.operation},
                    "qc_template"
                )
                
                if not inspection_template_name:
                    frappe.throw(f"Không tìm thấy Mẫu QC cho Công đoạn: {operation.operation}")

                # Create Quality Inspection document
                qc_doc = frappe.new_doc("Quality Inspection")
                qc_doc.reference_type = "Job Card"
                
                qc_doc.reference_name = job_card_name
                qc_doc.quality_inspection_template = inspection_template_name
                
                qc_doc.item_code = work_order.production_item
                qc_doc.inspection_type = "In Process"
                qc_doc.work_order = work_order_name
                qc_doc.operation = operation.operation
                qc_doc.inspected_by = frappe.session.user
                qc_doc.sample_size = 1

                qc_doc.insert(ignore_permissions=True)
                qc_docs.append(qc_doc)
                
                # Gửi thông báo đến người quản lý QC
                qc_users = frappe.db.get_list(
                    "Has Role",
                    filters={"role": "Quality Manager"},
                    pluck="parent"
                )

                frappe.publish_realtime(
                    "notification",
                    {
                        "subject": "Phiếu QC mới đã được tạo",
                        "message": f"Một phiếu QC mới đã được tạo cho Công đoạn: {operation.operation} của Lệnh sản xuất: {work_order_name}. Vui lòng kiểm tra.",
                        "alert_icon": "fa fa-check-circle",
                        "alert_type": "info",
                        "link": f"/app/quality-inspection/{qc_doc.name}",
                        "for_user": qc_users
                    }
                )

        frappe.db.commit()
        return f"Successfully created {len(qc_docs)} Quality Inspection documents."

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create_qc_and_notify")
        frappe.db.rollback()
        return f"An error occurred: {str(e)}"

def create_new_qc_if_needed():
    """
    Tạo các phiếu QC mới dựa trên tần suất (frequence) được lưu trữ
    trên Operation Tracker và thời gian của phiếu QC cuối cùng đã được gửi.
    """
    try:
        # Lấy tất cả các Work Order đang hoạt động và có QC tracking
        active_work_orders = frappe.get_list(
            "Work Order",
            filters={"docstatus": 1, "custom_is_qc_tracked": 1},
            fields=["name"]
        )

        for wo in active_work_orders:
            work_order_name = wo.get("name")
            
            # Lấy phiếu QC mới nhất đã được gửi (submitted)
            last_submitted_qc = frappe.get_list(
                "Quality Inspection",
                filters={"work_order": work_order_name, "docstatus": 1},
                fields=["creation", "operation"],
                order_by="creation desc",
                limit=1
            )
            
            if not last_submitted_qc:
                # Nếu chưa có phiếu QC nào được gửi cho Work Order này, bỏ qua.
                continue

            # Lấy thông tin tần suất từ Operation Tracker
            operation = last_submitted_qc[0].operation
            frequence_minutes = frappe.db.get_value(
                "Operation Tracker",
                filters={"operation": operation},
                fieldname="frequence"
            )

            # Nếu không tìm thấy tần suất, bỏ qua
            if not frequence_minutes:
                continue

            last_qc_creation = now_datetime(last_submitted_qc[0].creation)
            
            # Tính toán khoảng thời gian đã trôi qua
            time_elapsed = now_datetime() - last_qc_creation
            
            # So sánh khoảng thời gian đã trôi qua với tần suất yêu cầu
            # Tần suất được lưu dưới dạng phút
            if time_elapsed.total_seconds() >= (frequence_minutes * 60):
                # Gọi hàm tạo phiếu QC mới mà chúng ta đã làm việc
                frappe.call(
                    method="your_app.your_module.create_qc_and_notify", # Thay thế bằng đường dẫn thực tế của bạn
                    work_order_name=work_order_name
                )
        
        frappe.db.commit()
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create_new_qc_if_needed")
        frappe.db.rollback()
import frappe
from frappe.utils import nowdate, now_datetime
import datetime

@frappe.whitelist()
def create_qc_and_notify(job_card_name):
    """
    Creates Quality Inspection documents for a specific Job Card and sends a notification.
    """
    try:
        job_card = frappe.get_doc("Job Card", job_card_name, ignore_permissions=True)
        work_order = frappe.get_doc("Work Order", job_card.work_order, ignore_permissions=True)
        
        # Lấy Mẫu QC từ Operation Tracker
        op_tracker = frappe.db.get_list(
            "Operation Tracker",
            filters={"operation": job_card.operation},
            fields=["qc_template", "frequency"]
        )
        
        if not op_tracker or not op_tracker[0].get("qc_template"):
            frappe.throw(f"Không tìm thấy Mẫu QC cho Công đoạn: {job_card.operation}")
        
        inspection_template_name = op_tracker[0].get("qc_template")

        # Create Quality Inspection document
        qc_doc = frappe.new_doc("Quality Inspection")
        qc_doc.reference_type = "Job Card"
        
        qc_doc.reference_name = job_card_name
        qc_doc.quality_inspection_template = inspection_template_name
        
        qc_doc.item_code = work_order.production_item
        qc_doc.inspection_type = "In Process"
        qc_doc.work_order = job_card.work_order
        qc_doc.operation = job_card.operation
        qc_doc.inspected_by = frappe.session.user
        qc_doc.sample_size = 1

        qc_doc.insert(ignore_permissions=True)
        
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
                "message": f"Một phiếu QC mới đã được tạo cho Công đoạn: {job_card.operation} của Lệnh sản xuất: {job_card.work_order}. Vui lòng kiểm tra.",
                "alert_icon": "fa fa-check-circle",
                "alert_type": "info",
                "link": f"/app/quality-inspection/{qc_doc.name}",
                "for_user": qc_users
            }
        )
        frappe.db.commit()
        return f"Successfully created Quality Inspection document for Job Card {job_card_name}."

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create_qc_and_notify")
        frappe.db.rollback()
        return f"An error occurred: {str(e)}"

def check_and_create_qc_for_job_cards():
    """
    Kiểm tra tất cả các Job Card đang hoạt động để xác định có cần tạo một phiếu QC mới không.
    """
    try:
        # Lấy tất cả các Job Card đang hoạt động (đã được gửi)
        active_job_cards = frappe.get_list(
            "Job Card",
            filters={"docstatus": 1},
            fields=["name", "creation", "operation"]
        )

        for job_card_data in active_job_cards:
            job_card_name = job_card_data.get("name")
            job_card_creation = frappe.utils.get_datetime(job_card_data.get("creation"))
            
            op_tracker_info = frappe.db.get_value(
                "Operation Tracker",
                filters={"operation": job_card_data.get("operation")},
                fieldname=["frequency", "thời_gian_chờ_lần_đầu_phút"],
                as_dict=True
            )
            
            if not op_tracker_info or not op_tracker_info.get("frequency"):
                continue
            
            frequence_minutes = op_tracker_info.get("frequency")
            wait_time_minutes = op_tracker_info.get("thời_gian_chờ_lần_đầu_phút") or 0

            # Kiểm tra xem có phiếu QC nào đã được tạo cho Job Card này chưa
            last_qc_doc = frappe.get_list(
                "Quality Inspection",
                filters={"reference_name": job_card_name},
                fields=["creation"],
                order_by="creation desc",
                limit=1
            )

            current_time = now_datetime()
            
            # ĐIỀU KIỆN 1: TẠO PHIẾU QC LẦN ĐẦU TIÊN
            # Nếu chưa có phiếu QC nào được tạo cho Job Card này
            if not last_qc_doc:
                # Kiểm tra xem đã đủ thời gian cho lần tạo đầu tiên chưa
                first_possible_creation_time = job_card_creation + datetime.timedelta(minutes=wait_time_minutes)
                
                if current_time >= first_possible_creation_time:
                    frappe.call(
                        fn="tahp.doc_events.work_order.work_order_utils.create_qc_and_notify", 
                        job_card_name=job_card_name
                    )
                    
            # ĐIỀU KIỆN 2: TẠO CÁC PHIẾU QC TIẾP THEO
            # Nếu đã có ít nhất một phiếu QC
            else:
                last_qc_creation = frappe.utils.get_datetime(last_qc_doc[0].get("creation"))
                time_elapsed = current_time - last_qc_creation
                required_interval = datetime.timedelta(minutes=frequence_minutes)
                
                if time_elapsed >= required_interval:
                    frappe.call(
                        fn="tahp.doc_events.work_order.work_order_utils.create_qc_and_notify",
                        job_card_name=job_card_name
                    )
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in check_and_create_qc_for_job_cards")
        frappe.db.rollback()

def create_test_note():
    """
    Tạo một tài liệu Note mới để kiểm tra xem scheduler có hoạt động không.
    """
    try:
        note_doc = frappe.new_doc("Note")
        note_doc.title = "Test Scheduler: " + str(now_datetime())
        note_doc.content = "Tác vụ tự động đã chạy thành công."
        note_doc.insert(ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Lỗi khi tạo Ghi chú test")
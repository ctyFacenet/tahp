import frappe
from frappe.utils import nowdate, now_datetime
import datetime

@frappe.whitelist()
def create_qc_and_notify(job_card_name):
    """
    Tạo tài liệu Quality Inspection và gửi thông báo.
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
        
        subject = f"Phiếu QC mới ({qc_doc.name}) cho Lệnh SX: {job_card.work_order}"
        message = f"""
Chào bạn,

Một phiếu QC mới đã được tạo và đang chờ bạn kiểm tra.

**Thông tin chi tiết:**
- **Số Phiếu QC:** {qc_doc.name}
- **Lệnh Sản Xuất:** {job_card.work_order}
- **Công đoạn:** {job_card.operation}
- **Sản phẩm:** {work_order.production_item}

Vui lòng đến kiểm tra chất lượng tại xưởng ngay.
        """
        
        qc_users = frappe.db.get_list(
            "Has Role",
            filters={"role": "Quality Manager"},
            pluck="parent"
        )
        
        for user in qc_users:
            try:
                if frappe.db.get_value("User", user, "enabled"):
                    frappe.get_doc({
                        "doctype": "Notification Log",
                        "for_user": user,
                        "subject": subject,
                        "email_content": message,
                        "type": "Alert",
                        "document_type": "Quality Inspection",
                        "document_name": qc_doc.name
                    }).insert(ignore_permissions=True)
            except Exception as e:
                frappe.log_error(f"Failed to create notification for user {user}: {str(e)}", "Notification Log Error")

        frappe.db.commit()
        return f"Successfully created Quality Inspection document for Job Card {job_card_name}."

    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in create_qc_and_notify")
        frappe.db.rollback()
        return f"An error occurred: {str(e)}"

def check_and_create_qc_for_job_cards():
    """
    Kiểm tra tất cả các Job Card đang hoạt động và chưa hoàn thành để tạo phiếu QC mới theo tần suất.
    """
    try:
        # Lấy tất cả các Job Card đã được gửi (docstatus=1) và chưa hoàn thành.
        # Lưu ý: "Completed" là trạng thái cuối cùng của Job Card. Bạn có thể thay đổi tùy theo DocType của mình.
        active_job_cards = frappe.get_list(
            "Job Card",
            filters={"docstatus": 1, "status": ("!=", "Completed")},
            fields=["name", "creation", "operation"]
        )
        
        for job_card_data in active_job_cards:
            job_card_name = job_card_data.get("name")
            job_card_creation = frappe.utils.get_datetime(job_card_data.get("creation"))
            
            op_tracker_info = frappe.db.get_value(
                "Operation Tracker",
                filters={"operation": job_card_data.get("operation")},
                fieldname=["frequency", "first_time_waiting"],
                as_dict=True
            )
            
            if not op_tracker_info or not op_tracker_info.get("frequency"):
                continue

            frequence_minutes = op_tracker_info.get("frequency")
            wait_time_minutes = op_tracker_info.get("first_time_waiting") or 0
            
            # Lấy phiếu QC gần nhất cho Job Card này
            last_qc_doc = frappe.get_list(
                "Quality Inspection",
                filters={"reference_name": job_card_name},
                fields=["creation", "docstatus"],
                order_by="creation desc",
                limit=1
            )

            current_time = now_datetime()
            
            if not last_qc_doc:
                # Nếu chưa có phiếu QC nào, tạo phiếu đầu tiên sau thời gian chờ.
                first_possible_creation_time = job_card_creation + datetime.timedelta(minutes=wait_time_minutes)
                
                if current_time >= first_possible_creation_time:
                    frappe.call(
                        fn="tahp.doc_events.work_order.work_order_utils.create_qc_and_notify", 
                        job_card_name=job_card_name
                    )
            else:
                last_qc_creation = frappe.utils.get_datetime(last_qc_doc[0].get("creation"))
                time_elapsed = current_time - last_qc_creation
                required_interval = datetime.timedelta(minutes=frequence_minutes)
                
                # Nếu đã có phiếu QC, tạo phiếu mới khi đủ thời gian, bất kể trạng thái của phiếu cũ.
                if time_elapsed >= required_interval:
                    frappe.call(
                        fn="tahp.doc_events.work_order.work_order_utils.create_qc_and_notify",
                        job_card_name=job_card_name
                    )
        
        frappe.db.commit()
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Lỗi chung trong tác vụ định kỳ")

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
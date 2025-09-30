import frappe
import calendar

def after_insert(doc, method):
    generate_qc(doc)
    send_noti(doc)
    autofill_shift_handover(doc)

def generate_qc(doc):
    """
    Tự động tạo phiếu QC cho từng dòng hàng trong Stock Entry.

    - Mapping:
        * Material Receipt → Incoming
        * Material Issue   → Outgoing
        * Manufacture (thành phẩm) → In Process

    - Với mỗi item:
        * Lấy template QC theo item_code.
        * Nếu khớp loại chứng từ và điều kiện, sinh phiếu QC mới.
        * Gán phiếu QC vào row.quality_inspection.
    """
    map = {
        "Material Receipt": {
            "label": "Nhập kho",
            "inspection_type": "Incoming"
        },
        "Material Issue": {
            "label": "Xuất kho",
            "inspection_type": "Outgoing"
        },
        "Manufacture": {
            "label": "Nhập kho thành phẩm",
            "inspection_type": "In Process",
            "conditions": [
                lambda row: row.is_finished_item,
            ]
        },
    }
    if doc.stock_entry_type not in map: return

    for row in doc.items:
        templates = frappe.db.get_all("Item QC Template",
            filters={"parent": row.item_code},
            fields = ["qc_template", "stock_entry_type"]
        )

        if not templates: continue

        for template in templates:
            configuration = map[doc.stock_entry_type]
            if template.stock_entry_type == configuration.get("label"):
                conditions = configuration.get("condition", [])
                if not all(condition(row) for condition in conditions): continue
                print('hi3')

                qi = frappe.get_doc({
                    "doctype": "Quality Inspection",
                    "inspection_type": configuration.get("inspection_type"),
                    "reference_type": doc.doctype,
                    "reference_name": doc.name,
                    "item_code": row.item_code,
                    "sample_size": 1,
                    "quality_inspection_template": template.qc_template,
                    "inspected_by": frappe.session.user
                })
                qi.insert(ignore_permissions=True)
                row.quality_inspection = qi.name
        
        doc.save(ignore_permissions=True)

def send_noti(doc):
    title_map = {
        "Manufacture": "Nhập kho thành phẩm",
        "Material Receipt": "Nhập kho",
        "Material Issue": "Xuất kho",
        "Material Transfer": "Chuyển kho"
    }
    title = title_map.get(doc.stock_entry_type, doc.stock_entry_type)
    users = frappe.db.get_all(
        "User",
        filters={"role_profile_name": "Chủ kho", "enabled": 1},
        pluck="name"
    )
    for user in users:
        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": f"Chủ kho vui lòng xác nhận phiếu <b style='font-weight:bold'>{title} - {doc.name}</b>",
            "email_content": f"Chủ kho vui lòng xác nhận phiếu {title} - {doc.name}",
            "type": "Alert",
            "document_type": "Stock Entry",
            "document_name": doc.name
        }).insert(ignore_permissions=True)

def autofill_shift_handover(doc):
    if doc.stock_entry_type == 'Manufacture' and doc.work_order:
        shift_handovers = frappe.db.get_all(
            'Shift Handover',
            filters={'work_order': doc.work_order},
            fields=['name']
        )
        
        for handover in shift_handovers:
            handover_doc = frappe.get_doc('Shift Handover', handover.name)
            if not handover_doc.stock_entry:
                handover_doc.stock_entry = doc.name
                handover_doc.save(ignore_permissions=True)
                wo_doc = frappe.get_doc("Work Order", doc.work_order)
                shift_leader = wo_doc.custom_shift_leader
                if not shift_leader: continue
                user = frappe.db.get_value("Employee", shift_leader, "user_id")
                if not user: continue
                frappe.get_doc({
                    "doctype": "Notification Log",
                    "for_user": user,
                    "subject": f"Vui lòng kiểm tra nội dung BBGC ca {handover.name} và gửi bàn giao",
                    "email_content": "Vui lòng kiểm tra nội dung BBGC và gửi bàn giao",
                    "type": "Alert",
                    "document_type": "Shift Handover",
                    "document_name": handover.name
                }).insert(ignore_permissions=True)
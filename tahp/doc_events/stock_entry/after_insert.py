import frappe
import calendar

def after_insert(doc, method):
    if not doc.custom_code: set_code(doc)
    generate_qc(doc)
    send_noti(doc)

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

def set_code(doc):
    """
    Tạo mã chứng từ (custom_code) cho Stock Entry.

    - Mỗi loại chứng từ có tiền tố riêng:
        * Material Receipt → NK
        * Material Issue   → XK
        * Manufacture      → SX
        * Loại khác        → UNK
    - Định dạng: <CODE>.<NĂM>.<THÁNG>.<SỐ THỨ TỰ>, ví dụ: NK.2025.08.0001
    - Số thứ tự tính theo số chứng từ đã duyệt cùng loại và cùng tháng, cùng năm.

    Tham số:
    - doc (Document): Stock Entry hiện tại.
    """
    map = {
        "Material Receipt": "NK",
        "Material Issue": "XK",
        "Manufacture": "SX"
    }

    code = map[doc.stock_entry_type] if doc.stock_entry_type in map else 'UNK'
    today = frappe.utils.get_datetime()
    year = today.year
    month = f"{today.month:02d}"
    last_day = calendar.monthrange(year, today.month)[1]
    start_date = f"{year}-{month}-01"
    end_date = f"{year}-{month}-{last_day}"

    entries = frappe.db.get_all("Stock Entry", filters={
        "docstatus": ["==", 1],
        "stock_entry_type": doc.stock_entry_type,
        "posting_date": ["between", [start_date, end_date]]
    })

    index = len(entries) + 1
    custom_code = f"{code}.{year}.{month}.{index:04d}"
    doc.custom_code = custom_code
    doc.save()

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
            "subject": f"Chủ kho vui lòng xác nhận phiếu {title} - {doc.name}",
            "email_content": f"Chủ kho vui lòng xác nhận phiếu {title} - {doc.name}",
            "type": "Alert",
            "document_type": "Stock Entry",
            "document_name": doc.name
        }).insert(ignore_permissions=True)
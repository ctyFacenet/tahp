import frappe

def before_save(doc, method):
    """
    Kiểm tra các bảng con của công đoạn trước khi lưu:
    - Nếu bảng trống, hiển thị cảnh báo người dùng.
    - Nếu `total_operation_time` chưa có, gán mặc định = 1.
    """
    empty_tables = []
    tables = ["custom_configs", "custom_subtasks", "custom_team"]

    for t in tables:
        table_field = doc.meta.get_field(t)
        label = table_field.label if table_field else t
        if not getattr(doc, t):
            empty_tables.append(label)

    if empty_tables:
        html_list = "".join(f"<div class='mt-2'> - {label}</div>" for label in empty_tables) + "</ul>"
        frappe.msgprint(
            f"<div>Chưa điền các bảng sau:{html_list}</div>",
            indicator="orange",
            title="Đã lưu, nhưng công đoạn nên bổ sung các thông tin"
        )

    if not doc.total_operation_time:
        doc.total_operation_time = 1
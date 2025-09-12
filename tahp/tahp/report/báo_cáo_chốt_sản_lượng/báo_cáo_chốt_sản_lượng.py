import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"fieldname": "item_template", "label": _("Sản phẩm"), "fieldtype": "Link", "options": "Item", "width": 200},
        {"fieldname": "qty_a", "label": _("Loại A"), "fieldtype": "Float", "width": 150},
        {"fieldname": "qty_b", "label": _("Loại B"), "fieldtype": "Float", "width": 150},
        {"fieldname": "qty_c", "label": _("Loại C"), "fieldtype": "Float", "width": 150},
    ]

def get_data(filters):
    # Sử dụng SQL trực tiếp để lấy dữ liệu từ Work Order và Item
    # Cách này sẽ tránh được lỗi cú pháp của frappe.get_all
    query = """
        SELECT
            T1.production_item,
            T1.qty,
            T2.variant_of
        FROM
            `tabWork Order` T1
        JOIN
            `tabItem` T2 ON T1.production_item = T2.name
        WHERE
            T1.docstatus = 1
            AND T2.variant_of IS NOT NULL
        ORDER BY
            T2.variant_of
    """
    
    # Lấy dữ liệu dưới dạng dictionary
    work_order_data = frappe.db.sql(query, as_dict=True)

    # Dictionary để tổng hợp dữ liệu theo sản phẩm gốc
    summary_data = {}
    
    for row in work_order_data:
        # Lấy tên sản phẩm gốc (item template) từ cột variant_of
        item_template = row.variant_of
        production_item = row.production_item
        qty = row.qty

        # Trích xuất loại (ví dụ: 'A', 'B', 'C') từ tên biến thể.
        try:
            variant_type = production_item.rsplit('-', 1)[-1].upper()
        except IndexError:
            # Bỏ qua nếu tên không đúng định dạng
            continue

        if item_template not in summary_data:
            summary_data[item_template] = {
                'item_template': item_template,
                'qty_a': 0,
                'qty_b': 0,
                'qty_c': 0
            }

        # Cộng dồn số lượng vào cột tương ứng
        if variant_type == 'A':
            summary_data[item_template]['qty_a'] += qty
        elif variant_type == 'B':
            summary_data[item_template]['qty_b'] += qty
        elif variant_type == 'C':
            summary_data[item_template]['qty_c'] += qty

    # Chuyển đổi dictionary thành list để trả về cho báo cáo
    return list(summary_data.values())
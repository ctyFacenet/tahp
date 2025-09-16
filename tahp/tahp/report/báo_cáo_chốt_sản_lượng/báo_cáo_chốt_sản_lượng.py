import frappe
from frappe import _
from frappe.utils import getdate
from datetime import timedelta

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"fieldname": "item_template", "label": _("Sản phẩm"), "fieldtype": "Link", "options": "Item", "width": 150},
        {"fieldname": "attribute_s", "label": _("Độ khô"), "fieldtype": "Data", "width": 100},
        {"fieldname": "qty_a", "label": _("Loại A"), "fieldtype": "Float", "width": 100},
        {"fieldname": "qty_b", "label": _("Loại B"), "fieldtype": "Float", "width": 100},
        {"fieldname": "qty_c", "label": _("Loại C"), "fieldtype": "Float", "width": 100},
        {"fieldname": "qty_nn", "label": _("Loại NN"), "fieldtype": "Float", "width": 100},
        {"fieldname": "total_qty", "label": _("Tổng số lượng"), "fieldtype": "Float", "width": 200}
    ]

def get_data(filters):
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
    """

    query_params = {}

    if filters.get("year") and filters.get("month"):
        year = int(filters.get("year"))
        month = int(filters.get("month"))
        
        # Tạo ngày đầu tiên của tháng và năm được chọn
        start_date = getdate(f"{year}-{month}-01")
        # Tính toán ngày cuối cùng của tháng
        end_date = (start_date.replace(month=start_date.month % 12 + 1, day=1) - timedelta(days=1))
        
        query += " AND T1.actual_end_date BETWEEN %(start_date)s AND %(end_date)s"
        query_params["start_date"] = start_date
        query_params["end_date"] = end_date
    
    if filters.get("ca"):
        query += " AND T1.custom_shift = %(ca)s"
        query_params["ca"] = filters.get("ca")

    query += " ORDER BY T2.variant_of"

    work_order_data = frappe.db.sql(query, query_params, as_dict=True)

    summary_data = {}

    for row in work_order_data:
        item_template = row.variant_of
        production_item = row.production_item
        qty = row.qty

        item_doc = frappe.get_doc("Item", production_item)
        attribute_s = "Không xác định"
        
        attributes_list = item_doc.get("attributes", [])
        
        for attr in attributes_list:
            if attr.attribute == "Sấy":
                attribute_s = attr.attribute_value
                break

        try:
            variant_type = production_item.rsplit('-', 1)[-1].upper()
        except IndexError:
            continue

        key = (item_template, attribute_s)

        if key not in summary_data:
            summary_data[key] = {
                'item_template': item_template,
                'attribute_s': attribute_s,
                'qty_a': 0,
                'qty_b': 0,
                'qty_c': 0,
                'qty_nn': 0,
                'total_qty': 0
            }

        if variant_type == 'A':
            summary_data[key]['qty_a'] += qty
        elif variant_type == 'B':
            summary_data[key]['qty_b'] += qty
        elif variant_type == 'C':
            summary_data[key]['qty_c'] += qty
        elif variant_type == 'NN':
            summary_data[key]['qty_nn'] += qty
            
        summary_data[key]['total_qty'] += qty

    return list(summary_data.values())
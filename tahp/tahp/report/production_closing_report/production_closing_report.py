# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    return [
        {"fieldname": "san_pham", "label": _("<b>Sản phẩm</b>"), "fieldtype": "Data", "width": 250},
        {"fieldname": "so_luong_thuc_te", "label": _("<b>Số lượng thực tế</b>"), "fieldtype": "Data", "width": 200},
        {"fieldname": "so_luong_ke_hoach", "label": _("<b>Số lượng kế hoạch</b>"), "fieldtype": "Data", "width": 200},
        {"fieldname": "don_vi", "label": _("<b>Đơn vị</b>"), "fieldtype": "Data", "width": 100, "align": "center"}
    ]

def get_data(filters):
    conditions = ["T1.docstatus = 1"]
    query_params = {}

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    
    # Only apply the date filter when both fields have values
    if from_date and to_date:
        conditions.append("T1.actual_end_date BETWEEN %(from_date)s AND %(to_date)s")
        query_params["from_date"] = from_date
        query_params["to_date"] = to_date
    
    # Apply the shift filter
    if filters.get("ca"):
        conditions.append("T1.custom_shift = %(ca)s")
        query_params["ca"] = filters.get("ca")

    query = """
        SELECT
            T1.production_item,
            T1.qty,
            T1.produced_qty,
            T1.stock_uom,
            T2.variant_of,
            T3.custom_category AS he
        FROM
            `tabWork Order` T1
        JOIN
            `tabItem` T2 ON T1.production_item = T2.name
        LEFT JOIN
            `tabBOM` T3 ON T1.bom_no = T3.name
    """
    
    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY T3.custom_category, T2.variant_of"
    
    work_order_data = frappe.db.sql(query, query_params, as_dict=True)
    print(len(work_order_data))

    summary_data = {}

    for row in work_order_data:
        production_item = row.production_item
        qty = row.qty
        produced_qty = row.produced_qty
        he = row.he
        unit = row.stock_uom
        
        if not row.variant_of:
            item_template = production_item
            variant_type = 'SINGLE'
        else:
            item_template = row.variant_of
            try:
                variant_type = production_item.rsplit('-', 1)[-1].upper()
            except IndexError:
                variant_type = 'UNKNOWN'

        key = (item_template, he)

        if key not in summary_data:
            summary_data[key] = {
                'item_template': item_template,
                'he': he,
                'produced_qty_a': 0, 'produced_qty_b': 0, 'produced_qty_c': 0, 'produced_qty_nn': 0, 'produced_qty_single': 0,
                'qty_a': 0, 'qty_b': 0, 'qty_c': 0, 'qty_nn': 0, 'qty_single': 0,
                'total_qty': 0, 'total_produced_qty': 0,
                'unit': unit
            }
        
        if variant_type == 'A':
            summary_data[key]['qty_a'] += qty
            summary_data[key]['produced_qty_a'] += produced_qty
        elif variant_type == 'B':
            summary_data[key]['qty_b'] += qty
            summary_data[key]['produced_qty_b'] += produced_qty
        elif variant_type == 'C':
            summary_data[key]['qty_c'] += qty
            summary_data[key]['produced_qty_c'] += produced_qty
        elif variant_type == 'NN':
            summary_data[key]['qty_nn'] += qty
            summary_data[key]['produced_qty_nn'] += produced_qty
        elif variant_type == 'SINGLE':
            summary_data[key]['qty_single'] += qty
            summary_data[key]['produced_qty_single'] += produced_qty
            
        summary_data[key]['total_qty'] += qty
        summary_data[key]['total_produced_qty'] += produced_qty

    report_data = []
    
    overall_total_produced = 0
    overall_total_qty = 0
    overall_unit = ""

    grouped_by_he = {}
    for row in summary_data.values():
        if row['he'] not in grouped_by_he:
            grouped_by_he[row['he']] = []
        grouped_by_he[row['he']].append(row)

    for he, items in grouped_by_he.items():
        he_total_produced = sum(i['total_produced_qty'] for i in items)
        he_total_qty = sum(i['total_qty'] for i in items)
        
        group_unit = items[0]['unit'] if items else ""

        # Kiểm tra nếu chỉ có một loại sản phẩm trong hệ
        if len(items) == 1 and items[0].get('produced_qty_single', 0) > 0:
            item = items[0]
            report_data.append({
                "san_pham": f"<b>{item['item_template']}</b>",
                "so_luong_thuc_te": f"<b>{item['produced_qty_single']}</b>",
                "so_luong_ke_hoach": f"<b>{item['qty_single']}</b>",
                "don_vi": f"<b>{item['unit']}</b>",
                "is_group": 0
            })
            overall_total_produced += item['produced_qty_single']
            overall_total_qty += item['qty_single']
            overall_unit = overall_unit or item['unit']
        else:
            # Logic hiện tại cho các sản phẩm có nhiều loại
            report_data.append({
                "san_pham": f"<b>Hệ {he}</b>",
                "so_luong_thuc_te": f"<b>{he_total_produced}</b>",
                "so_luong_ke_hoach": f"<b>{he_total_qty}</b>",
                "don_vi": f"<b>{group_unit}</b>",
                "is_group": 1
            })
            overall_total_produced += he_total_produced
            overall_total_qty += he_total_qty
            overall_unit = overall_unit or group_unit

            for item in items:
                produced_a = item.get('produced_qty_a', 0)
                qty_a = item.get('qty_a', 0)
                produced_b = item.get('produced_qty_b', 0)
                qty_b = item.get('qty_b', 0)
                produced_c = item.get('produced_qty_c', 0)
                qty_c = item.get('qty_c', 0)
                produced_nn = item.get('produced_qty_nn', 0)
                qty_nn = item.get('qty_nn', 0)
                unit = item.get('unit', "")

                if produced_a > 0 or qty_a > 0:
                    report_data.append({
                        "san_pham": "Loại A",
                        "so_luong_thuc_te": produced_a,
                        "so_luong_ke_hoach": qty_a,
                        "don_vi": unit,
                        "indent": 1
                    })
                if produced_b > 0 or qty_b > 0:
                    report_data.append({
                        "san_pham": "Loại B",
                        "so_luong_thuc_te": produced_b,
                        "so_luong_ke_hoach": qty_b,
                        "don_vi": unit,
                        "indent": 1
                    })
                if produced_c > 0 or qty_c > 0:
                    report_data.append({
                        "san_pham": "Loại C",
                        "so_luong_thuc_te": produced_c,
                        "so_luong_ke_hoach": qty_c,
                        "don_vi": unit,
                        "indent": 1
                    })
                if produced_nn > 0 or qty_nn > 0:
                    report_data.append({
                        "san_pham": "Loại NN",
                        "so_luong_thuc_te": produced_nn,
                        "so_luong_ke_hoach": qty_nn,
                        "don_vi": unit,
                        "indent": 1
                    })
    
    report_data.append({
        "san_pham": "<b>Tổng cộng</b>",
        "so_luong_thuc_te": f"<b>{overall_total_produced}</b>",
        "so_luong_ke_hoach": f"<b>{overall_total_qty}</b>",
        "don_vi": f"<b>{overall_unit}</b>",
    })
    
    return report_data
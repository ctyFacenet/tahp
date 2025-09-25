# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def execute(filters=None):
    """
    Main entry point for the report.
    It fetches columns and data and returns them to the report view.
    
    :param filters: A dictionary of filters set by the user.
    :return: A tuple containing the list of columns and the list of data rows.
    """
    columns = get_columns()
    data = get_data(filters)
    return columns, data

def get_columns():
    """
    Defines the columns for the report view.
    
    :return: A list of dictionaries, where each dictionary represents a column.
    """
    return [
        {"fieldname": "san_pham", "label": _("<b>Sản phẩm</b>"), "fieldtype": "Data", "width": 250},
        {"fieldname": "so_luong_thuc_te", "label": _("<b>Số lượng thực tế</b>"), "fieldtype": "Data", "width": 200},
        {"fieldname": "so_luong_ke_hoach", "label": _("<b>Số lượng kế hoạch</b>"), "fieldtype": "Data", "width": 200},
        {"fieldname": "don_vi", "label": _("<b>Đơn vị</b>"), "fieldtype": "Data", "width": 100, "align": "center"}
    ]

def _aggregate_work_order_data(work_order_data):
    """
    Aggregates raw work order data into two distinct groups.

    1.  `summary_with_he`: For items that belong to a "Hệ" (category).
        These are grouped by their item template to show a hierarchical view.
    2.  `summary_without_he`: For items that DO NOT belong to a "Hệ".
        These are grouped by their final production_item name for a flat list display.

    :param work_order_data: List of dicts from the SQL query.
    :return: A tuple containing two dictionaries: (summary_with_he, summary_without_he).
    """
    summary_with_he = {}
    summary_without_he = {}

    for row in work_order_data:
        if row.get('he'):
            # --- Logic for items WITH a category ("Hệ") ---
            item_template = row.variant_of or row.production_item
            key = (item_template, row.he)
            variant_type = row.variant_type if row.variant_of else 'SINGLE'

            if key not in summary_with_he:
                summary_with_he[key] = {
                    'item_template': item_template,
                    'he': row.he,
                    'unit': row.stock_uom,
                    'total_qty': 0,
                    'total_produced_qty': 0,
                    'variants': {}
                }

            variants = summary_with_he[key]['variants']
            if variant_type not in variants:
                variants[variant_type] = {'qty': 0, 'produced_qty': 0}

            variants[variant_type]['qty'] += row.qty
            variants[variant_type]['produced_qty'] += row.produced_qty
            summary_with_he[key]['total_qty'] += row.qty
            summary_with_he[key]['total_produced_qty'] += row.produced_qty
        else:
            # --- logic for items WITHOUT a category ("Hệ") ---
            item_name = row.production_item
            if item_name not in summary_without_he:
                summary_without_he[item_name] = {
                    'san_pham': item_name,
                    'unit': row.stock_uom,
                    'qty': 0,
                    'produced_qty': 0
                }
            summary_without_he[item_name]['qty'] += row.qty
            summary_without_he[item_name]['produced_qty'] += row.produced_qty

    return summary_with_he, summary_without_he


def get_data(filters):
    """
    Fetches, processes, and formats Work Order data for the final report.
    This function acts as a controller, delegating complex logic to helper functions.
    """
    # Build query based on user filters
    conditions = ["T1.docstatus = 1"]
    query_params = {}

    from_date = filters.get("from_date")
    to_date = filters.get("to_date")

    if from_date and to_date:
        conditions.append("T1.actual_end_date BETWEEN %(from_date)s AND %(to_date)s")
        query_params.update({"from_date": from_date, "to_date": to_date})
    elif from_date:
        conditions.append("T1.actual_end_date >= %(from_date)s")
        query_params["from_date"] = from_date
    elif to_date:
        conditions.append("T1.actual_end_date <= %(to_date)s")
        query_params["to_date"] = to_date

    if filters.get("ca"):
        conditions.append("T1.custom_shift = %(ca)s")
        query_params["ca"] = filters.get("ca")

    # Fetch raw data from the database
    query = """
        SELECT
            T1.production_item, T1.qty, T1.produced_qty, T1.stock_uom,
            T2.variant_of, T3.custom_category AS he, IVA.attribute_value AS variant_type
        FROM `tabWork Order` T1
        JOIN `tabItem` T2 ON T1.production_item = T2.name
        LEFT JOIN `tabBOM` T3 ON T1.bom_no = T3.name
        LEFT JOIN `tabItem Variant Attribute` IVA ON T1.production_item = IVA.parent AND IVA.attribute = 'Phân loại'
        WHERE {conditions}
        ORDER BY T3.custom_category, T2.variant_of
    """.format(conditions=" AND ".join(conditions))

    work_order_data = frappe.db.sql(query, query_params, as_dict=True)

    # Aggregate raw data into structured dictionaries
    summary_with_he, summary_without_he = _aggregate_work_order_data(work_order_data)

    # Format the aggregated data for the report view
    report_data = []
    overall_total_produced = 0
    overall_total_qty = 0
    overall_unit = ""

    # Process items that belong to a "Hệ"
    grouped_by_he = {}
    for item_data in summary_with_he.values():
        he = item_data['he']
        if he not in grouped_by_he:
            grouped_by_he[he] = []
        grouped_by_he[he].append(item_data)

    for he, items in grouped_by_he.items():
        he_total_produced = sum(i['total_produced_qty'] for i in items)
        he_total_qty = sum(i['total_qty'] for i in items)
        group_unit = items[0]['unit'] if items else ""

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
            if 'SINGLE' in item['variants']:
                single_data = item['variants']['SINGLE']
                if single_data['produced_qty'] > 0 or single_data['qty'] > 0:
                    report_data.append({
                        "san_pham": f"<b>{item['item_template']}</b>",
                        "so_luong_thuc_te": f"<b>{single_data['produced_qty']}</b>",
                        "so_luong_ke_hoach": f"<b>{single_data['qty']}</b>",
                        "don_vi": f"<b>{item['unit']}</b>", "is_group": 0
                    })
            else:
                sorted_variants = sorted(item['variants'].items())
                for variant_name, variant_data in sorted_variants:
                    if variant_data['produced_qty'] > 0 or variant_data['qty'] > 0:
                        report_data.append({
                            "san_pham": f"Loại {variant_name}",
                            "so_luong_thuc_te": variant_data['produced_qty'],
                            "so_luong_ke_hoach": variant_data['qty'],
                            "don_vi": item['unit'], "indent": 1
                        })

    # Process items without a "Hệ" as a flat list at the end
    for item_data in summary_without_he.values():
        overall_total_produced += item_data['produced_qty']
        overall_total_qty += item_data['qty']
        overall_unit = overall_unit or item_data['unit']

        report_data.append({
            "san_pham": f"<b>{item_data['san_pham']}</b>",
            "so_luong_thuc_te": f"<b>{item_data['produced_qty']}</b>",
            "so_luong_ke_hoach": f"<b>{item_data['qty']}</b>",
            "don_vi": f"<b>{item_data['unit']}</b>",
            "is_group": 0
        })

    # Add the final total row
    report_data.append({
        "san_pham": "<b>Tổng cộng</b>",
        "so_luong_thuc_te": f"<b>{overall_total_produced}</b>",
        "so_luong_ke_hoach": f"<b>{overall_total_qty}</b>",
        "don_vi": f"<b>{overall_unit}</b>",
    })

    return report_data
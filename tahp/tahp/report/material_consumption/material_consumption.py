# Copyright (c) 2024, your_company_name and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from datetime import datetime, timedelta

def execute(filters=None):
    if not filters:
        filters = {}

    # Xử lý filter tuần
    filters = process_week_filter(filters)
    
    columns = get_columns(filters)
    data = get_data(filters) 
    
    # total_consumed = sum(row.get('total_actual_qty', 0) for row in data)
    # report_summary = [
    #     {
    #         "value": total_consumed,
    #         "label": _("Tổng tiêu thụ thực tế"),
    #         "datatype": "Float",
    #         "indicator": "Green" if total_consumed > 0 else "Red"
    #     }
    # ]
    
    return columns, data, None, None, None

def process_week_filter(filters):
    """
    Xử lý filter tuần: chuyển đổi ngày được chọn thành khoảng từ thứ 2 đến chủ nhật
    """
    if filters.get("week"):
        try:
            # Parse ngày được chọn
            if isinstance(filters["week"], str):
                selected_date = datetime.strptime(filters["week"], "%Y-%m-%d")
            else:
                selected_date = filters["week"]
            
            # Tính toán thứ trong tuần (0=Thứ 2, 6=Chủ nhật)
            weekday = selected_date.weekday()
            
            # Tính ngày thứ 2 của tuần
            monday = selected_date - timedelta(days=weekday)
            
            # Tính ngày chủ nhật của tuần
            sunday = monday + timedelta(days=6)
            
            # Cập nhật filters với khoảng thời gian từ thứ 2 đến chủ nhật
            filters["from_date"] = monday.strftime("%Y-%m-%d")
            filters["to_date"] = sunday.strftime("%Y-%m-%d")
            
            # Log để debug (có thể bỏ sau khi test xong)
            frappe.log_error(
                f"Week filter: Selected {filters['week']} -> Monday {filters['from_date']} to Sunday {filters['to_date']}", 
                "Week Filter Debug"
            )
            
        except Exception as e:
            frappe.log_error(f"Error processing week filter: {str(e)}", "Week Filter Error")
    
    return filters

def get_data(filters):
    """
    Hàm chính để lấy và xử lý dữ liệu báo cáo
    """
    work_orders = get_work_orders(filters)
    if not work_orders:
        return []

    wo_list = [d.name for d in work_orders]
    prod_item_list = sorted(list(set([d.production_item for d in work_orders])))
    material_map = {}
    wo_to_prod_item = {wo.name: wo.production_item for wo in work_orders}

    # BƯỚC 1: LẤY DỮ LIỆU ĐỊNH MỨC (PLANNED) - Giữ nguyên
    bom_items = frappe.db.sql("""
        SELECT parent, item_code, required_qty, stock_uom
        FROM `tabWork Order Item` WHERE parent IN %(work_orders)s
    """, {"work_orders": wo_list}, as_dict=1)

    for item in bom_items:
        material = item.item_code
        prod_item = wo_to_prod_item.get(item.parent)
        if material not in material_map:
            material_map[material] = {
                "uom": item.stock_uom, 
                "total_actual_qty": 0,
                "total_planned_qty": 0
            }
        planned_key = frappe.scrub(prod_item) + "_planned"
        material_map[material][planned_key] = material_map[material].get(planned_key, 0) + item.required_qty
        material_map[material]['total_planned_qty'] += item.required_qty

    # BƯỚC 2: LẤY DỮ LIỆU THỰC TẾ (ACTUAL) - Giữ nguyên
    actual_items = frappe.db.sql("""
        SELECT se_detail.item_code, se_detail.qty, se.work_order
        FROM `tabStock Entry Detail` se_detail
        JOIN `tabStock Entry` se ON se.name = se_detail.parent
        WHERE se.work_order IN %(work_orders)s AND se.docstatus = 1 
        AND se.purpose IN ('Manufacture', 'Material Consumption for Manufacture')
    """, {"work_orders": wo_list}, as_dict=1)
    
    for item in actual_items:
        material = item.item_code
        prod_item = wo_to_prod_item.get(item.work_order)
        if material in material_map:
            material_map[material]["total_actual_qty"] += item.qty
            actual_key = frappe.scrub(prod_item) + "_actual"
            material_map[material][actual_key] = material_map[material].get(actual_key, 0) + item.qty

    # BƯỚC 3: CHUẨN BỊ DỮ LIỆU ĐẦU RA
    material_codes = list(material_map.keys())
    if not material_codes:
        return []
    item_names_data = frappe.get_all("Item", filters={"name": ("in", material_codes)}, fields=["name", "item_name"])
    item_name_map = {d.name: d.item_name for d in item_names_data}

    dataset = []
    for index, material_code in enumerate(sorted(material_map.keys())):
        row_data = material_map[material_code]
        material_name = item_name_map.get(material_code, material_code)
        
        # <<< LOGIC TÍNH TOÁN MỚI CHO BIỂU ĐỒ XẾP CHỒNG >>>
        total_actual = row_data.get("total_actual_qty", 0)
        total_planned = row_data.get("total_planned_qty", 0)
        
        # Tính phần vượt định mức (để tô màu đỏ)
        over_limit = max(0, total_actual - total_planned)
        
        # Phần còn lại là phần nằm trong định mức
        within_limit = total_actual - over_limit
        # <<< KẾT THÚC LOGIC TÍNH TOÁN MỚI >>>

        row = {
            "serial_no": index + 1,
            "material": f'<a href="/app/item/{material_code}">{material_name}</a>',
            "material_name": material_name, 
            "uom": row_data.get("uom"),
            "total_actual_qty": total_actual,
            "total_planned_qty": total_planned,
            
            # <<< THÊM 2 TRƯỜNG DỮ LIỆU MỚI ĐỂ GỬI CHO JAVASCRIPT >>>
            "within_limit_qty": within_limit,
            "over_limit_qty": over_limit
        }
        
        for prod_item in prod_item_list:
            scrubbed_name = frappe.scrub(prod_item)
            row[scrubbed_name + "_actual"] = row_data.get(scrubbed_name + "_actual", 0)
            row[scrubbed_name + "_planned"] = row_data.get(scrubbed_name + "_planned", 0)
            
        dataset.append(row)

    return dataset


def get_columns(filters):
    """
    Hàm định nghĩa các cột cho báo cáo, bao gồm các cột động với tiêu đề 2 dòng
    """
    columns = [
        {"label": _("STT"), "fieldname": "serial_no", "fieldtype": "Int", "width": 50},
        {"label": _("Nguyên liệu"), "fieldname": "material", "fieldtype": "HTML", "width": 250},
        {"label": _("Đơn vị"), "fieldname": "uom", "fieldtype": "Link", "options": "UOM", "width":100},
        {"label": _("Tổng Thực tế"), "fieldname": "total_actual_qty", "fieldtype": "Float", "width": 150},
        {"label": _("Tổng Định mức"), "fieldname": "total_planned_qty", "fieldtype": "Float", "width": 150},
    ]

    # Phần còn lại của hàm giữ nguyên...
    work_orders = get_work_orders(filters)
    if work_orders:
        production_items_map = {}
        for wo in work_orders:
            if wo.production_item not in production_items_map:
                production_items_map[wo.production_item] = wo.item_name
        
        sorted_prod_items = sorted(production_items_map.keys())

        for item_code in sorted_prod_items:
            item_name = production_items_map[item_code]
            scrubbed_name = frappe.scrub(item_code)
            
            columns.append({
                "label": f"{item_name} <br><b>{_('Thực tế')}</b>", 
                "fieldname": scrubbed_name + "_actual",
                "fieldtype": "Float",
                "width": 250
            })
            
            columns.append({
                "label": f"{item_name} <br><b>{_('Định mức')}</b>",
                "fieldname": scrubbed_name + "_planned",
                "fieldtype": "Float",
                "width": 250
            })

    return columns

def get_work_orders(filters):
    """
    Lấy danh sách Work Order dựa trên bộ lọc (đã sửa lại logic JOIN)
    """
    conditions = ""
    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND wo.creation BETWEEN %(from_date)s AND %(to_date)s"
    if filters.get("company"):
        conditions += " AND wo.company = %(company)s"

    # <<< LOGIC LỌC ĐƯỢC CẬP NHẬT Ở ĐÂY >>>
    if filters.get("manufacturing_category"):
        # Trường hợp 1: Người dùng có chọn một "Hệ" cụ thể trong bộ lọc
        # -> Lọc chính xác theo "Hệ" đó
        conditions += " AND bom.custom_category = %(manufacturing_category)s"
    else:
        # Trường hợp 2: Người dùng không chọn "Hệ" nào cả
        # -> Chỉ lấy những bản ghi có khai báo "Hệ" (không rỗng và không null)
        conditions += " AND bom.custom_category IS NOT NULL AND bom.custom_category != ''"
    # <<< KẾT THÚC PHẦN CẬP NHẬT >>>

    conditions += " AND wo.status IN ('Completed', 'In Process')"

    work_orders = frappe.db.sql("""
        SELECT
            wo.name,
            wo.production_item,
            item.item_name
        FROM
            `tabWork Order` wo
        JOIN
            `tabItem` item ON wo.production_item = item.name
        JOIN
            `tabBOM` bom ON wo.bom_no = bom.name 
        WHERE
            wo.docstatus = 1 {conditions}
    """.format(conditions=conditions), filters, as_dict=1)

    return work_orders
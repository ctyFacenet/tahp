# Copyright (c) 2024, your_company_name and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from datetime import datetime, timedelta
from frappe.utils import getdate, nowdate

def execute(filters=None):
    if not filters:
        filters = {}
    
    # Handle month/year filter
    filters = process_month_year_filter(filters)
    
    columns = get_columns(filters)
    data = get_data(filters) 
    
    return columns, data, None, None, None

def process_month_year_filter(filters):
    """
    Handle month/year filter: convert to date range from first to last day of month
    """
    if filters.get("month") and filters.get("year"):
        try:
            month_str = filters["month"]
            if month_str.startswith("Tháng "):
                month = int(month_str.replace("Tháng ", ""))
            else:
                month = int(month_str)
            year = int(filters["year"])
            
            from_date = datetime(year, month, 1)
            
            if month == 12:
                to_date = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                to_date = datetime(year, month + 1, 1) - timedelta(days=1)
            
            filters["from_date"] = from_date.strftime("%Y-%m-%d")
            filters["to_date"] = to_date.strftime("%Y-%m-%d")
            filters["is_month_filter"] = True
            
        except Exception as e:
            frappe.log_error(f"Month filter error: {str(e)}", "Month Filter Error")
    
    return filters

def get_data(filters):
    """
    Get and process report data
    """
    work_orders = get_work_orders(filters)
    if not work_orders:
        return []

    wo_list = [d.name for d in work_orders]
    prod_item_list = sorted(list(set([d.production_item for d in work_orders])))
    
    is_month_filter = filters.get("is_month_filter", False)
    
    if is_month_filter:
        return get_monthly_data(work_orders, wo_list, prod_item_list)
    else:
        return get_detailed_data(work_orders, wo_list, prod_item_list, filters)

def get_monthly_data(work_orders, wo_list, prod_item_list):
    """
    Return aggregated monthly data
    """
    material_map = {}
    wo_to_prod_item = {wo.name: wo.production_item for wo in work_orders}

    # Calculate total production quantities per finished good
    prod_qty_map = {}
    for wo in work_orders:
        prod_item = wo.production_item
        if prod_item not in prod_qty_map:
            prod_qty_map[prod_item] = {"produced": 0, "planned": 0}
        prod_qty_map[prod_item]["produced"] += wo.produced_qty
        prod_qty_map[prod_item]["planned"] += wo.qty

    # Get planned data
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

    # Get actual data from Work Order Item (consumed_qty)
    actual_items = frappe.db.sql("""
        SELECT item_code, consumed_qty, parent as work_order
        FROM `tabWork Order Item`
        WHERE parent IN %(work_orders)s
    """, {"work_orders": wo_list}, as_dict=1)
    
    for item in actual_items:
        material = item.item_code
        prod_item = wo_to_prod_item.get(item.work_order)
        if material in material_map:
            consumed_qty = item.consumed_qty or 0
            material_map[material]["total_actual_qty"] += consumed_qty
            actual_key = frappe.scrub(prod_item) + "_actual"
            material_map[material][actual_key] = material_map[material].get(actual_key, 0) + consumed_qty

    # Prepare output data
    material_codes = list(material_map.keys())
    if not material_codes:
        return []
    item_names_data = frappe.get_all("Item", filters={"name": ("in", material_codes)}, fields=["name", "item_name"])
    item_name_map = {d.name: d.item_name for d in item_names_data}

    dataset = []
    for index, material_code in enumerate(sorted(material_map.keys())):
        row_data = material_map[material_code]
        material_name = item_name_map.get(material_code, material_code)
        
        row = {
            "serial_no": index + 1,
            "material": f'<a href="/app/item/{material_code}">{material_name}</a>',
            "material_name": material_name, 
            "uom": row_data.get("uom"),
            
            # Data for charts and total columns
            "total_actual_qty": row_data.get("total_actual_qty", 0),
            "total_planned_qty": row_data.get("total_planned_qty", 0),
        }
        
        for prod_item in prod_item_list:
            scrubbed_name = frappe.scrub(prod_item)
            
            total_material_actual = row_data.get(scrubbed_name + "_actual", 0)
            total_material_planned = row_data.get(scrubbed_name + "_planned", 0)

            prod_produced = prod_qty_map.get(prod_item, {}).get("produced", 0)
            prod_planned = prod_qty_map.get(prod_item, {}).get("planned", 0)

            actual_per_ton = (total_material_actual / prod_produced) if prod_produced else 0
            planned_per_ton = (total_material_planned / prod_planned) if prod_planned else 0
            
            # Data for table display (per ton)
            row[scrubbed_name + "_actual_per_ton"] = actual_per_ton
            row[scrubbed_name + "_planned_per_ton"] = planned_per_ton
            
            # Data for chart (total quantity)
            row[scrubbed_name + "_actual"] = total_material_actual
            row[scrubbed_name + "_planned"] = total_material_planned

        dataset.append(row)

    return dataset

def get_detailed_data(work_orders, wo_list, prod_item_list, filters):
    """
    Return detailed data for completed work orders
    """
    wo_to_info = {wo.name: wo for wo in work_orders}

    # Get planned data and consumed_qty for work orders
    bom_items = frappe.db.sql("""
        SELECT parent, item_code, required_qty, stock_uom, consumed_qty
        FROM `tabWork Order Item` WHERE parent IN %(work_orders)s
    """, {"work_orders": wo_list}, as_dict=1)

    # Prepare detailed data by work order and date
    material_codes = list(set([item.item_code for item in bom_items]))
    if not material_codes:
        return []
    
    item_names_data = frappe.get_all("Item", filters={"name": ("in", material_codes)}, fields=["name", "item_name"])
    item_name_map = {d.name: d.item_name for d in item_names_data}

    dataset = []
    index = 0
    
    for item in bom_items:
        wo_name = item.parent
        wo_data = wo_to_info.get(wo_name, {})
        material_code = item.item_code
        material_name = item_name_map.get(material_code, material_code)
        
        completion_date = wo_data.get("actual_end_date") or wo_data.get("planned_end_date")
        if completion_date:
            completion_date = completion_date.date() if hasattr(completion_date, 'date') else completion_date
        
        # Get actual quantity from consumed_qty field
        actual_material_qty = item.consumed_qty or 0
        planned_material_qty = item.required_qty
        
        produced_qty = wo_data.get("produced_qty", 0)
        planned_prod_qty = wo_data.get("qty", 0)

        actual_per_ton = (actual_material_qty / produced_qty) if produced_qty else 0
        planned_per_ton = (planned_material_qty / planned_prod_qty) if planned_prod_qty else 0

        row = {
            "serial_no": index + 1,
            "consumption_date": completion_date,
            "work_order": wo_name,
            "material": f'<a href="/app/item/{material_code}">{material_name}</a>',
            "material_name": material_name, 
            "uom": item.stock_uom,
            
            # Data for charts and total columns
            "total_actual_qty": actual_material_qty,
            "total_planned_qty": planned_material_qty,
        }
        
        prod_item = wo_data.get("production_item")
        for prod in prod_item_list:
            scrubbed_name = frappe.scrub(prod)
            if prod == prod_item:
                # Data for table display (per ton)
                row[scrubbed_name + "_actual_per_ton"] = actual_per_ton
                row[scrubbed_name + "_planned_per_ton"] = planned_per_ton
                # Data for chart (total quantity)
                row[scrubbed_name + "_actual"] = actual_material_qty
                row[scrubbed_name + "_planned"] = planned_material_qty
            else:
                row[scrubbed_name + "_actual_per_ton"] = 0
                row[scrubbed_name + "_planned_per_ton"] = 0
                row[scrubbed_name + "_actual"] = 0
                row[scrubbed_name + "_planned"] = 0
        
        dataset.append(row)
        index += 1

    dataset.sort(
        key=lambda x: (
            getdate(x["consumption_date"]) if x.get("consumption_date") else getdate(nowdate()),
            x["material_name"],
        )
    )
    
    for i, row in enumerate(dataset):
        row["serial_no"] = i + 1

    return dataset

def get_columns(filters):
    is_month_filter = filters.get("is_month_filter", False)
    
    if is_month_filter:
        columns = [
            {"label": _("Nguyên liệu"), "fieldname": "material", "fieldtype": "HTML", "width": 200},
            {"label": _("Đơn vị"), "fieldname": "uom", "fieldtype": "Link", "options": "UOM", "width": 100},
            {"label": _("Tổng Thực tế"), "fieldname": "total_actual_qty", "fieldtype": "Float", "width": 150},
            {"label": _("Tổng Định mức"), "fieldname": "total_planned_qty", "fieldtype": "Float", "width": 150},
        ]
    else:
        columns = [
            {"label": _("Ngày hoàn thành"), "fieldname": "consumption_date", "fieldtype": "Date", "width": 120},
            {"label": _("Work Order"), "fieldname": "work_order", "fieldtype": "Link", "options": "Work Order", "width": 150},
            {"label": _("Nguyên liệu"), "fieldname": "material", "fieldtype": "HTML", "width": 200},
            {"label": _("Đơn vị"), "fieldname": "uom", "fieldtype": "Link", "options": "UOM", "width": 100},
            {"label": _("SL Thực tế"), "fieldname": "total_actual_qty", "fieldtype": "Float", "width": 150},
            {"label": _("SL Định mức"), "fieldname": "total_planned_qty", "fieldtype": "Float", "width": 150},
        ]

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
            
            width = 200
            
            columns.append({
                "label": f"<br><b>{_('Thực tế / tấn')}</b>", 
                "fieldname": scrubbed_name + "_actual_per_ton",
                "fieldtype": "Float",
                "width": width,
                "parent": item_name,
            })
            
            columns.append({
                "label": f"<br><b>{_('Định mức / tấn')}</b>",
                "fieldname": scrubbed_name + "_planned_per_ton",
                "fieldtype": "Float",
                "width": width,
                "parent": item_name
            })
            
            # Add hidden columns for chart data
            columns.append({
                "label": "Actual Total", 
                "fieldname": scrubbed_name + "_actual",
                "hidden": 1
            })
            columns.append({
                "label": "Planned Total",
                "fieldname": scrubbed_name + "_planned",
                "hidden": 1
            })

    return columns

def get_work_orders(filters):
    """
    Get work orders based on filters, including production quantities
    """
    
    conditions = ""
    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND wo.actual_end_date BETWEEN %(from_date)s AND %(to_date)s"
    elif filters.get("from_date"):
        conditions += " AND wo.actual_end_date >= %(from_date)s"
    elif filters.get("to_date"):
        conditions += " AND wo.actual_end_date <= %(to_date)s"
    if filters.get("company"):
        conditions += " AND wo.company = %(company)s"

    if filters.get("manufacturing_category"):
        conditions += " AND bom.custom_category = %(manufacturing_category)s"
    else:
        conditions += " AND bom.custom_category IS NOT NULL AND bom.custom_category != ''"

    conditions += " AND wo.status IN ('Completed', 'In Process')"

    sql_query = """
        SELECT
            wo.name,
            wo.production_item,
            item.item_name,
            wo.qty,
            wo.produced_qty,
            wo.actual_end_date,
            wo.planned_end_date
        FROM
            `tabWork Order` wo
        JOIN
            `tabItem` item ON wo.production_item = item.name
        JOIN
            `tabBOM` bom ON wo.bom_no = bom.name 
        WHERE
            wo.docstatus = 1 {conditions}
    """.format(conditions=conditions)
    
    
    work_orders = frappe.db.sql(sql_query, filters, as_dict=1)

    return work_orders
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

    # Handle week filter
    filters = process_week_filter(filters)
    
    # XHandle month/year filter
    filters = process_month_year_filter(filters)
    
    columns = get_columns(filters)
    data = get_data(filters) 
    
    return columns, data, None, None, None

def process_week_filter(filters):
    """
    Handle week filter: convert the chosen date in range date from MON to SUN
    """
    if filters.get("week"):
        try:
            # Parse chosen date
            if isinstance(filters["week"], str):
                selected_date = datetime.strptime(filters["week"], "%Y-%m-%d")
            else:
                selected_date = filters["week"]
            
            # Calculate the day of week (0 = Mon, 6 = Sunday)
            weekday = selected_date.weekday()
            
            # Calculate the monday of week
            monday = selected_date - timedelta(days=weekday)
            
            # Calculate the sunday of week
            sunday = monday + timedelta(days=6)
            
            # Update filter with the time from mon to sun
            filters["from_date"] = monday.strftime("%Y-%m-%d")
            filters["to_date"] = sunday.strftime("%Y-%m-%d")
            
            # Debug
            frappe.log_error(
                f"Week filter: Selected {filters['week']} -> Monday {filters['from_date']} to Sunday {filters['to_date']}", 
                "Week Filter Debug"
            )
            
        except Exception as e:
            frappe.log_error(f"Error processing week filter: {str(e)}", "Week Filter Error")
    
    return filters

def process_month_year_filter(filters):
    """
    Handle month/year filter: convert to range from first date to month
    """
    if filters.get("month") and filters.get("year"):
        try:
            month = int(filters["month"])
            year = int(filters["year"])
            
            # First date of month
            from_date = datetime(year, month, 1)
            
            # Last date of month
            if month == 12:
                to_date = datetime(year + 1, 1, 1) - timedelta(days=1)
            else:
                to_date = datetime(year, month + 1, 1) - timedelta(days=1)
            
            # Update filter with the entire month
            filters["from_date"] = from_date.strftime("%Y-%m-%d")
            filters["to_date"] = to_date.strftime("%Y-%m-%d")
            
            # Mark this is the filter to use different logic data process
            filters["is_month_filter"] = True
            
            # Debug
            frappe.log_error(
                f"Month filter: Selected {month}/{year} -> {filters['from_date']} to {filters['to_date']}", 
                "Month Filter Debug"
            )
            
        except Exception as e:
            frappe.log_error(f"Error processing month/year filter: {str(e)}", "Month Filter Error")
    
    return filters

def get_data(filters):
    """
    The func to get and process report date
    """
    work_orders = get_work_orders(filters)
    if not work_orders:
        return []

    wo_list = [d.name for d in work_orders]
    prod_item_list = sorted(list(set([d.production_item for d in work_orders])))
    
    # Check if month filter
    is_month_filter = filters.get("is_month_filter", False)
    
    if is_month_filter:
        # Logic for month table ( total ingredients )
        return get_monthly_data(work_orders, wo_list, prod_item_list)
    else:
        # Logic for detail table
        return get_detailed_data(work_orders, wo_list, prod_item_list, filters)

def get_monthly_data(work_orders, wo_list, prod_item_list):
    """
    Return the agreesive data
    """
    material_map = {}
    wo_to_prod_item = {wo.name: wo.production_item for wo in work_orders}

    # STEP 1: get planned data
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

    # STEP 2: Get actual data
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

    # STEP 3: prepare output data
    material_codes = list(material_map.keys())
    if not material_codes:
        return []
    item_names_data = frappe.get_all("Item", filters={"name": ("in", material_codes)}, fields=["name", "item_name"])
    item_name_map = {d.name: d.item_name for d in item_names_data}

    dataset = []
    for index, material_code in enumerate(sorted(material_map.keys())):
        row_data = material_map[material_code]
        material_name = item_name_map.get(material_code, material_code)
        
        # stacked column chart logic
        total_actual = row_data.get("total_actual_qty", 0)
        total_planned = row_data.get("total_planned_qty", 0)
        
        # calc the exceed qouta
        over_limit = max(0, total_actual - total_planned)
        
        # calc the remaining
        within_limit = total_actual - over_limit

        row = {
            "serial_no": index + 1,
            "material": f'<a href="/app/item/{material_code}">{material_name}</a>',
            "material_name": material_name, 
            "uom": row_data.get("uom"),
            "total_actual_qty": total_actual,
            "total_planned_qty": total_planned,
            
            # add 2 new field to send to js
            "within_limit_qty": within_limit,
            "over_limit_qty": over_limit
        }
        
        for prod_item in prod_item_list:
            scrubbed_name = frappe.scrub(prod_item)
            row[scrubbed_name + "_actual"] = row_data.get(scrubbed_name + "_actual", 0)
            row[scrubbed_name + "_planned"] = row_data.get(scrubbed_name + "_planned", 0)
            
        dataset.append(row)

    return dataset

def get_detailed_data(work_orders, wo_list, prod_item_list, filters):
    """
    Return detailed data for the day compltete the work order
    """

    # Get Work Order info and the completed date
    wo_info = frappe.db.sql("""
        SELECT name, production_item, actual_end_date, planned_end_date, creation
        FROM `tabWork Order` 
        WHERE name IN %(work_orders)s
    """, {"work_orders": wo_list}, as_dict=1)
    
    wo_to_info = {wo.name: wo for wo in wo_info}

    # STEP 1: GET PLANNED data for WORK ORDER and DATE
    bom_items = frappe.db.sql("""
        SELECT parent, item_code, required_qty, stock_uom
        FROM `tabWork Order Item` WHERE parent IN %(work_orders)s
    """, {"work_orders": wo_list}, as_dict=1)

    # STEP 2: GET actual data
    actual_items = frappe.db.sql("""
        SELECT se_detail.item_code, se_detail.qty, se.work_order
        FROM `tabStock Entry Detail` se_detail
        JOIN `tabStock Entry` se ON se.name = se_detail.parent
        WHERE se.work_order IN %(work_orders)s AND se.docstatus = 1 
        AND se.purpose IN ('Manufacture', 'Material Consumption for Manufacture')
    """, {"work_orders": wo_list}, as_dict=1)

    # Create summary map for chart
    material_map_for_chart = {}
    for item in actual_items:
        material = item.item_code
        if material not in material_map_for_chart:
            material_map_for_chart[material] = {"total_actual_qty": 0, "total_planned_qty": 0}
        material_map_for_chart[material]["total_actual_qty"] += item.qty

    # Calc the total plan
    for item in bom_items:
        material = item.item_code
        if material not in material_map_for_chart:
            material_map_for_chart[material] = {"total_actual_qty": 0, "total_planned_qty": 0}
        material_map_for_chart[material]["total_planned_qty"] += item.required_qty

    # STEP 3: PREPARE Detailed data by WORK ORDER AND DATE
    material_codes = list(set([item.item_code for item in bom_items]))
    if not material_codes:
        return []
    
    item_names_data = frappe.get_all("Item", filters={"name": ("in", material_codes)}, fields=["name", "item_name"])
    item_name_map = {d.name: d.item_name for d in item_names_data}

    dataset = []
    index = 0
    
    # Create detail data by Work Order
    for item in bom_items:
        wo_name = item.parent
        wo_data = wo_to_info.get(wo_name, {})
        material_code = item.item_code
        material_name = item_name_map.get(material_code, material_code)
        
        # Determine the complete date
        completion_date = wo_data.get("actual_end_date") or wo_data.get("planned_end_date")
        if completion_date:
            completion_date = completion_date.date() if hasattr(completion_date, 'date') else completion_date
        
        # Get the actual quantity from Stock Entry for this Work Order
        actual_qty = 0
        for actual_item in actual_items:
            if actual_item.work_order == wo_name and actual_item.item_code == material_code:
                actual_qty += actual_item.qty

        # Calc the data for chart
        total_actual = material_map_for_chart.get(material_code, {}).get("total_actual_qty", 0)
        total_planned = material_map_for_chart.get(material_code, {}).get("total_planned_qty", 0)
        over_limit = max(0, total_actual - total_planned)
        within_limit = total_actual - over_limit

        row = {
            "serial_no": index + 1,
            "consumption_date": completion_date,
            "work_order": wo_name,
            "material": f'<a href="/app/item/{material_code}">{material_name}</a>',
            "material_name": material_name, 
            "uom": item.stock_uom,
            "total_actual_qty": actual_qty,
            "total_planned_qty": item.required_qty,
            
            # Data for chart
            "within_limit_qty": within_limit,
            "over_limit_qty": over_limit
        }
        
        # Add detail column for product
        prod_item = wo_data.get("production_item")
        for prod in prod_item_list:
            scrubbed_name = frappe.scrub(prod)
            if prod == prod_item:
                row[scrubbed_name + "_actual"] = actual_qty
                row[scrubbed_name + "_planned"] = item.required_qty
            else:
                row[scrubbed_name + "_actual"] = 0
                row[scrubbed_name + "_planned"] = 0
        
        dataset.append(row)
        index += 1

    # Order by date and ingredients
    dataset.sort(
        key=lambda x: (
            getdate(x["consumption_date"]) if x.get("consumption_date") else getdate(nowdate()),
            x["material_name"],
        )
    )
    
    # Re update the serial_no after sort
    for i, row in enumerate(dataset):
        row["serial_no"] = i + 1

    return dataset


def get_columns(filters):
    """
    Define the column for report
    """
    # Check if there is month filter or not
    is_month_filter = filters.get("is_month_filter", False)
    
    if is_month_filter:
        # Column for month table
        columns = [
            {"label": _("Nguyên liệu"), "fieldname": "material", "fieldtype": "HTML", "width": 250},
            {"label": _("Đơn vị"), "fieldname": "uom", "fieldtype": "Link", "options": "UOM", "width": 150},
            {"label": _("Tổng Thực tế"), "fieldname": "total_actual_qty", "fieldtype": "Float", "width": 150},
            {"label": _("Tổng Định mức"), "fieldname": "total_planned_qty", "fieldtype": "Float", "width": 150},
        ]
    else:
        # Column for detail table
        columns = [
            {"label": _("Ngày hoàn thành"), "fieldname": "consumption_date", "fieldtype": "Date", "width": 120},
            {"label": _("Work Order"), "fieldname": "work_order", "fieldtype": "Link", "options": "Work Order", "width": 150},
            {"label": _("Nguyên liệu"), "fieldname": "material", "fieldtype": "HTML", "width": 250},
            {"label": _("Đơn vị"), "fieldname": "uom", "fieldtype": "Link", "options": "UOM", "width": 150},
            {"label": _("SL Thực tế"), "fieldname": "total_actual_qty", "fieldtype": "Float", "width": 100},
            {"label": _("SL Định mức"), "fieldname": "total_planned_qty", "fieldtype": "Float", "width": 100},
        ]

    # Section to add dynacmic column by product
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
            
            # Adjust width
            width = 250 if is_month_filter else 250
            
            columns.append({
                "label": f"{item_name}  <br><b>{_('Thực tế')}</b>", 
                "fieldname": scrubbed_name + "_actual",
                "fieldtype": "Float",
                "width": width
            })
            
            columns.append({
                "label": f"{item_name}  <br><b>{_('Định mức')}</b>",
                "fieldname": scrubbed_name + "_planned",
                "fieldtype": "Float",
                "width": width
            })

    return columns

def get_work_orders(filters):
    """
    Lấy danh sách Work Order dựa trên bộ lọc
    """
    conditions = ""
    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND wo.creation BETWEEN %(from_date)s AND %(to_date)s"
    if filters.get("company"):
        conditions += " AND wo.company = %(company)s"

    # manufacturing cagetory filter logic
    if filters.get("manufacturing_category"):
        # case 1: user choose a manufacturing category
        conditions += " AND bom.custom_category = %(manufacturing_category)s"
    else:
        # case 2: user does not choose any manufacturing
        conditions += " AND bom.custom_category IS NOT NULL AND bom.custom_category != ''"

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
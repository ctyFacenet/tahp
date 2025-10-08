# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from collections import defaultdict
from datetime import datetime, timedelta

def execute(filters=None):
    """Main function to execute the week plan report"""
    if not filters:
        filters = {}

    filters = process_week_filter(filters)
    week_work_orders = get_week_work_orders(filters)
    planned_data = get_planned_data(week_work_orders, filters)
    actual_data = get_actual_data(week_work_orders, filters)
    columns = get_columns(week_work_orders)
    data = get_data(planned_data, actual_data, columns)
    
    return columns, data, None, None, None

def process_week_filter(filters):
    """Convert week selection to date range (Monday to Sunday)"""
    if filters.get("week"):
        try:
            if isinstance(filters["week"], str):
                selected_date = datetime.strptime(filters["week"], "%Y-%m-%d")
            else:
                selected_date = filters["week"]
            
            weekday = selected_date.weekday()
            monday = selected_date - timedelta(days=weekday)
            sunday = monday + timedelta(days=6)
            
            filters["from_date"] = monday.strftime("%Y-%m-%d")
            filters["to_date"] = sunday.strftime("%Y-%m-%d")
            
        except Exception as e:
            frappe.log_error(f"Week filter error: {str(e)}", "Week Filter Error")
    
    return filters

def get_week_work_orders(filters):
    """Get Week Work Orders based on filters - only submitted ones"""
    conditions = ""
    
    if filters.get("from_date") and filters.get("to_date"):
        conditions += """ AND EXISTS (
            SELECT 1 FROM `tabWeek Work Order Item` wwoi 
            WHERE wwoi.parent = wwo.name 
            AND wwoi.planned_start_time BETWEEN %(from_date)s AND %(to_date)s
        )"""
    elif filters.get("from_date"):
        conditions += """ AND EXISTS (
            SELECT 1 FROM `tabWeek Work Order Item` wwoi 
            WHERE wwoi.parent = wwo.name 
            AND wwoi.planned_start_time >= %(from_date)s
        )"""
    elif filters.get("to_date"):
        conditions += """ AND EXISTS (
            SELECT 1 FROM `tabWeek Work Order Item` wwoi 
            WHERE wwoi.parent = wwo.name 
            AND wwoi.planned_start_time <= %(to_date)s
        )"""
    
    conditions += " AND wwo.docstatus = 1"

    week_work_orders = frappe.db.sql("""
        SELECT
            wwo.name,
            wwo.creation_time
        FROM
            `tabWeek Work Order` wwo
        WHERE 1=1 {conditions}
        ORDER BY wwo.creation_time
    """.format(conditions=conditions), filters, as_dict=1)

    return week_work_orders

def get_planned_data(week_work_orders, filters):
    """Get planned data from Week Work Order Items"""
    if not week_work_orders:
        return {}
    
    wwo_names = [wwo.name for wwo in week_work_orders]
    
    planned_items = frappe.db.sql("""
        SELECT
            wwo.name as wwo_name,
            wwoi.item,
            item.item_name,
            item.item_group,
            bom.custom_category AS manufacturing_category,
            wwoi.qty,
            wwoi.planned_start_time,
            wwoi.planned_end_time
        FROM
            `tabWeek Work Order` wwo
        JOIN `tabWeek Work Order Item` wwoi ON wwo.name = wwoi.parent
        JOIN `tabItem` item ON wwoi.item = item.name
        LEFT JOIN `tabBOM` bom ON wwoi.bom = bom.name
        WHERE wwo.name IN %(wwo_names)s
        AND wwo.docstatus = 1
        ORDER BY wwoi.planned_start_time, item.item_name
    """, {"wwo_names": wwo_names}, as_dict=1)
    
    planned_data = defaultdict(lambda: defaultdict(lambda: {"qty": 0, "system": None, "wwo_name": None}))
    
    for item in planned_items:
        date_str = item.planned_start_time.strftime('%Y-%m-%d')
        scrubbed_name = frappe.scrub(item.item)
        system_category = (item.manufacturing_category or '').strip()
        
        planned_data[date_str][scrubbed_name]["qty"] += item.qty
        planned_data[date_str][scrubbed_name]["system"] = system_category
        planned_data[date_str][scrubbed_name]["wwo_name"] = item.wwo_name
    
    return planned_data

def get_actual_data(week_work_orders, filters):
    """Get actual data from Work Orders - only those with custom_plan (LSX tuần)"""
    if not week_work_orders:
        return {}
    
    wwo_names = [wwo.name for wwo in week_work_orders]
    
    actual_items = frappe.db.sql("""
        SELECT
            wo.custom_plan as wwo_name,
            wo.production_item,
            item.item_name,
            item.item_group,
            bom.custom_category AS manufacturing_category,
            wo.produced_qty,
            wo.actual_end_date
        FROM
            `tabWork Order` wo
        JOIN `tabItem` item ON wo.production_item = item.name
        LEFT JOIN `tabBOM` bom ON wo.bom_no = bom.name
        WHERE wo.custom_plan IN %(wwo_names)s
        AND wo.custom_plan IS NOT NULL
        AND wo.custom_plan != ''
        AND wo.docstatus = 1
        AND wo.status = 'Completed'
        ORDER BY wo.actual_end_date, item.item_name
    """, {"wwo_names": wwo_names}, as_dict=1)
    
    actual_data = defaultdict(lambda: defaultdict(lambda: {"qty": 0, "system": None}))
    
    for item in actual_items:
        date_str = item.actual_end_date.strftime('%Y-%m-%d')
        scrubbed_name = frappe.scrub(item.production_item)
        system_category = (item.manufacturing_category or '').strip()
        
        actual_data[date_str][scrubbed_name]["qty"] += item.produced_qty
        actual_data[date_str][scrubbed_name]["system"] = system_category
    
    return actual_data

def get_columns(week_work_orders):
    """Generate dynamic columns for week plan report with multi-level headers"""
    columns = [
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 120},
        {"label": _("LSX Tuần"), "fieldname": "wwo_name", "fieldtype": "Data", "width": 150},
    ]

    if not week_work_orders:
        columns.append({
            "label": _("Không có dữ liệu"),
            "fieldname": "no_data",
            "fieldtype": "Data",
            "width": 200
        })
        return columns

    product_details_list = []
    processed_items = set()
    
    planned_items = frappe.db.sql("""
        SELECT DISTINCT
            wwoi.item,
            item.item_name,
            bom.custom_category AS manufacturing_category
        FROM
            `tabWeek Work Order` wwo
        JOIN `tabWeek Work Order Item` wwoi ON wwo.name = wwoi.parent
        JOIN `tabItem` item ON wwoi.item = item.name
        LEFT JOIN `tabBOM` bom ON wwoi.bom = bom.name
        WHERE wwo.name IN %(wwo_names)s
        AND wwo.docstatus = 1
    """, {"wwo_names": [wwo.name for wwo in week_work_orders]}, as_dict=1)
    
    for item in planned_items:
        if item.item not in processed_items:
            product_details_list.append({
                "item_code": item.item,
                "item_name": item.item_name,
                "system_category": (item.manufacturing_category or "").strip()
            })
            processed_items.add(item.item)
    
    actual_items = frappe.db.sql("""
        SELECT DISTINCT
            wo.production_item,
            item.item_name,
            bom.custom_category AS manufacturing_category
        FROM
            `tabWork Order` wo
        JOIN `tabItem` item ON wo.production_item = item.name
        LEFT JOIN `tabBOM` bom ON wo.bom_no = bom.name
        WHERE wo.custom_plan IN %(wwo_names)s
        AND wo.custom_plan IS NOT NULL
        AND wo.custom_plan != ''
        AND wo.docstatus = 1
        AND wo.status = 'Completed'
    """, {"wwo_names": [wwo.name for wwo in week_work_orders]}, as_dict=1)
    
    for item in actual_items:
        if item.production_item not in processed_items:
            product_details_list.append({
                "item_code": item.production_item,
                "item_name": item.item_name,
                "system_category": (item.manufacturing_category or "").strip()
            })
            processed_items.add(item.production_item)

    if not product_details_list:
        columns.append({
            "label": _("Không có dữ liệu"),
            "fieldname": "no_data",
            "fieldtype": "Data",
            "width": 200
        })
        return columns

    product_details_list.sort(key=lambda x: (x.get("system_category"), x.get("item_name")))

    for item in product_details_list:
        scrubbed_name = frappe.scrub(item["item_code"])
        system_category = item.get("system_category") or ""
        
        if 'p2o5' in system_category.lower() or 'p2o5' in item['item_name'].lower():
            group_label = "P2O5"
        else:
            group_label = system_category or "Khác"
            
        columns.append({
            "label": f"<br><b>{item['item_name']}</b>",
            "fieldname": scrubbed_name,
            "fieldtype": "HTML",
            "width": 250,
            "parent": group_label
        })
        
    return columns

def get_data(planned_data, actual_data, columns):
    """Generate report data grouped by LSX (Week Work Order)"""
    if not planned_data and not actual_data:
        return [{"production_date": "Không có dữ liệu", "wwo_name": "", "no_data": "Không tìm thấy dữ liệu trong khoảng thời gian đã chọn"}]

    wwo_data = defaultdict(lambda: {
        "planned": defaultdict(lambda: {"qty": 0, "system": None}),
        "actual": defaultdict(lambda: {"qty": 0, "system": None}),
        "wwo_name": "",
        "dates": set()
    })
    
    for date, items in planned_data.items():
        for fieldname, item_data in items.items():
            wwo_name = item_data.get("wwo_name", "")
            if wwo_name:
                wwo_data[wwo_name]["planned"][fieldname]["qty"] += item_data["qty"]
                wwo_data[wwo_name]["planned"][fieldname]["system"] = item_data["system"]
                wwo_data[wwo_name]["wwo_name"] = wwo_name
                wwo_data[wwo_name]["dates"].add(date)
    
    for date, items in actual_data.items():
        for fieldname, item_data in items.items():
            for wwo_name, wwo_info in wwo_data.items():
                if fieldname in wwo_info["planned"]:
                    wwo_info["actual"][fieldname]["qty"] += item_data["qty"]
                    wwo_info["actual"][fieldname]["system"] = item_data["system"]
                    wwo_info["dates"].add(date)
                    break
    
    if not wwo_data:
        return [{"production_date": "Không có dữ liệu", "wwo_name": "", "no_data": "Không tìm thấy dữ liệu trong khoảng thời gian đã chọn"}]

    dataset = []
    product_fieldnames = [c["fieldname"] for c in columns if c["fieldname"] not in ["production_date", "wwo_name", "no_data"]]
    total_summary = defaultdict(lambda: {"planned": 0, "actual": 0})

    sorted_wwo_names = sorted(wwo_data.keys())
    for wwo_name in sorted_wwo_names:
        wwo_info = wwo_data[wwo_name]
        
        dates = sorted(wwo_info["dates"])
        date_range = f"{dates[0]} - {dates[-1]}" if len(dates) > 1 else dates[0] if dates else ""
        
        row = {"production_date": date_range, "wwo_name": wwo_name}
        for fieldname in product_fieldnames:
            planned_qty = wwo_info["planned"][fieldname]["qty"]
            actual_qty = wwo_info["actual"][fieldname]["qty"]
            
            if actual_qty > 0 or planned_qty > 0:
                row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}</div>"
                total_summary[fieldname]["planned"] += planned_qty
                total_summary[fieldname]["actual"] += actual_qty
            else:
                row[fieldname] = ""
                
        dataset.append(row)

    if dataset:
        total_row = {"production_date": f"<b>{_('Tổng cộng')}</b>", "wwo_name": ""}
        for fieldname in product_fieldnames:
            actual_total = total_summary[fieldname]["actual"]
            planned_total = total_summary[fieldname]["planned"]
            
            if actual_total > 0 or planned_total > 0:
                total_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b> / {frappe.utils.fmt_money(planned_total)}</div>"
            else:
                 total_row[fieldname] = "<div style='text-align: right;'>0 / 0</div>"
                 
        dataset.append(total_row)

    return dataset
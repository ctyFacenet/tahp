# Copyright (c) 2025, your_company_name and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from collections import defaultdict
from datetime import datetime, timedelta

def execute(filters=None):
    """Main function to execute the production report"""
    if not filters:
        filters = {}

    # Convert week filter to date range
    filters = process_week_filter(filters)
    
    # Get work orders based on filters
    work_orders = get_completed_work_orders(filters)
    
    # Generate columns and data
    columns = get_columns(work_orders)
    data = get_data(work_orders, columns)
    
    return columns, data, None, None, None

def process_week_filter(filters):
    """Convert week selection to date range (Monday to Sunday)"""
    if filters.get("week"):
        try:
            # Parse selected date
            if isinstance(filters["week"], str):
                selected_date = datetime.strptime(filters["week"], "%Y-%m-%d")
            else:
                selected_date = filters["week"]
            
            # Get day of week (0 = Monday, 6 = Sunday)
            weekday = selected_date.weekday()
            
            # Calculate Monday of the week
            monday = selected_date - timedelta(days=weekday)
            
            # Calculate Sunday of the week
            sunday = monday + timedelta(days=6)
            
            # Update filters with date range
            filters["from_date"] = monday.strftime("%Y-%m-%d")
            filters["to_date"] = sunday.strftime("%Y-%m-%d")
            
        except Exception as e:
            frappe.log_error(f"Week filter error: {str(e)}", "Week Filter Error")
    
    return filters

def get_columns(work_orders):
    """Generate dynamic columns for production report with multi-level headers"""
    columns = [
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 120},
    ]

    if not work_orders:
        return columns

    # Get unique products with their system category
    product_details_list = []
    processed_items = set()
    
    for wo in work_orders:
        if wo.production_item not in processed_items:
            product_details_list.append({
                "item_code": wo.production_item,
                "item_name": wo.item_name,
                "system_category": (getattr(wo, 'manufacturing_category', None) or "").strip()
            })
            processed_items.add(wo.production_item)

    # Filter out items without system category
    product_details_list = [p for p in product_details_list if p.get("system_category")] 

    # Sort by system category, then by item name
    product_details_list.sort(key=lambda x: (x.get("system_category"), x.get("item_name")))

    # Create columns from sorted list with multi-level header
    for item in product_details_list:
        scrubbed_name = frappe.scrub(item["item_code"])
        group_label = item.get("system_category") or "Khác"
        columns.append({
            "label": f"<br><b>{item['item_name']}</b>",
            "fieldname": scrubbed_name,
            "fieldtype": "HTML",
            "width": 250,
            "align": "left",
            "parent": group_label  # For multi-level header - parent shows the system category
        })
        
    return columns

def get_data(work_orders, columns):
    """Generate report data with right-aligned numbers"""
    if not work_orders:
        return []

    # Group data by date and product
    data_by_date = defaultdict(lambda: defaultdict(lambda: {"planned": 0, "actual": 0, "system": None}))
    
    for wo in work_orders:
        date_str = wo.planned_start_date.strftime('%Y-%m-%d')
        scrubbed_name = frappe.scrub(wo.production_item)
        system_category = (getattr(wo, 'manufacturing_category', None) or '').strip()
        data_by_date[date_str][scrubbed_name]["planned"] += wo.qty
        data_by_date[date_str][scrubbed_name]["actual"] += wo.produced_qty
        data_by_date[date_str][scrubbed_name]["system"] = system_category

    # Build dataset rows
    dataset = []
    product_fieldnames = [c["fieldname"] for c in columns if c["fieldname"] != "production_date"]
    total_summary = defaultdict(lambda: {"planned": 0, "actual": 0})

    sorted_dates = sorted(data_by_date.keys())
    for date in sorted_dates:
        row = {"production_date": date}
        for fieldname in product_fieldnames:
            planned_qty = data_by_date[date][fieldname]["planned"]
            actual_qty = data_by_date[date][fieldname]["actual"]
            
            if actual_qty > 0 or planned_qty > 0:
                # Right-align numbers with HTML
                row[fieldname] = f"<div style='text-align: center;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}</div>"
                total_summary[fieldname]["planned"] += planned_qty
                total_summary[fieldname]["actual"] += actual_qty
            else:
                row[fieldname] = ""
                
        dataset.append(row)

    # Add total row
    if dataset:
        total_row = {"production_date": f"<b>{_('Tổng cộng')}</b>"}
        for fieldname in product_fieldnames:
            actual_total = total_summary[fieldname]["actual"]
            
            if actual_total > 0:
                total_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b></div>"
            else:
                 total_row[fieldname] = "<div style='text-align: right;'>0</div>"
                 
        dataset.append(total_row)

    return dataset

def get_completed_work_orders(filters):
    """Get completed work orders based on filters"""
    conditions = ""
    
    # Handle date filters (inclusive by date, ignore time component)
    if filters.get("from_date") and filters.get("to_date"):
        conditions += " AND DATE(wo.planned_start_date) BETWEEN %(from_date)s AND %(to_date)s"
    elif filters.get("from_date"):
        conditions += " AND DATE(wo.planned_start_date) >= %(from_date)s"
    elif filters.get("to_date"):
        conditions += " AND DATE(wo.planned_start_date) <= %(to_date)s"
    
    if filters.get("company"):
        conditions += " AND wo.company = %(company)s"
    if filters.get("production_item"):
        conditions += " AND wo.production_item = %(production_item)s"

    conditions += " AND wo.status = 'Completed'"

    # Get work orders with manufacturing category from BOM
    work_orders = frappe.db.sql("""
        SELECT
            wo.planned_start_date,
            wo.production_item,
            item.item_name,
            item.item_group,
            bom.custom_category AS manufacturing_category,
            wo.qty,
            wo.produced_qty
        FROM
            `tabWork Order` wo
        JOIN `tabItem` item ON wo.production_item = item.name
        LEFT JOIN `tabBOM` bom ON wo.bom_no = bom.name
        WHERE wo.docstatus = 1 {conditions}
    """.format(conditions=conditions), filters, as_dict=1)

    return work_orders
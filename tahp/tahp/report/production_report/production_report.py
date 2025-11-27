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

    # Convert week or month/year filter to date range
    filters = process_week_filter(filters)
    filters = process_month_year_filter(filters)
    
    # Get work orders based on filters
    work_orders = get_completed_work_orders(filters)
    
    # Generate columns and data
    columns = get_columns(work_orders)
    data = get_data(work_orders, columns, filters)
    
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


def process_month_year_filter(filters):
    """If a month is selected, convert month+year to from_date/to_date"""
    month = filters.get("month")
    year = filters.get("year")

    if month:
        try:
            # month could be like "Tháng 1" or an integer; extract numeric part
            if isinstance(month, str):
                # Try to find digits in the string
                import re
                m = re.search(r"(\d+)", month)
                month_num = int(m.group(1)) if m else None
            else:
                month_num = int(month)

            if not month_num:
                return filters

            if not year:
                # fallback to current year
                from datetime import datetime
                year = datetime.now().year

            from datetime import date, timedelta
            first_day = date(int(year), int(month_num), 1)
            # compute last day of month by going to the first of next month and subtracting one day
            if month_num == 12:
                next_month_first = date(int(year) + 1, 1, 1)
            else:
                next_month_first = date(int(year), int(month_num) + 1, 1)
            last_day = next_month_first - timedelta(days=1)

            filters["from_date"] = first_day.strftime("%Y-%m-%d")
            filters["to_date"] = last_day.strftime("%Y-%m-%d")
        except Exception as e:
            frappe.log_error(f"Month/Year filter error: {str(e)}", "Month Filter Error")

    return filters

def get_columns(work_orders):
    """Generate dynamic columns for production report with multi-level headers"""
    columns = [
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 150, "align": "left"},
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
            "width": 300,
            "align": "left",
            "parent": group_label  # For multi-level header - parent shows the system category
        })
        
    return columns

def get_data(work_orders, columns, filters=None):
    """Generate report data with right-aligned numbers, optionally grouped by week/month/quarter/year"""
    if not work_orders:
        return []

    group_by = (filters or {}).get("group_by", "")

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

    # --- Group logic ---
    def get_group_keys(date_str):
        """Return list of (key, label, level) tuples for hierarchical grouping based on group_by filter"""
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        month = dt.month
        year = dt.year
        quarter = (month - 1) // 3 + 1

        # Tính tuần theo tháng
        first_day = dt.replace(day=1)
        # Thứ của ngày đầu tháng (0=Monday, 6=Sunday)
        first_weekday = first_day.weekday()
        # Số ngày đã qua từ đầu tháng
        days_since_first = (dt - first_day).days
        # Tuần trong tháng: tuần đầu tiên là 1
        week_in_month = ((days_since_first + first_weekday) // 7) + 1
        week_key = f"{year}-{month:02d}-W{week_in_month}"
        week_label = f"Tuần {week_in_month}, {month}/{year}"
        month_key = f"{year}-{month:02d}"
        month_label = f"Tháng {month}, {year}"
        quarter_key = f"{year}-Q{quarter}"
        quarter_label = f"Quý {quarter}, {year}"
        year_key = f"{year}"
        year_label = f"Năm {year}"

        # Return hierarchy based on group_by
        if group_by == "Tuần":
            return [(week_key, week_label, 0)]
        elif group_by == "Tháng":
            # Month -> Week -> Date
            return [(month_key, month_label, 0), (week_key, week_label, 1)]
        elif group_by == "Quý":
            # Quarter -> Month -> Date
            return [(quarter_key, quarter_label, 0), (month_key, month_label, 1)]
        elif group_by == "Năm":
            # Year -> Quarter -> Date
            return [(year_key, year_label, 0), (quarter_key, quarter_label, 1)]
        else:
            return []

    if group_by and group_by in ["Tuần", "Tháng", "Quý", "Năm"]:
        # Build hierarchical structure
        from collections import OrderedDict

        # Determine depth based on group_by
        if group_by == "Tuần":
            depth = 1  # Week -> Date
        else:
            depth = 2  # Parent -> Child Group -> Date

        # Build nested structure
        hierarchy = OrderedDict()
        for date in sorted_dates:
            keys = get_group_keys(date)
            if depth == 1:
                # Single level grouping (Week)
                key, label, level = keys[0]
                if key not in hierarchy:
                    hierarchy[key] = {"label": label, "dates": [], "children": None}
                hierarchy[key]["dates"].append(date)
            else:
                # Two level grouping
                parent_key, parent_label, parent_level = keys[0]
                child_key, child_label, child_level = keys[1]
                if parent_key not in hierarchy:
                    hierarchy[parent_key] = {"label": parent_label, "dates": [], "children": OrderedDict()}
                if child_key not in hierarchy[parent_key]["children"]:
                    hierarchy[parent_key]["children"][child_key] = {"label": child_label, "dates": []}
                hierarchy[parent_key]["children"][child_key]["dates"].append(date)

        # Build dataset from hierarchy
        for parent_key, parent_info in hierarchy.items():
            # Parent row (level 0)
            parent_row = {"production_date": f"<b>{parent_info['label']}</b>", "indent": 0}
            for fieldname in product_fieldnames:
                parent_row[fieldname] = ""
            dataset.append(parent_row)
            parent_summary = defaultdict(lambda: {"planned": 0, "actual": 0})

            if parent_info["children"]:
                # Two-level grouping
                for child_key, child_info in parent_info["children"].items():
                    # Child group row (level 1)
                    child_row = {"production_date": f"<b>{child_info['label']}</b>", "indent": 1}
                    for fieldname in product_fieldnames:
                        child_row[fieldname] = ""
                    dataset.append(child_row)
                    child_summary = defaultdict(lambda: {"planned": 0, "actual": 0})

                    # Date rows (level 2)
                    for date in child_info["dates"]:
                        row = {"production_date": date, "indent": 2}
                        for fieldname in product_fieldnames:
                            planned_qty = data_by_date[date][fieldname]["planned"]
                            actual_qty = data_by_date[date][fieldname]["actual"]
                            
                            if actual_qty > 0 or planned_qty > 0:
                                percentage_html = ""
                                if planned_qty > 0:
                                    percentage = round((actual_qty / planned_qty) * 100)
                                    percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                                row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}{percentage_html}</div>"
                                child_summary[fieldname]["planned"] += planned_qty
                                child_summary[fieldname]["actual"] += actual_qty
                            else:
                                row[fieldname] = ""
                        dataset.append(row)

                    # Update child group row with summary
                    for fieldname in product_fieldnames:
                        actual_total = child_summary[fieldname]["actual"]
                        planned_total = child_summary[fieldname]["planned"]
                        if actual_total > 0 or planned_total > 0:
                            percentage_html = ""
                            if planned_total > 0:
                                percentage = round((actual_total / planned_total) * 100)
                                percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                            child_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b> / {frappe.utils.fmt_money(planned_total)}{percentage_html}</div>"
                        parent_summary[fieldname]["planned"] += child_summary[fieldname]["planned"]
                        parent_summary[fieldname]["actual"] += child_summary[fieldname]["actual"]
                        total_summary[fieldname]["planned"] += child_summary[fieldname]["planned"]
                        total_summary[fieldname]["actual"] += child_summary[fieldname]["actual"]
            else:
                # Single-level grouping (Week -> Date)
                for date in parent_info["dates"]:
                    row = {"production_date": date, "indent": 1}
                    for fieldname in product_fieldnames:
                        planned_qty = data_by_date[date][fieldname]["planned"]
                        actual_qty = data_by_date[date][fieldname]["actual"]
                        
                        if actual_qty > 0 or planned_qty > 0:
                            percentage_html = ""
                            if planned_qty > 0:
                                percentage = round((actual_qty / planned_qty) * 100)
                                percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                            row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}{percentage_html}</div>"
                            parent_summary[fieldname]["planned"] += planned_qty
                            parent_summary[fieldname]["actual"] += actual_qty
                            total_summary[fieldname]["planned"] += planned_qty
                            total_summary[fieldname]["actual"] += actual_qty
                        else:
                            row[fieldname] = ""
                    dataset.append(row)

            # Update parent row with summary
            for fieldname in product_fieldnames:
                actual_total = parent_summary[fieldname]["actual"]
                planned_total = parent_summary[fieldname]["planned"]
                if actual_total > 0 or planned_total > 0:
                    percentage_html = ""
                    if planned_total > 0:
                        percentage = round((actual_total / planned_total) * 100)
                        percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                    parent_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b> / {frappe.utils.fmt_money(planned_total)}{percentage_html}</div>"
    else:
        # No grouping, original logic
        for date in sorted_dates:
            row = {"production_date": date}
            for fieldname in product_fieldnames:
                planned_qty = data_by_date[date][fieldname]["planned"]
                actual_qty = data_by_date[date][fieldname]["actual"]
                
                if actual_qty > 0 or planned_qty > 0:
                    # Calculate percentage if planned_qty > 0
                    percentage_html = ""
                    if planned_qty > 0:
                        percentage = round((actual_qty / planned_qty) * 100)
                        percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                    
                    # Right-align numbers with HTML
                    row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}{percentage_html}</div>"
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
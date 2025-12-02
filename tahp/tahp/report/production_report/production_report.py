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
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 200, "align": "left"},
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
    """Generate report data with right-aligned numbers, grouped by week/month/quarter/year"""
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

    # --- Group logic ---
    def get_date_hierarchy(date_str):
        """Return full hierarchy info for a date"""
        dt = datetime.strptime(date_str, '%Y-%m-%d')
        month = dt.month
        year = dt.year
        day = dt.day
        quarter = (month - 1) // 3 + 1

        # Tính tuần theo tháng
        first_day = dt.replace(day=1)
        first_weekday = first_day.weekday()
        days_since_first = (dt - first_day).days
        week_in_month = ((days_since_first + first_weekday) // 7) + 1

        return {
            "year": {"key": f"{year}", "label": f"Năm {year}"},
            "quarter": {"key": f"{year}-Q{quarter}", "label": f"Quý {quarter}, {year}"},
            "month": {"key": f"{year}-{month:02d}", "label": f"Tháng {month}, {year}"},
            "week": {"key": f"{year}-{month:02d}-W{week_in_month}", "label": f"Tuần {week_in_month}, {month}/{year}"},
            "date": date_str
        }

    def build_nested_hierarchy(dates, levels):
        """Build nested hierarchy based on specified levels"""
        from collections import OrderedDict
        
        hierarchy = OrderedDict()
        
        for date in dates:
            info = get_date_hierarchy(date)
            current = hierarchy
            
            for i, level in enumerate(levels):
                key = info[level]["key"]
                label = info[level]["label"]
                
                if key not in current:
                    current[key] = {
                        "label": label,
                        "children": OrderedDict() if i < len(levels) - 1 else None,
                        "dates": [] if i == len(levels) - 1 else None
                    }
                
                if i == len(levels) - 1:
                    # Last level before dates
                    current[key]["dates"].append(date)
                else:
                    current = current[key]["children"]
        
        return hierarchy

    def process_hierarchy(hierarchy, level, product_fieldnames, data_by_date, dataset, total_summary):
        """Recursively process hierarchy and build dataset rows"""
        all_summary = defaultdict(lambda: {"planned": 0, "actual": 0})
        
        for key, info in hierarchy.items():
            # Create group row
            group_row = {"production_date": f"<b>{info['label']}</b>", "indent": level}
            for fieldname in product_fieldnames:
                group_row[fieldname] = ""
            dataset.append(group_row)
            
            group_summary = defaultdict(lambda: {"planned": 0, "actual": 0})
            
            if info["children"]:
                # Process child groups recursively
                child_summary = process_hierarchy(
                    info["children"], level + 1, product_fieldnames, 
                    data_by_date, dataset, total_summary
                )
                # Aggregate child summaries
                for fieldname in product_fieldnames:
                    group_summary[fieldname]["planned"] += child_summary[fieldname]["planned"]
                    group_summary[fieldname]["actual"] += child_summary[fieldname]["actual"]
            
            if info["dates"]:
                # Process date rows
                for date in info["dates"]:
                    row = {"production_date": date, "indent": level + 1}
                    for fieldname in product_fieldnames:
                        planned_qty = data_by_date[date][fieldname]["planned"]
                        actual_qty = data_by_date[date][fieldname]["actual"]
                        
                        if actual_qty > 0 or planned_qty > 0:
                            percentage_html = ""
                            if planned_qty > 0:
                                percentage = round((actual_qty / planned_qty) * 100)
                                percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                            row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}{percentage_html}</div>"
                            group_summary[fieldname]["planned"] += planned_qty
                            group_summary[fieldname]["actual"] += actual_qty
                            total_summary[fieldname]["planned"] += planned_qty
                            total_summary[fieldname]["actual"] += actual_qty
                        else:
                            row[fieldname] = ""
                    dataset.append(row)
            
            # Update group row with summary
            for fieldname in product_fieldnames:
                actual_total = group_summary[fieldname]["actual"]
                planned_total = group_summary[fieldname]["planned"]
                if actual_total > 0 or planned_total > 0:
                    percentage_html = ""
                    if planned_total > 0:
                        percentage = round((actual_total / planned_total) * 100)
                        percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                    group_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b> / {frappe.utils.fmt_money(planned_total)}{percentage_html}</div>"
                
                # Accumulate to all_summary for parent
                all_summary[fieldname]["planned"] += group_summary[fieldname]["planned"]
                all_summary[fieldname]["actual"] += group_summary[fieldname]["actual"]
        
        return all_summary

    # Always use hierarchical view - levels based on group_by filter
    group_by = (filters or {}).get("group_by", "Mặc định")
    
    # Determine hierarchy levels based on group_by selection
    if group_by == "Năm":
        levels = ["year", "quarter", "month", "week"]  # Year → Quarter → Month → Week → Date
    elif group_by == "Quý":
        levels = ["quarter", "month", "week"]  # Quarter → Month → Week → Date
    elif group_by == "Tháng":
        levels = ["month", "week"]  # Month → Week → Date
    elif group_by == "Tuần":
        levels = ["week"]  # Week → Date
    else:
        # Default: use month → week
        levels = ["month", "week"]
    
    hierarchy = build_nested_hierarchy(sorted_dates, levels)
    process_hierarchy(hierarchy, 0, product_fieldnames, data_by_date, dataset, total_summary)

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
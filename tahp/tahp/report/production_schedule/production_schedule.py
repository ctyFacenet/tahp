# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe
from frappe import _
from collections import defaultdict
from datetime import datetime, timedelta

def execute(filters=None):
    """Main function to execute the week plan report"""
    try:
        if not filters:
            filters = {}

        filters = process_week_filter(filters)
        week_work_orders = get_week_work_orders(filters)
        planned_data = get_planned_data(week_work_orders, filters)
        columns = get_columns(week_work_orders)
        data = get_data(planned_data, columns)
        
        return columns, data, None, None, None
    except Exception as e:
        frappe.log_error(f"Production Schedule Report Error: {str(e)}", "Production Schedule Error")
        return [{"label": "Error", "fieldname": "error", "fieldtype": "Data"}], [{"error": f"Lỗi: {str(e)}"}], None, None, None

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
    """Get Week Work Orders based on filters - only submitted ones (ORM only)"""
    parent_names = None
    if filters.get("from_date") and filters.get("to_date"):
        rows = frappe.get_all(
            "Week Work Order Item",
            filters={"planned_start_time": ["between", [filters["from_date"], filters["to_date"]]]},
            pluck="parent"
        )
        parent_names = list(set(rows))
    elif filters.get("from_date"):
        rows = frappe.get_all(
            "Week Work Order Item",
            filters={"planned_start_time": [">=", filters["from_date"]]},
            pluck="parent"
        )
        parent_names = list(set(rows))
    elif filters.get("to_date"):
        rows = frappe.get_all(
            "Week Work Order Item",
            filters={"planned_start_time": ["<=", filters["to_date"]]},
            pluck="parent"
        )
        parent_names = list(set(rows))

    base_filters = {"docstatus": 1}
    if parent_names is not None:
        if not parent_names:
            return []
        base_filters["name"] = ["in", parent_names]

    week_work_orders = frappe.get_all(
        "Week Work Order",
        filters=base_filters,
        fields=["name", "creation_time"],
        order_by="creation_time asc"
    )
    return week_work_orders

def get_planned_data(week_work_orders, filters):
    """Get planned data from Week Work Order Items - cumulative data per LSX tuần"""
    if not week_work_orders:
        return {}
    
    wwo_names = [wwo.name for wwo in week_work_orders]
    
    # Get planned quantities from Week Work Order Items (ORM)
    wwoi_rows = frappe.get_all(
        "Week Work Order Item",
        filters={"parent": ["in", wwo_names]},
        fields=["parent as wwo_name", "item", "qty", "planned_start_time", "planned_end_time", "bom"]
    )
    item_codes = list({r["item"] for r in wwoi_rows}) if wwoi_rows else []
    bom_names = list({r["bom"] for r in wwoi_rows if r.get("bom")} ) if wwoi_rows else []

    item_info = {}
    if item_codes:
        for it in frappe.get_all("Item", filters={"name": ["in", item_codes]}, fields=["name", "item_name", "item_group"]):
            item_info[it["name"]] = it
    bom_info = {}
    if bom_names:
        for b in frappe.get_all("BOM", filters={"name": ["in", bom_names]}, fields=["name", "custom_category"]):
            bom_info[b["name"]] = b.get("custom_category")

    # Start dates map
    date_mapping = {}
    for r in wwoi_rows:
        start = r.get("planned_start_time")
        nm = r["wwo_name"]
        if nm not in date_mapping or (start and date_mapping[nm] and start < date_mapping[nm]) or (start and not date_mapping[nm]):
            date_mapping[nm] = start
    
    # Get actual quantities from Work Orders (ORM, ưu tiên custom_plan, fallback theo ngày+item)
    actual_items = []
    # 1) Xác định khoảng ngày tuần (để giới hạn phạm vi tìm WO) và map (ngày,item)->LSX
    date_item_to_parent = {}
    min_date = None
    max_date = None
    for r in wwoi_rows:
        if r.get("planned_start_time"):
            d = r.get("planned_start_time")
            date_only = d if isinstance(d, datetime) else datetime.strptime(str(d), "%Y-%m-%d")
            date_key = date_only.date()
            date_item_to_parent[(date_key, r["item"])] = r["wwo_name"]
            if not min_date or date_key < min_date:
                min_date = date_key
            if not max_date or date_key > max_date:
                max_date = date_key
    # 2) Lấy Work Order trong khoảng ngày (bao phủ tuần đang xem) và cộng thực tế
    wo_filters = {"docstatus": 1}
    if min_date and max_date:
        wo_filters["planned_start_date"] = ["between", [min_date, max_date]]
    if item_codes:
        wo_filters["production_item"] = ["in", item_codes]
    wo_rows = frappe.get_all(
        "Work Order",
        filters=wo_filters,
        fields=["name", "custom_plan", "production_item", "produced_qty", "planned_start_date"]
    )
    actual_map = defaultdict(float)  # (wwo_name, production_item) -> qty
    wwo_name_set = set(wwo_names)
    for wo in wo_rows:
        # Ưu tiên match theo custom_plan nếu thuộc tập LSX đang xét
        parent = wo.get("custom_plan")
        if parent not in wwo_name_set:
            d = wo.get("planned_start_date")
            if d:
                date_only = d if isinstance(d, datetime) else datetime.strptime(str(d), "%Y-%m-%d")
                parent = date_item_to_parent.get((date_only.date(), wo.get("production_item")))
        if parent in wwo_name_set:
            key = (parent, wo.get("production_item"))
            actual_map[key] += float(wo.get("produced_qty") or 0)
    for (parent, item_code), total_produced in actual_map.items():
        actual_items.append(frappe._dict({
            "wwo_name": parent,
            "production_item": item_code,
            "total_produced": total_produced
        }))
    
    # Group by LSX tuần (wwo_name)
    planned_data = defaultdict(lambda: defaultdict(lambda: {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None}))
    
    # Process planned quantities
    for r in wwoi_rows:
        item_code = r["item"]
        item_meta = item_info.get(item_code, {})
        system_category = (bom_info.get(r.get("bom")) or '').strip()
        scrubbed_name = frappe.scrub(item_code)
        
        planned_data[r["wwo_name"]][scrubbed_name]["planned_qty"] += (r.get("qty") or 0)
        planned_data[r["wwo_name"]][scrubbed_name]["system"] = system_category
        planned_data[r["wwo_name"]][scrubbed_name]["start_date"] = date_mapping.get(r["wwo_name"])
    
    # Process actual quantities
    for item in actual_items:
        scrubbed_name = frappe.scrub(item.production_item)
        # Always ensure the key exists so actual can be recorded even if not present in planned items
        if item.wwo_name not in planned_data:
            planned_data[item.wwo_name] = defaultdict(lambda: {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None})
        if scrubbed_name not in planned_data[item.wwo_name]:
            planned_data[item.wwo_name][scrubbed_name] = {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None}
        planned_data[item.wwo_name][scrubbed_name]["actual_qty"] += (item.total_produced or 0)
    
    return planned_data


def get_columns(week_work_orders):
    """Generate dynamic columns for week plan report with multi-level headers"""
    columns = [
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 120},
        {"label": _("LSX Tuần"), "fieldname": "wwo_name", "fieldtype": "Link", "options": "Week Work Order", "width": 150},
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
    
    # Build product list from planned items (ORM)
    wwo_names_list = [wwo.name for wwo in week_work_orders]
    wwoi_rows_for_cols = frappe.get_all(
        "Week Work Order Item",
        filters={"parent": ["in", wwo_names_list]},
        fields=["item", "bom"]
    )
    item_codes_cols = list({r["item"] for r in wwoi_rows_for_cols}) if wwoi_rows_for_cols else []
    bom_names_cols = list({r["bom"] for r in wwoi_rows_for_cols if r.get("bom")}) if wwoi_rows_for_cols else []
    item_meta_cols = {}
    if item_codes_cols:
        for it in frappe.get_all("Item", filters={"name": ["in", item_codes_cols]}, fields=["name", "item_name"]):
            item_meta_cols[it["name"]] = it
    bom_meta_cols = {}
    if bom_names_cols:
        for b in frappe.get_all("BOM", filters={"name": ["in", bom_names_cols]}, fields=["name", "custom_category"]):
            bom_meta_cols[b["name"]] = b.get("custom_category")
    planned_items = []
    for r in wwoi_rows_for_cols:
        planned_items.append(frappe._dict({
            "item": r["item"],
            "item_name": (item_meta_cols.get(r["item"], {}) or {}).get("item_name"),
            "manufacturing_category": (bom_meta_cols.get(r.get("bom")) or "")
        }))
    
    for item in planned_items:
        if item.item not in processed_items:
            product_details_list.append({
                "item_code": item.item,
                "item_name": item.item_name,
                "system_category": (item.manufacturing_category or "").strip()
            })
            processed_items.add(item.item)
    
    wo_rows_for_cols = frappe.get_all(
        "Work Order",
        filters={"docstatus": 1, "custom_plan": ["in", wwo_names_list]},
        fields=["production_item", "bom_no"]
    )
    item_codes_actual = list({r["production_item"] for r in wo_rows_for_cols}) if wo_rows_for_cols else []
    bom_names_actual = list({r["bom_no"] for r in wo_rows_for_cols if r.get("bom_no")}) if wo_rows_for_cols else []
    item_meta_actual = {}
    if item_codes_actual:
        for it in frappe.get_all("Item", filters={"name": ["in", item_codes_actual]}, fields=["name", "item_name"]):
            item_meta_actual[it["name"]] = it
    bom_meta_actual = {}
    if bom_names_actual:
        for b in frappe.get_all("BOM", filters={"name": ["in", bom_names_actual]}, fields=["name", "custom_category"]):
            bom_meta_actual[b["name"]] = b.get("custom_category")
    actual_items = []
    for r in wo_rows_for_cols:
        actual_items.append(frappe._dict({
            "production_item": r["production_item"],
            "item_name": (item_meta_actual.get(r["production_item"], {}) or {}).get("item_name"),
            "manufacturing_category": (bom_meta_actual.get(r.get("bom_no")) or "")
        }))
    
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

def get_data(planned_data, columns):
    """Generate report data grouped by LSX (Week Work Order) - cumulative data"""
    if not planned_data:
        return [{"production_date": "Không có dữ liệu", "wwo_name": "", "no_data": "Không tìm thấy dữ liệu trong khoảng thời gian đã chọn"}]

    dataset = []
    product_fieldnames = [c["fieldname"] for c in columns if c["fieldname"] not in ["production_date", "wwo_name", "no_data"]]
    total_summary = defaultdict(lambda: {"planned": 0, "actual": 0})

    # Sort by start date instead of wwo_name
    wwo_with_dates = []
    for wwo_name, wwo_info in planned_data.items():
        start_date = None
        for fieldname, item_data in wwo_info.items():
            if item_data.get("start_date"):
                start_date = item_data["start_date"]
                break
        wwo_with_dates.append((wwo_name, start_date))
    
    # Sort by start_date (None dates will be at the end)
    wwo_with_dates.sort(key=lambda x: x[1] if x[1] else datetime.max)
    
    for wwo_name, start_date in wwo_with_dates:
        wwo_info = planned_data[wwo_name]
        
        # Format start date for display
        display_date = start_date.strftime("%d/%m/%Y") if start_date else ""
        
        row = {"production_date": display_date, "wwo_name": wwo_name}
        for fieldname in product_fieldnames:
            planned_qty = wwo_info.get(fieldname, {}).get("planned_qty", 0)
            actual_qty = wwo_info.get(fieldname, {}).get("actual_qty", 0)
            
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
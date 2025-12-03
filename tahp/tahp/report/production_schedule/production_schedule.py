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
        # Handle week or month/year filters
        filters = process_week_filter(filters)
        filters = process_month_year_filter(filters)
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


def process_month_year_filter(filters):
    """Convert month+year selection to from_date/to_date like material_consumption"""
    month = filters.get("month")
    year = filters.get("year")

    if month:
        try:
            # month could be like "Tháng 1" or numeric
            if isinstance(month, str) and month.startswith("Tháng"):
                month_num = int(month.replace("Tháng", "").strip())
            else:
                month_num = int(month)

            if not year:
                from datetime import datetime
                year = datetime.now().year

            from datetime import date, timedelta
            first_day = date(int(year), int(month_num), 1)
            if month_num == 12:
                next_month_first = date(int(year) + 1, 1, 1)
            else:
                next_month_first = date(int(year), int(month_num) + 1, 1)
            last_day = next_month_first - timedelta(days=1)

            filters["from_date"] = first_day.strftime("%Y-%m-%d")
            filters["to_date"] = last_day.strftime("%Y-%m-%d")
        except Exception as e:
            frappe.log_error(f"Month filter error: {str(e)}", "Month Filter Error")

    return filters

def _extract_date_part(value):
    """Extract và normalize phần date từ identifier (ví dụ: '17.10.25' hoặc '17.10.2025' -> '17.10.25')."""
    if not value:
        return None
    import re
    # Tìm pattern ngày.tháng.năm (ví dụ: 17.10.25 hoặc 17.10.2025)
    match = re.search(r'(\d+)\.(\d+)\.(\d+)', str(value))
    if match:
        day = match.group(1)
        month = match.group(2)
        year = match.group(3)
        # Normalize năm: nếu năm là 4 chữ số, chuyển thành 2 chữ số cuối
        if len(year) == 4:
            year = year[-2:]
        return f"{day}.{month}.{year}"
    return None


def match_custom_plan_to_lsx(custom_plan, lsx_name):
    """
    Kiểm tra xem custom_plan có match với tên LSX không.
    Match nếu:
    - custom_plan trùng chính xác với lsx_name
    - custom_plan chứa lsx_name (ví dụ: "LSX.31.10.25-CA1" chứa "LSX.31.10.25")
    - lsx_name chứa custom_plan (ví dụ: "LSX.31.10.25" chứa "31.10.25")
    - Phần date được normalize giống nhau (ví dụ: "17.10.25" và "17.10.2025" đều thành "17.10.25")
    """
    if not custom_plan or not lsx_name:
        return False
    
    custom_plan = str(custom_plan).strip()
    lsx_name = str(lsx_name).strip()
    
    # Match chính xác
    if custom_plan == lsx_name:
        return True
    
    # Match nếu một trong hai chứa cái kia
    if custom_plan in lsx_name or lsx_name in custom_plan:
        return True
    
    # Match bằng cách so sánh phần date đã normalize
    # Ví dụ: "LSX.17.10.25" và "LSX.17.10.2025" đều có date là "17.10.25"
    custom_date = _extract_date_part(custom_plan)
    lsx_date = _extract_date_part(lsx_name)
    
    if custom_date and lsx_date and custom_date == lsx_date:
        return True
    
    return False


def get_planned_data(week_work_orders, filters):
    """
    Lấy dữ liệu kế hoạch và thực tế cho báo cáo tiến độ sản xuất theo LSX.
    
    Logic:
    1. Với mỗi LSX, lấy các Week Work Order Item để có số lượng kế hoạch (planned_qty)
    2. Với mỗi LSX, tìm tất cả Work Order có custom_plan trùng với tên LSX để lấy số lượng thực tế (actual_qty)
    """
    if not week_work_orders:
        return {}
    
    wwo_names = [wwo.name for wwo in week_work_orders]
    
    # Bước 1: Lấy số lượng kế hoạch từ Week Work Order Items
    wwoi_rows = frappe.get_all(
        "Week Work Order Item",
        filters={"parent": ["in", wwo_names]},
        fields=["parent as wwo_name", "item", "qty", "planned_start_time", "bom"]
    )
    
    # Lấy thông tin BOM
    bom_names = list({r["bom"] for r in wwoi_rows if r.get("bom")}) if wwoi_rows else []
    
    bom_info = {}
    if bom_names:
        for b in frappe.get_all("BOM", filters={"name": ["in", bom_names]}, fields=["name", "custom_category"]):
            bom_info[b["name"]] = b.get("custom_category")
    
    # Lưu ngày bắt đầu sớm nhất cho mỗi LSX
    date_mapping = {}
    for r in wwoi_rows:
        start = r.get("planned_start_time")
        nm = r["wwo_name"]
        if nm not in date_mapping or (start and date_mapping[nm] and start < date_mapping[nm]) or (start and not date_mapping[nm]):
            date_mapping[nm] = start
    
    # Bước 2: Lấy số lượng thực tế từ Work Orders
    # Với mỗi LSX, tìm tất cả WO có custom_plan trùng với tên LSX
    wo_rows = frappe.get_all(
        "Work Order",
        filters={"docstatus": 1, "custom_plan": ["is", "set"]},
        fields=["name", "custom_plan", "production_item", "produced_qty"]
    )
    
    # Map: (lsx_name, item_code) -> total_produced_qty
    actual_map = defaultdict(float)
    
    for wo in wo_rows:
        custom_plan = wo.get("custom_plan")
        if not custom_plan:
            continue
        
        # Tìm LSX nào match với custom_plan này
        # Ưu tiên match chính xác trước, sau đó mới match substring
        matched_lsx = None
        
        # Bước 1: Tìm match chính xác
        custom_plan_str = str(custom_plan).strip()
        for lsx_name in wwo_names:
            if custom_plan_str == str(lsx_name).strip():
                matched_lsx = lsx_name
                break
        
        # Bước 2: Nếu không có match chính xác, tìm match substring
        if not matched_lsx:
            for lsx_name in wwo_names:
                if match_custom_plan_to_lsx(custom_plan, lsx_name):
                    matched_lsx = lsx_name
                    break
        
        # Nếu tìm thấy LSX match, cộng dồn produced_qty
        if matched_lsx:
            item_code = wo.get("production_item")
            key = (matched_lsx, item_code)
            actual_map[key] += float(wo.get("produced_qty") or 0)
    
    # Bước 3: Gộp dữ liệu kế hoạch và thực tế
    planned_data = defaultdict(lambda: defaultdict(lambda: {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None}))
    
    # Xử lý số lượng kế hoạch từ Week Work Order Items
    for r in wwoi_rows:
        lsx_name = r["wwo_name"]
        item_code = r["item"]
        scrubbed_name = frappe.scrub(item_code)
        system_category = (bom_info.get(r.get("bom")) or '').strip()
        
        planned_data[lsx_name][scrubbed_name]["planned_qty"] += (r.get("qty") or 0)
        planned_data[lsx_name][scrubbed_name]["system"] = system_category
        planned_data[lsx_name][scrubbed_name]["start_date"] = date_mapping.get(lsx_name)
    
    # Xử lý số lượng thực tế từ Work Orders
    for (lsx_name, item_code), total_produced in actual_map.items():
        scrubbed_name = frappe.scrub(item_code)
        
        # Đảm bảo key tồn tại
        if lsx_name not in planned_data:
            planned_data[lsx_name] = defaultdict(lambda: {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None})
        if scrubbed_name not in planned_data[lsx_name]:
            planned_data[lsx_name][scrubbed_name] = {"planned_qty": 0, "actual_qty": 0, "system": None, "start_date": None}
        
        planned_data[lsx_name][scrubbed_name]["actual_qty"] += total_produced
    
    return planned_data


def get_columns(week_work_orders):
    """Generate dynamic columns for week plan report with multi-level headers"""
    columns = [
        {"label": _("Ngày"), "fieldname": "production_date", "fieldtype": "Data", "width": 150},
        {"label": _("LSX Tuần"), "fieldname": "wwo_name", "fieldtype": "Link", "options": "Week Work Order", "width": 200},
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
            "width": 300,
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
    
    # Sort by start_date descending (newest first, None dates will be at the end)
    wwo_with_dates.sort(key=lambda x: x[1] if x[1] else datetime.min, reverse=True)
    
    for wwo_name, start_date in wwo_with_dates:
        wwo_info = planned_data[wwo_name]
        
        # Format start date for display
        display_date = start_date.strftime("%d/%m/%Y") if start_date else ""
        
        row = {"production_date": display_date, "wwo_name": wwo_name}
        for fieldname in product_fieldnames:
            planned_qty = wwo_info.get(fieldname, {}).get("planned_qty", 0)
            actual_qty = wwo_info.get(fieldname, {}).get("actual_qty", 0)
            
            if actual_qty > 0 or planned_qty > 0:
                # Calculate percentage if planned_qty > 0
                percentage_html = ""
                if planned_qty > 0:
                    percentage = round((actual_qty / planned_qty) * 100)
                    percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                
                row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_qty)}</b> / {frappe.utils.fmt_money(planned_qty)}{percentage_html}</div>"
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
                # Calculate percentage if planned_total > 0
                percentage_html = ""
                if planned_total > 0:
                    percentage = round((actual_total / planned_total) * 100)
                    percentage_html = f" (<span style='color: #0066cc;'>{percentage}%</span>)"
                
                total_row[fieldname] = f"<div style='text-align: right;'><b>{frappe.utils.fmt_money(actual_total)}</b> / {frappe.utils.fmt_money(planned_total)}{percentage_html}</div>"
            else:
                 total_row[fieldname] = "<div style='text-align: right;'>0 / 0</div>"
                 
        dataset.append(total_row)

    return dataset
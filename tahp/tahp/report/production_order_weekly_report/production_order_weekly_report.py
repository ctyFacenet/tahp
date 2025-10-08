# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta
import frappe
from frappe.utils import getdate
import json

def execute(filters=None):
    """
    Sinh dữ liệu bảng báo cáo Tuần Lịch Sản Xuất.

    Args:
        filters (dict hoặc str, optional): Bộ lọc áp dụng cho báo cáo.
            - 'ww_order': Tên Week Work Order được chọn. Mặc định None.

    Returns:
        tuple: Bao gồm 2 phần tử:
            - columns (list[dict]): Danh sách định nghĩa cột báo cáo gồm:
                - item: Mặt hàng
                - unit: Đơn vị tính
                - actual: Sản lượng thực tế
                - planned: Sản lượng kế hoạch
                - variance: Chênh lệch (planned - actual)
                - percent_actual: % Thực tế/Kế hoạch
                - cumulative_actual: Lũy kế thực tế
                - cumulative_planned: Lũy kế kế hoạch
                - percent_cumulative: % Lũy kế thực tế/Kế hoạch
            - data (list[dict]): Danh sách dữ liệu từng dòng theo mặt hàng.
    """
    columns = [
        {"label": "Mặt hàng", "fieldname": "item", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 200},
        {"label": "ĐVT", "fieldname": "unit", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 80},
        {"label": "Thực tế", "fieldname": "actual", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "Kế hoạch", "fieldname": "planned", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "Chênh lệch", "fieldname": "variance", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "%Thực tế/Kế hoạch", "fieldname": "percent_actual", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Lũy kế thực tế", "fieldname": "cumulative_actual", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "kế hoạch tuần", "fieldname": "cumulative_planned", "fieldtype": "Int", 'dropdown': False, 'sortable': False, "width": 130},
        {"label": "%Hoàn thành", "fieldname": "percent_cumulative", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 180},
    ]
    data = []
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    selected_ww_order = filters.get("ww_order") if filters else None
    
    if not selected_ww_order:
        return columns, data  
        
    doc_wwo = frappe.get_doc("Week Work Order", selected_ww_order)
    
    cumulative_actual = 0
    cumulative_planned = 0

    for x in doc_wwo.items:
        item = x.item
        unit = x.uom
        planned = x.qty

        work_orders = frappe.get_all('Work Order', {
            'custom_plan': selected_ww_order,
            'production_item': item,
            'status': 'Completed'
        })
        
        actual = 0
        if work_orders:
            for wo in work_orders:
                wo_doc = frappe.get_doc("Work Order", wo.name)
                actual += wo_doc.produced_qty
            
        variance = planned - actual
        percent_actual = (actual / planned * 100) if planned else 0
            
        cumulative_actual += actual
        cumulative_planned += planned
        percent_cumulative = (cumulative_actual / cumulative_planned * 100) if cumulative_planned else 0

        data.append({
            "item": item,
            "unit": unit,
            "actual": actual,
            "planned": planned,
            "variance": variance,
            "percent_actual": percent_actual,
            "cumulative_actual": cumulative_actual,
            "cumulative_planned": cumulative_planned,
            "percent_cumulative": percent_cumulative,
        })
           
    return columns, data



@frappe.whitelist()
def get_actual_vs_planned(filters=None):
    """
    Lấy dữ liệu sản lượng Thực tế và Kế hoạch theo từng ngày, phân tách theo item.

    Args:
        filters (dict hoặc str, optional): Bộ lọc báo cáo.
            - 'ww_order': Tên Week Work Order. Mặc định None.

    Returns:
        dict: Dữ liệu dạng ngày, gồm:
            - labels (list[str]): Danh sách ngày (YYYY-MM-DD)
            - items (dict): Mỗi key là tên item, value là dict gồm:
                - actual (list[float]): Sản lượng thực tế từng ngày
                - planned (list[float]): Sản lượng kế hoạch từng ngày
    """
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    selected_ww_order = filters.get("ww_order") if filters else None
    
    if not selected_ww_order:
        return {"labels": [], "items": {}}
 
    # Lấy danh sách items từ Week Work Order
    doc_wwo = frappe.get_doc("Week Work Order", selected_ww_order)
    items_list = [x.item for x in doc_wwo.items]
    
    # Lấy tất cả Work Orders đã hoàn thành
    work_orders = frappe.get_all(
        "Work Order",
        filters={
            "custom_plan": selected_ww_order,
            "status": "Completed"
        },
        fields=[
            "production_item",
            "planned_start_date", "planned_end_date",
            "actual_start_date", "actual_end_date",
            "qty", "produced_qty"
        ]
    )
    
    if not work_orders:
        return {"labels": [], "items": {item: {"actual": [], "planned": []} for item in items_list}}

    # Tìm khoảng thời gian tổng thể
    planned_dates = []
    actual_dates = []

    for wo in work_orders:
        p_dates = [d for d in [wo.planned_start_date, wo.actual_start_date] if d]
        if p_dates:
            planned_dates.append(min(p_dates))

        a_dates = [d for d in [wo.planned_end_date, wo.actual_end_date] if d]
        if a_dates:
            actual_dates.append(max(a_dates))

    if not planned_dates or not actual_dates:
        return {"labels": [], "items": {item: {"actual": [], "planned": []} for item in items_list}}

    min_start = min(planned_dates)
    max_end = max(actual_dates)

    start_date = min_start.date() if hasattr(min_start, "date") else getdate(min_start)
    end_date = max_end.date() if hasattr(max_end, "date") else getdate(max_end)

    # Tạo danh sách labels (ngày)
    labels = []
    d = start_date
    while d <= end_date:
        labels.append(d.strftime("%Y-%m-%d"))
        d += timedelta(days=1)
 
    # Khởi tạo dictionary cho từng item
    items_data = {}
    for item in items_list:
        items_data[item] = {
            "planned_map": {},
            "actual_map": {}
        }

    # Phân bổ dữ liệu theo item và ngày
    for wo in work_orders:
        item = wo.production_item
        
        if item not in items_data:
            continue
            
        a_dates = [d for d in [wo.actual_start_date, wo.actual_end_date] if d]
        if a_dates:
            final_day = max(a_dates)
            wo_final_day = str(final_day.date() if hasattr(final_day, "date") else getdate(final_day))

            items_data[item]["planned_map"][wo_final_day] = \
                items_data[item]["planned_map"].get(wo_final_day, 0) + float(wo.qty or 0)
            
            items_data[item]["actual_map"][wo_final_day] = \
                items_data[item]["actual_map"].get(wo_final_day, 0) + float(wo.produced_qty or 0)

    # Chuyển đổi sang format cuối cùng
    result_items = {}
    for item in items_list:
        result_items[item] = {
            "planned": [items_data[item]["planned_map"].get(day, 0) for day in labels],
            "actual": [items_data[item]["actual_map"].get(day, 0) for day in labels]
        }

    return {
        "labels": labels,
        "items": result_items
    }
@frappe.whitelist()
def get_cumulative_actual_vs_planned(filters=None):
    """
    Tính lũy kế sản lượng Thực tế, Kế hoạch và % hoàn thành theo từng item.

    Args:
        filters (dict hoặc str, optional): Bộ lọc báo cáo.
            - 'ww_order': Tên Week Work Order. Mặc định None.

    Returns:
        dict: Dữ liệu lũy kế theo item, gồm:
            - labels (list[str]): Danh sách ngày
            - items (dict): Mỗi key là tên item, value là dict gồm:
                - cumulative_actual (list[float]): Lũy kế sản lượng thực tế
                - cumulative_planned (list[float]): Lũy kế sản lượng kế hoạch
                - percent_cumulative (list[float]): % Lũy kế thực tế/Kế hoạch
    """
    if isinstance(filters, str):
        filters = json.loads(filters)
    
    selected_ww_order = filters.get("ww_order") if filters else None
    
    if not selected_ww_order:
        return {"labels": [], "items": {}}
    
    # Lấy tổng kế hoạch từ Week Work Order
    doc_wwo = frappe.get_doc("Week Work Order", selected_ww_order)
    total_planned_by_item = {}
    for x in doc_wwo.items:
        total_planned_by_item[x.item] = x.qty
    
    # Lấy dữ liệu theo ngày
    data = get_actual_vs_planned(filters)

    if not data or not data.get("labels"):
        return {"labels": [], "items": {}}

    labels = data["labels"]
    items_data = data.get("items", {})
    
    if not items_data:
        return {"labels": [], "items": {}}

    result_items = {}

    # Tính lũy kế cho từng item
    for item_name, item_values in items_data.items():
        cumulative_actual = []
        cumulative_planned = []
        percent_cumulative = []
        
        running_actual = 0
        total_planned = total_planned_by_item.get(item_name, 0)

        for i in range(len(labels)):
            running_actual += item_values["actual"][i]
            
            cumulative_actual.append(running_actual)
            cumulative_planned.append(total_planned)
            
            # Tính % = (Lũy kế thực tế) / (Tổng kế hoạch) * 100
            percent = (running_actual / total_planned * 100) if total_planned > 0 else 0
            percent_cumulative.append(round(percent, 2))

        result_items[item_name] = {
            "cumulative_actual": cumulative_actual,
            "cumulative_planned": cumulative_planned,
            "percent_cumulative": percent_cumulative
        }

    return {
        "labels": labels,
        "items": result_items
    }

    

@frappe.whitelist()
def get_ww_orders():
    """
    Lấy danh sách Week Work Order đã được duyệt và có Work Order hoàn thành.

    Returns:
        dict: Bao gồm:
            - options (list[str]): Danh sách tên Week Work Order
            - default (str): Week Work Order mới nhất có Work Order hoàn thành
    """
    ww_orders = frappe.get_all(
        "Week Work Order",
        filters={"workflow_state": "Duyệt xong"},
        fields=["name", "creation"],
        order_by="creation desc"
    )

    result = []
    latest = None

    for ww in ww_orders:
        work_orders = frappe.get_all(
            "Work Order",
            filters={"custom_plan": ww.name, "status": "Completed"},
            fields=["name"]
        )
        if work_orders:
            result.append(ww.name)
            if not latest:
                latest = ww.name  

    return {"options": result, "default": latest}
    
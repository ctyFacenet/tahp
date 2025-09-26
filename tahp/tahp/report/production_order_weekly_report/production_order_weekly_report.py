# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

from datetime import datetime, timedelta
import frappe


def execute(filters=None):
    columns = [
        {"label": "Mặt hàng", "fieldname": "item", "fieldtype": "Data"},
        {"label": "ĐVT", "fieldname": "unit", "fieldtype": "Data"},
        {"label": "Thực tế", "fieldname": "actual", "fieldtype": "Int"},
        {"label": "Kế hoạch", "fieldname": "planned", "fieldtype": "Int"},
        {"label": "Chênh lệch", "fieldname": "variance", "fieldtype": "Int"},
        {"label": "%Thực tế/Kế hoạch", "fieldname": "percent_actual", "fieldtype": "Percent"},
        {"label": "Lũy kế thực tế", "fieldname": "cumulative_actual", "fieldtype": "Int"},
        {"label": "Lũy kế kế hoạch", "fieldname": "cumulative_planned", "fieldtype": "Int"},
        {"label": "%Lũy kế thực tế/Kế hoạch", "fieldname": "percent_cumulative", "fieldtype": "Percent"},
        # {"label": "Ngày", "fieldname": "date", "fieldtype": "Data"},  # giữ Data vì wo_date dạng dd.MM
    ]
    data = []

    # Lấy tất cả Week Work Order đã duyệt
    ww_orders = frappe.get_all(
        "Week Work Order",
        filters={"workflow_state": "Duyệt xong"},
        fields=["name"]
    )
    
    for wwo in ww_orders:
        doc_wwo = frappe.get_doc("Week Work Order", wwo.name)

        # Biến cộng dồn
        cumulative_actual = 0
        cumulative_planned = 0

        for x in doc_wwo.items:
            item = x.item
            unit = x.uom
            planned = x.qty

            actual = 0
            work_orders = frappe.get_all('Work Order', {
                'custom_plan': wwo.name,
                'status': 'Completed'
            })
            
            for wo in work_orders:
                wo_doc = frappe.get_doc("Work Order", wo)
                wo_code = wo_doc.custom_plan
                # wo_date = ".".join(wo_code.split(".")[1:3])  # Lấy ngày từ mã LSX
                actual += wo_doc.produced_qty

                variance = planned - actual
                percent_actual = (actual / planned * 100) if planned else 0
            
                cumulative_actual += actual
                cumulative_planned += planned
                cumulative_variance = cumulative_planned - cumulative_actual
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
                    "cumulative_variance": cumulative_variance,
                    "percent_cumulative": percent_cumulative,
                    # "date": wo_date,  # 
                })
    message = ""
    return columns, data, message


# Stacked Column Chart





import frappe
from frappe.utils import getdate
from datetime import timedelta

@frappe.whitelist()
def get_actual_vs_planned(filters=None):
    filters = frappe.parse_json(filters) if filters else {}

   
    ww_orders = frappe.get_all(
        "Week Work Order",
        filters={"workflow_state": "Duyệt xong"},
        fields=["name"],
        order_by="creation desc"
    )
    print("WW Orders:", ww_orders)

    if not ww_orders:
        return {"labels": [], "actual": [], "planned": []}

    result = {"labels": [], "actual": [], "planned": []}

   
    for wwo in ww_orders:
        wwo_name = wwo.name
        print(f"Đang xử lý WWO: {wwo_name}")

       
        work_orders = frappe.get_all(
            "Work Order",
            filters={
                "custom_plan": wwo_name,
                "status": "Completed"
            },
            fields=[
                "planned_start_date", "planned_end_date",
                "actual_start_date", "actual_end_date",
                "qty", "produced_qty"
            ]
        )
        print(f"Work Orders của {wwo_name}:", work_orders)

        if not work_orders:
            continue

      
        planned_dates = []
        actual_dates = []

        for wo in work_orders:
            p_dates = [d for d in [wo.planned_start_date, wo.actual_start_date] if d]
            if p_dates:
                min_p = min(p_dates)
                planned_dates.append(min_p)
                print(f"WO {wo} -> Min planned:", min_p)

            a_dates = [d for d in [wo.planned_end_date, wo.actual_end_date] if d]
            if a_dates:
                max_a = max(a_dates)
                actual_dates.append(max_a)
                print(f"WO {wo} -> Max actual:", max_a)

        if not planned_dates or not actual_dates:
            print("Không có đủ ngày planned/actual, bỏ qua WWO này.")
            continue

        min_start = min(planned_dates)
        max_end = max(actual_dates)

        start_date = min_start.date() if hasattr(min_start, "date") else getdate(min_start)
        end_date = max_end.date() if hasattr(max_end, "date") else getdate(max_end)

        print(f"Range ngày: {start_date} -> {end_date}")

        
        labels = []
        d = start_date
        while d <= end_date:
            labels.append(d.strftime("%Y-%m-%d"))
            d += timedelta(days=1)
        print("Labels (dải ngày):", labels)

        
        planned_map = {}
        actual_map = {}

        for wo in work_orders:
            a_dates = [d for d in [wo.actual_start_date, wo.actual_end_date] if d]
            if a_dates:
                final_day = max(a_dates)
                wo_final_day = str(final_day.date() if hasattr(final_day, "date") else getdate(final_day))

                planned_map[wo_final_day] = planned_map.get(wo_final_day, 0) + float(wo.qty or 0)
                actual_map[wo_final_day] = actual_map.get(wo_final_day, 0) + float(wo.produced_qty or 0)

                print(f"WO {wo} -> Final day: {wo_final_day}, "
                      f"Cộng qty={wo.qty}, produced_qty={wo.produced_qty}")

        planned = [planned_map.get(day, 0) for day in labels]
        actual = [actual_map.get(day, 0) for day in labels]

        print("Planned map:", planned_map)
        print("Actual map:", actual_map)
        print("Planned:", planned)
        print("Actual:", actual)

        result = {
            "labels": labels,
            "planned": planned,
            "actual": actual
        }
        break  # chỉ lấy WWO đầu tiên có dữ liệu

    return result





@frappe.whitelist()
def get_cumulative_actual_vs_planned(filters = None):
    _, data, _ = execute(filters or None)
    result = []
    for row in data:
        result.append({
            'cumulative_actual': row['cumulative_actual'],
            'cumulative_planned' : row['cumulative_planned']
        })
    return result
        
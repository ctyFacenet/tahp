# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.utils import getdate, nowdate
from datetime import timedelta
from collections import defaultdict

from frappe.utils import getdate, nowdate
from datetime import timedelta
import frappe
import json

def execute(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)
    filters = frappe._dict(filters or {})

    # --- 0. Lấy filter cơ bản ---
    month = filters.get("month", "Tất cả")
    year = int(filters.get("year", nowdate().split("-")[0]))
    view_mode = filters.get("view_mode", "Xem theo LSX Ca")  # "Xem theo ngày" hoặc mặc định

    if month == "Tất cả":
        from_date = getdate(f"{year}-01-01")
        to_date = getdate(f"{year}-12-31")
    else:
        month_num = int(month.replace("Tháng ", ""))
        from_date = getdate(f"{year}-{month_num:02d}-01")
        if month_num == 12:
            to_date = getdate(f"{year}-12-31")
        else:
            to_date = getdate(f"{year}-{month_num+1:02d}-01") - timedelta(days=1)

    # --- 1. Lấy Work Orders ---
    wo_conditions = ["docstatus = 1", "`workflow_state` != 'Đã bị dừng'"]
    if from_date and to_date:
        wo_conditions.append(f"planned_start_date BETWEEN '{from_date}' AND '{to_date}'")
    elif from_date:
        wo_conditions.append(f"planned_start_date >= '{from_date}'")
    elif to_date:
        wo_conditions.append(f"planned_start_date <= '{to_date}'")

    wo_sql = f"""
        SELECT name, planned_start_date, custom_shift
        FROM `tabWork Order`
        WHERE {" AND ".join(wo_conditions)}
        ORDER BY planned_start_date
    """
    wos = frappe.db.sql(wo_sql, as_dict=True)

    employees = frappe.db.get_all("Employee", fields=["name", "employee_name"])
    data_map = {
        e.name: {"employee": e.name, "employee_name": e.employee_name, "total_productivity": 0} for e in employees
    }
    
    for emp in data_map:
        for idx, wo in enumerate(wos):
            data_map[emp][f"wo_{idx}"] = 0
            data_map[emp][f"hidden_wo_{idx}"] = []

    if not wos:
        columns = [
            {"label": "Mã nhân viên", "fieldtype": "Link", "options": "Employee", "fieldname": "employee", "width": 300},
            {"label": "Tổng năng suất", "fieldtype": "Data", "fieldname": "total_productivity", "default": 0, "width": 200, "align": "center"}
        ]
        return columns, list(data_map.values())

    # --- 3. Lấy Job Card và Time Logs ---
    wo_names = [wo["name"] for wo in wos]
    jcs = frappe.db.sql("""
        SELECT name, work_order
        FROM `tabJob Card`
        WHERE work_order IN %(wo_names)s AND docstatus = 1
    """, {"wo_names": tuple(wo_names)}, as_dict=True)

    jc_names = [jc["name"] for jc in jcs]
    if not jc_names:
        columns = [
            {"label": "Mã nhân viên", "fieldtype": "Link", "options": "Employee", "fieldname": "employee", "width": 300},
            {"label": "Tổng năng suất", "fieldtype": "Data", "fieldname": "total_productivity", "default": 0, "width": 200, "align": "center"}
        ]
        return columns, list(data_map.values())

    jc_logs_all = frappe.db.sql("""
        SELECT parent AS job_card, from_time, to_time
        FROM `tabJob Card Time Log`
        WHERE parent IN %(jc_names)s
        ORDER BY parent, from_time ASC
    """, {"jc_names": tuple(jc_names)}, as_dict=True)

    logs_by_jc = {}
    for log in jc_logs_all:
        logs_by_jc.setdefault(log["job_card"], []).append(log)

    team_items_all = frappe.db.sql("""
        SELECT parent AS job_card, employee, from_time, `exit`
        FROM `tabJob Card Team Item`
        WHERE parent IN %(jc_names)s
        ORDER BY parent, from_time ASC
    """, {"jc_names": tuple(jc_names)}, as_dict=True)

    team_by_jc = {}
    for t in team_items_all:
        if not t["employee"]:
            continue
        team_by_jc.setdefault(t["job_card"], []).append(t)

    # --- 4. Tính năng suất theo Work Order ---
    for jc in jcs:
        jc_name = jc["name"]
        jc_logs = logs_by_jc.get(jc_name, [])
        if not jc_logs:
            continue
        jc_start = jc_logs[0]["from_time"]
        jc_end = jc_logs[0]["to_time"]
        total_time = (jc_end - jc_start).total_seconds() / 60
        if total_time <= 0:
            continue

        team_items = team_by_jc.get(jc_name, [])
        logs_by_emp = {}
        for t in team_items:
            emp = t["employee"]
            logs_by_emp.setdefault(emp, []).append(t)

        for emp, logs in logs_by_emp.items():
            logs_sorted = sorted(logs, key=lambda x: x["from_time"])
            total_emp_minutes = 0
            stack_start = None
            # Lưu Job Card vào hidden
            for idx, wo in enumerate(wos):
                if jc["work_order"] == wo["name"]:
                    data_map[emp][f"hidden_wo_{idx}"].append(jc_name)
                    fieldname = f"wo_{idx}"
                    break

            for rec in logs_sorted:
                if not rec["exit"]:
                    stack_start = rec["from_time"]
                else:
                    if stack_start:
                        minutes = (rec["from_time"] - stack_start).total_seconds() / 60
                        if minutes > 0:
                            total_emp_minutes += minutes
                        stack_start = None
            if stack_start:
                minutes = (jc_end - stack_start).total_seconds() / 60
                if minutes > 0:
                    total_emp_minutes += minutes

            percent = min(100, round((total_emp_minutes / total_time) * 100))
            data_map[emp][fieldname] += percent
            data_map[emp]["total_productivity"] += percent

    if view_mode == "Xem theo ngày":
        day_set = set()
        wo_to_day = {}
        for wo in wos:
            parts = wo["name"].split(".")
            if len(parts) >= 4:
                day_str = f"{parts[1]}-{parts[2]}-{parts[3]}"
                day_set.add(day_str)
                wo_to_day[wo["name"]] = day_str
        days = sorted(day_set)

        daily_columns = [{"label": day, "fieldtype": "Data", "fieldname": f"day_{day}", "width": 155, "align": "center"} for day in days]
        daily_data_map = {}
        for emp in data_map:
            daily_data_map[emp] = {"employee": emp, "employee_name": data_map[emp]["employee_name"], "total_productivity": data_map[emp]["total_productivity"]}
            for day in days:
                daily_data_map[emp][f"day_{day}"] = 0
                daily_data_map[emp][f"hidden_day_{day}"] = []
            for idx, wo in enumerate(wos):
                day = wo_to_day.get(wo["name"])
                if not day:
                    continue
                daily_data_map[emp][f"day_{day}"] += data_map[emp].get(f"wo_{idx}", 0)
                daily_data_map[emp][f"hidden_day_{day}"] += data_map[emp].get(f"hidden_wo_{idx}", [])

        columns = [
            {"label": "Mã nhân viên", "fieldtype": "Link", "options": "Employee", "fieldname": "employee", "width": 300},
            {"label": "Tổng năng suất", "fieldtype": "Data", "fieldname": "total_productivity", "default": 0, "width": 200, "align": "center"}
        ] + daily_columns

        data = list(daily_data_map.values())
        data.sort(key=lambda x: x.get("total_productivity", 0), reverse=True)
        for row in data:
            for day in days:
                key = f"day_{day}"
                row[key] = f"{row[key]} %" if row[key] else ""
                hidden_key = f"hidden_day_{day}"
                row[hidden_key] = str(row.get(hidden_key, [])) if row.get(hidden_key) else ""
                
            row["total_productivity"] = f"{row['total_productivity']} %" if row["total_productivity"] else ""

        return columns, data

    else:
        name_wos = []
        for idx, wo in enumerate(wos):
            name_wos.append({"label": wo["name"], "fieldtype": "Data", "fieldname": f"wo_{idx}", "width": 155, "align": "center"})
            name_wos.append({"label": f"{wo['name']} Hidden", "fieldtype": "Data", "fieldname": f"hidden_wo_{idx}", "hidden": 1})
        columns = [
            {"label": "Mã nhân viên", "fieldtype": "Link", "options": "Employee", "fieldname": "employee", "width": 300},
            {"label": "Tổng năng suất", "fieldtype": "Data", "fieldname": "total_productivity", "default": 0, "width": 200, "align": "center"}
        ] + name_wos

        data = list(data_map.values())
        data.sort(key=lambda x: x.get("total_productivity", 0), reverse=True)

        # Format %
        for row in data:
            for key, value in row.items():
                if key.startswith("wo_") and not key.startswith("hidden_"):
                    row[key] = f"{value} %" if value else ""
                elif key == "total_productivity":
                    row[key] = f"{value} %" if value else ""
            for idx in range(len(wos)):
                key = f"hidden_wo_{idx}"
                row[key] = str(row.get(key, [])) if row.get(key) else ""

        return columns, data

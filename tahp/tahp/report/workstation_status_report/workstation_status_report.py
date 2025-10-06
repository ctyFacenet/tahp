# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import datetime
import frappe
import json

def format_duration(value: int, mili: bool = True) -> str:
    seconds = value // 1000 if mili else value
    td = datetime.timedelta(seconds=seconds)

    days = td.days
    hours, remainder = divmod(td.seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    if days > 0:
        return f"{days} ngày {hours:02}:{minutes:02}:{secs:02}"
    else:
        return f"{hours:02}:{minutes:02}:{secs:02}"

def execute(filters=None, summary=False):
	columns = [
		{
			"fieldname": "workstation",
			"label": "Cụm thiết bị/Thiết bị",
			"fieldtype": "Data",
			"width": 250,
		},
		{
			"fieldname": "status",
			"label": "Trạng thái",
			"fieldtype": "Data",
			"width": 150,
			"align": "center"
		},
		{
			"fieldname": "modified",
			"label": "Thời gian cập nhật",
			"fieldtype": "Data",
			"width": 200,
			"align": "center"
		},
		{
			"fieldname": "shift",
			"label": "Ca gần nhất",
			"fieldtype": "Link",
			"options": "Shift",
			"width": 150,
			"align": "center"
		},
		{
			"fieldname": "active_time",
			"label": "Thời gian hoạt động",
			"fieldtype": "Data",
			"width": 120,
			"align": "center"
		},
		{
			"fieldname": "stop_time_overall",
			"label": "Tổng thời gian dừng",
			"fieldtype": "Data",
			"width": 110,
			"align": "center"
		},
		{
			"fieldname": "stop_time",
			"label": "Thời gian đang dừng",
			"fieldtype": "Data",
			"width": 120,
			"align": "center"
		},
		{
			"fieldname": "group_name",
			"label": "Phân loại lý do dừng",
			"fieldtype": "Data",
			"width": 200,
			"align": "center"
		},
		{
			"fieldname": "reason",
			"label": "Lý do dừng chi tiết",
			"fieldtype": "Data",
			"width": 250
		},
		{
			"fieldname": "employee",
			"label": "Người giám sát",
			"fieldtype": "Link",
			"options": "Employee",
			"width": 140,
			"align": "center"
		},
	]
	# --- Step 1: Gen sẵn cây cha-con từ Workstation ---
	workstations = frappe.db.get_all(
		"Workstation", 
		fields=["status","name","custom_parent","custom_is_parent", "modified"]
	)
	# if isinstance(filters, str): filters = json.loads(filters)
	if filters and filters.get("category"):
		category = filters["category"]
		routing_names = frappe.db.get_all(
			"Routing", 
			filters={"custom_category": category}, 
			pluck="name"
		)
		if routing_names:
			allowed_ws = set()
			for rname in routing_names:
				routing = frappe.get_doc("Routing", rname)
				for op in routing.operations:
					if op.workstation:
						allowed_ws.add(op.workstation)
			workstations = [ws for ws in workstations if ws.name in allowed_ws or ws.custom_parent in allowed_ws]

	result = []
	result_map = {}

	# dựng cha + con
	# --- Step 1: Gen sẵn cây cha-con từ Workstation ---
	parents = [ws for ws in workstations if ws.custom_is_parent]

	# dựng cha + con thật
	for parent in parents:
		parent_item = {
			"workstation": parent.name,
			"parent": None,
		}
		result.append(parent_item)

		children = [ws for ws in workstations if ws.custom_parent == parent.name]
		for child in children:
			child_item = {
				"workstation": child.name,
				"modified": child.modified.strftime("%d-%m-%Y %H:%M"),
				"indent": 1,
				"parent": parent.name,
			}
			status_map = {
				"Production": "Đang chạy",
				"Problem": "Sự cố",
				"Maintenance": "Bảo trì",
				"Off": "Đang tắt",
			}
			child_item["status"] = status_map[child.status]
			result.append(child_item)
			result_map[child.name] = child_item

	# tìm máy lẻ (không có parent và cũng không phải parent)
	orphans = [
		ws for ws in workstations
		if not ws.custom_parent and not ws.custom_is_parent
	]

	if orphans:
		# tạo cụm "Máy khác"
		other_parent = {
			"workstation": "Máy khác",
			"parent": None,
		}
		result.append(other_parent)
		parents.append(frappe._dict(name="Máy khác", custom_is_parent=True))  # giả cha

		for orphan in orphans:
			child_item = {
				"workstation": orphan.name,
				"modified": orphan.modified.strftime("%d-%m-%Y %H:%M"),
				"indent": 1,
				"parent": "Máy khác",
			}
			status_map = {
				"Production": "Đang chạy",
				"Problem": "Sự cố",
				"Maintenance": "Bảo trì",
				"Off": "Đang tắt",
			}
			child_item["status"] = status_map[orphan.status]
			result.append(child_item)
			result_map[orphan.name] = child_item


		# --- Step 2: Fill dữ liệu từ Job Card vào con ---
		# --- Lấy tất cả downtime và active một lượt ---
		downtimes = frappe.db.get_all(
			"Job Card Downtime Item",
			fields=["duration", "reason", "group_name", "workstation", "from_time", "parent"],
			order_by="from_time desc"
		)
		actives = frappe.db.get_all(
			"Job Card Workstation",
			fields=["start_time", "time", "workstation", "status", "parent"],
			order_by="start_time desc"
		)
		teams = frappe.db.get_all(
			"Job Card Team",
			fields=["employee", "parent"]
		)
		work_orders = {
			j.name: j.work_order for j in frappe.db.get_all(
				"Job Card",
				filters=[["docstatus", "!=", "2"]],
				fields=["name", "work_order"],
				order_by="creation desc"
			)
		}

		# --- Gom dữ liệu mới nhất theo workstation ---
		latest = {}
		for a in actives:
			ws = a.workstation
			if ws not in latest:  # chỉ lấy lần xuất hiện đầu tiên (mới nhất do order_by)
				latest[ws] = frappe._dict(
					active=a,
					downtime=next((d for d in downtimes if d.workstation == ws), None),
					downtime_overall = sum(int(d.duration if d.duration else 0) for d in downtimes if d.workstation == ws),
					team=next((t for t in teams if t.parent == a.parent), None),
					shift=frappe.db.get_value("Work Order", work_orders.get(a.parent), "custom_shift")
				)

		# --- Gán dữ liệu vào result_map ---
		for ws, data in latest.items():
			if ws not in result_map:
				continue
			item = result_map[ws]
			active = data.active
			downtime = data.downtime
			downtime_overall = data.downtime_overall
			team = data.team

			if active.status == "Dừng":
				item["status"] = "Tạm dừng"

			item["shift"] = data.shift
			item["active_time"] = format_duration(active.time)
			item["stop_time"] = format_duration(int(downtime.duration) if downtime and downtime.duration else 0, mili=False)
			item["stop_time_overall"] = format_duration(downtime_overall, mili=False)
			item["group_name"] = downtime.group_name if downtime else None
			item["reason"] = downtime.reason if downtime else None
			item["employee"] = team.employee if team else None


	# --- Step 3: Update status % cho cha ---
	for parent in parents:
		children = [row for row in result if row.get("indent") == 1 and row["parent"] == parent.name]
		total = len(children)
		running = len([c for c in children if c.get("status") == "Đang chạy"])
		parent_item = next(r for r in result if r["workstation"] == parent.name)
		if total > 0 and running > 0:
			percent = round(running / total * 100)
			parent_item["status"] = f"{percent}% Đang chạy"

	sorted_result = []
	for parent in parents:
		children = [r for r in result if r.get("indent") == 1 and r["parent"] == parent.name]
		parent_item = next(r for r in result if r["workstation"] == parent.name)

		group_has_running = any(c.get("status") == "Đang chạy" for c in children)
		priority_running = 0 if group_has_running else 1

		has_shift = bool(parent_item.get("shift") or any(c.get("shift") for c in children))
		priority_shift = 0 if has_shift else 1

		# riêng "Máy khác" vẫn được sort ưu tiên nếu có máy chạy
		sorted_result.append((priority_running, priority_shift, parent_item, children))

	sorted_result.sort(key=lambda x: (x[0], x[1]))

	# flatten lại
	final_result = []
	for _, _, parent_item, children in sorted_result:
		final_result.append(parent_item)
		final_result.extend(children)

	return columns, final_result

@frappe.whitelist()
def execute_summary(filters=None):
	filters = json.loads(filters)
	_, data = execute(filters=filters)
	parents = [row["workstation"] for row in data if not row.get("indent")]
	status_rows = [
		"% Máy khả dụng",
		"Đang chạy",
		"Tạm dừng",
		"Bảo trì",
		"Sự cố",
		"Đang tắt",
		"Tổng số máy",
	]

	columns = [{"fieldname": "status", "label": "Trạng thái", "fieldtype": "Data", "width": 180}]
	for parent in parents:
		columns.append({
			"fieldname": parent,
			"label": parent,
			"fieldtype": "Data",
			"width": 120,
			"align": "center"
		})

	result = []
	for row_label in status_rows:
		row_data = {"status": row_label}

		for parent in parents:
			children = [r for r in data if r.get("parent") == parent]  # lấy con theo parent
			total = len(children)

			counts = {
				"Đang chạy": 0,
				"Tạm dừng": 0,
				"Bảo trì": 0,
				"Sự cố": 0,
				"Đang tắt": 0,
			}
			for c in children:
				if c.get("status") in counts:
					counts[c["status"]] += 1

			if row_label == "% Máy khả dụng":
				available = counts["Đang chạy"] + counts["Đang tắt"]
				value = f"{int(available / total * 100)}%" if total > 0 else "0%"
			elif row_label == "Tổng số máy":
				value = total
			else:
				value = counts.get(row_label, 0)

			row_data[parent] = value

		result.append(row_data)
	return columns, result

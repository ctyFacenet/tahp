# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe

def execute(filters=None):
	columns = [
		{
			"fieldname": "workstation",
			"label": "Cụm thiết bị/Thiết bị",
			"fieldtype": "Data",
			"width": 120
		},
		{
			"fieldname": "statua",
			"label": "Trạng thái",
			"fieldtype": "Data",
			"width": 100
		},
		{
			"fieldname": "modified",
			"label": "Thời gian cập nhật",
			"fieldtype": "Data",
			"width": 100
		},
		{
			"fieldname": "shift",
			"label": "Ca gần nhất",
			"fieldtype": "Link",
			"options": "Shift"
		},
		{
			"fieldname": "active_time",
			"label": "Thời gian hoạt động",
			"fieldtype": "Time",
			"width": 100
		},
		{
			"fieldname": "stop_time",
			"label": "Thời gian dừng",
			"fieldtype": "Time",
			"width": 100
		},
		{
			"fieldname": "productivity",
			"label": "Hiệu suất sử dụng",
			"fieldtype": "Data",
			"width": 100
		},
		{
			"fieldname": "group_name",
			"label": "Phân loại lý do dừng",
			"fieldtype": "Data",
			"width": 100
		},
		{
			"fieldname": "reason",
			"label": "Lý do dừng chi tiết",
			"fieldtype": "Data",
			"width": 150
		},
		{
			"fieldname": "employee",
			"label": "Người giám sát",
			"fieldtype": "Link",
			"options": "Employee",
			"width": 100
		},
	]

	data = None
	print('hi')
	workstations = frappe.db.get_all("Workstation", fields=["status","name","custom_parent","custom_is_parent"])
	groups = dict()
	for workstation in workstations:
		if workstation.custom_is_parent:
			if workstation.name not in groups:
				groups[workstation.name] = []
			

	return columns, data

# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe


def execute(filters=None):
	columns, data = [], []
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
	]
	return columns, data

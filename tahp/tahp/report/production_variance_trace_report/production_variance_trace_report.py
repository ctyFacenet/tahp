# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from datetime import date, datetime, timedelta
import re


def execute(filters=None):
	if not filters:
		filters = {}

	# Convert week or month/year filter to date range
	filters = process_week_filter(filters)
	filters = process_month_year_filter(filters)

	columns = [
		{"label": "Ngày LSX Ca", "fieldname": "production_date", "fieldtype": "Date", "width": 150},
		{"label": "LSX Ca", "fieldname": "work_order", "fieldtype": "Link", "options": "Work Order", "width": 180},
		{"label": "Trưởng ca", "fieldname": "shift_leader", "fieldtype": "Link", "options": "Employee", "width": 150},
		{"label": "Thành phẩm gốc", "fieldname": "original_item", "fieldtype": "Data", "width": 250},
		{"label": "SL cần SX", "fieldname": "planned_qty", "fieldtype": "Data", "width": 130, "align": "right"},
		{"label": "Thành phẩm thực tế", "fieldname": "actual_item", "fieldtype": "Data", "width": 250},
		{"label": "SL thực tế", "fieldname": "actual_qty", "fieldtype": "Data", "width": 130, "align": "right"},
		{"label": "Đơn vị", "fieldname": "uom", "fieldtype": "Data", "width": 100, "align": "right"},
	]
	data = []

	# Build date conditions for SQL query
	date_conditions = ""
	if filters.get("from_date") and filters.get("to_date"):
		date_conditions = " AND DATE(wo.planned_start_date) BETWEEN %(from_date)s AND %(to_date)s"
	elif filters.get("from_date"):
		date_conditions = " AND DATE(wo.planned_start_date) >= %(from_date)s"
	elif filters.get("to_date"):
		date_conditions = " AND DATE(wo.planned_start_date) <= %(to_date)s"

	# Lấy danh sách Work Order Finished Item có type_posting = 'Thành phẩm sau QC'
	# Kèm theo thông tin Work Order để sort trước
	records = frappe.db.sql("""
		SELECT wof.name, wof.work_order, wo.planned_start_date
		FROM `tabWork Order Finished Item` wof
		LEFT JOIN `tabWork Order` wo ON wof.work_order = wo.name
		WHERE wof.type_posting = 'Thành phẩm sau QC'
		{date_conditions}
		ORDER BY wo.planned_start_date DESC
	""".format(date_conditions=date_conditions), filters, as_dict=1)

	for rec in records:
		# Lấy thông tin Work Order (thành phẩm gốc, số lượng cần sản xuất, ngày, trưởng ca)
		wo = frappe.db.get_value(
			"Work Order",
			rec.work_order,
			["planned_start_date", "custom_shift_leader", "production_item", "qty"],
			as_dict=1
		)
		if not wo:
			continue

		# Lấy tên thành phẩm gốc và đơn vị
		original_item_name, original_uom = frappe.db.get_value(
			"Item", wo.production_item, ["item_name", "stock_uom"]
		) or (wo.production_item, "")

		# Lấy danh sách thành phẩm thực tế từ child table
		items = frappe.db.get_all(
			"Work Order Finished Child",
			filters={"parent": rec.name},
			fields=["item_code", "qty"]
		)

		# Chỉ lấy các item có qty > 0
		items_nonzero = [item for item in items if item.qty and float(item.qty) > 0.0]
		if not items_nonzero:
			continue

		# Lấy thêm tên và đơn vị của từng item thực tế
		for item in items_nonzero:
			item_info = frappe.db.get_value(
				"Item", item.item_code, ["item_name", "stock_uom"]
			) or (item.item_code, "")
			item["item_name"] = item_info[0] if isinstance(item_info, tuple) else item_info
			item["stock_uom"] = item_info[1] if isinstance(item_info, tuple) else ""

		# Nếu chỉ có 1 thành phẩm thực tế VÀ trùng với thành phẩm gốc, hiển thị trực tiếp
		if len(items_nonzero) == 1 and items_nonzero[0].item_code == wo.production_item:
			single_item = items_nonzero[0]
			item_display = single_item.get("item_name") or single_item.item_code
			row = {
				"production_date": wo.planned_start_date,
				"work_order": rec.work_order,
				"shift_leader": wo.custom_shift_leader,
				"original_item": original_item_name,
				"planned_qty": f"{wo.qty:,.0f}" if wo.qty else "",
				"actual_item": item_display,
				"actual_qty": single_item.qty,
				"uom": single_item.get("stock_uom") or original_uom,
				"indent": 0,
			}
			data.append(row)
		else:
			# Tìm item trùng với thành phẩm gốc
			matching_item = None
			other_items = []
			for item in items_nonzero:
				if item.item_code == wo.production_item:
					matching_item = item
				else:
					other_items.append(item)

			# Dòng cha (Work Order) - hiển thị thành phẩm trùng gốc nếu có
			if matching_item:
				item_display = matching_item.get("item_name") or matching_item.item_code
				parent_row = {
					"production_date": wo.planned_start_date,
					"work_order": rec.work_order,
					"shift_leader": wo.custom_shift_leader,
					"original_item": original_item_name,
					"planned_qty": f"{wo.qty:,.0f}" if wo.qty else "",
					"actual_item": item_display,
					"actual_qty": matching_item.qty,
					"uom": matching_item.get("stock_uom") or original_uom,
					"indent": 0,
				}
			else:
				# Không có item trùng gốc, để trống cột thành phẩm thực tế
				parent_row = {
					"production_date": wo.planned_start_date,
					"work_order": rec.work_order,
					"shift_leader": wo.custom_shift_leader,
					"original_item": original_item_name,
					"planned_qty": f"{wo.qty:,.0f}" if wo.qty else "",
					"actual_item": "",
					"actual_qty": "",
					"uom": original_uom,
					"indent": 0,
				}
			data.append(parent_row)

			# Dòng con (các item thực tế khác) - hiển thị chi tiết từng item
			items_to_show = other_items if matching_item else items_nonzero
			for item in items_to_show:
				item_display = item.get("item_name") or item.item_code
				child_row = {
					"production_date": "",
					"work_order": "",
					"shift_leader": "",
					"original_item": "",
					"planned_qty": "",
					"actual_item": f"&nbsp;&nbsp;└ {item_display}",
					"actual_qty": item.qty,
					"uom": item.get("stock_uom") or "",
					"indent": 1,
				}
				data.append(child_row)

	return columns, data


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
				m = re.search(r"(\d+)", month)
				month_num = int(m.group(1)) if m else None
			else:
				month_num = int(month)

			if not month_num:
				return filters

			if not year:
				# fallback to current year
				year = datetime.now().year

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

# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WeekWorkOrder(Document):
	def before_save(doc):
		if not doc.plan and doc.get("__islocal"):
			try:
				plan = frappe.new_doc('WWO Plan')
				plan.insert(ignore_permissions=True)
				doc.plan = plan.get_title()
			except Exception as e:
				frappe.throw(f"Lỗi: {e}")
	# Kiểm tra trùng lặp LSX cùng ngày cùng ca
		start_times = [frappe.utils.get_datetime(row.planned_start_time).date() for row in doc.items if row.planned_start_time]
		end_times = [frappe.utils.get_datetime(row.planned_end_time).date() for row in doc.items if row.planned_end_time]

		if not start_times or not end_times:
			frappe.throw("LSX Tuần chưa khai báo đủ thời gian dự kiến bắt đầu/kết thúc")

		doc.calendar_start_date = min(start_times)
		doc.calendar_end_date = max(end_times)	
	# def before_insert(doc):
	# 	planned_start_date = doc.planned_start_date 
	# 	shift = doc.custom_shift
	# 	existing = frappe.db.get_all(
	# 		"Work Order",
	# 		filters={
	# 			"planned_start_date": frappe.utils.get_datetime(planned_start_date),
	# 			"custom_shift": shift
	# 		},
	# 		fields=["name"]
	# 	)

	# 	if existing:
	# 		frappe.throw(_(
	# 			f"Đã tồn tại LSX Ca ({existing[0].name}) cho ngày {planned_start_date} vào {shift}. "
	# 			"Vui lòng chọn ngày hoặc ca khác."
	# 		))
	def before_cancel(doc):
		doc.workflow_state = "Đã hủy bỏ"
	pass
# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class WeekWorkOrder(Document):
	def before_save(self):
		if not self.plan and self.get("__islocal"):
			# Tạo mới WWO Plan rỗng
			plan = frappe.new_doc('WWO Plan')
			plan.insert(ignore_permissions=True)

			if self.code_name:
				# Loại bỏ tag 'LSX' nếu có
				clean_code = self.code_name.replace("LSX.", "").replace(".LSX", "").replace("LSX", "")
				clean_code = clean_code.strip(".")  # loại bỏ dấu . thừa nếu có

				new_name = f"KHSX.{clean_code}"
				frappe.rename_doc("WWO Plan", plan.name, new_name, force=True)
				self.plan = new_name
			else:
				self.plan = plan.name

		if self.items:
			item_names = []
			start_times = []
			end_times = []

			for item in self.items:
				if item.item and item.item_name:
					item_names.append(item.item_name)
				if item.planned_start_time:
					start_times.append(item.planned_start_time)
				if item.planned_end_time:
					end_times.append(item.planned_end_time)

			self.start_date = min(start_times) if start_times else None
			self.end_date = max(end_times) if end_times else None
			self.item_list = ", ".join(item_names)

	def before_cancel(doc):
		doc.workflow_state = "Đã hủy bỏ"
	pass
# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.base_document import cached_property
from frappe.model.document import Document

class WeekWorkOrder(Document):

	def before_save(self):
		if not self.plan and self.get("__islocal") and not self.new_plan:
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

	def before_cancel(self):
		self.workflow_state = "Đã hủy bỏ"

@frappe.whitelist()
def stop(wwo):
	wwo_doc = frappe.get_doc("Week Work Order", wwo)
	wo_list = frappe.db.get_all("Work Order", {"custom_plan": wwo_doc.name}, pluck='name')
	for wo in wo_list:
		wo_doc = frappe.get_doc("Work Order", wo)
		if wo_doc.docstatus == 0:
			wo_doc.workflow_state = "Đã bị dừng"
			wo_doc.save()
		elif wo_doc.docstatus == 1:
			shift_leader = wo_doc.custom_shift_leader
			user = frappe.db.get_value("Employee", shift_leader, "user_id")
			if user:
				frappe.get_doc({
					"doctype": "Notification Log",
					"for_user": user,
					"subject": f"LSX Ca {wo_doc.name} bị yêu cầu <b style='font-weight:bold'>dừng lại</b>. Trưởng ca mau chóng hoàn thành các công đoạn và chốt sản lượng</b>",
					"email_content": f"LSX Ca {wo_doc.name} bị yêu cầu <b style='font-weight:bold'>dừng lại</b>. Trưởng ca mau chóng hoàn thành các công đoạn và chốt sản lượng</b>",
					"type": "Alert",
					"document_type": "Work Order",
					"document_name": wo_doc.name
				}).insert(ignore_permissions=True)

	wwo_doc.wo_status = "Stopped"
	wwo_doc.save(ignore_permissions=True)

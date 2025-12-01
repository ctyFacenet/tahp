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
def request_stop(wwo, reason):
	wwo_doc = frappe.get_doc("Week Work Order", wwo)
	director_list = frappe.db.get_all(
		"Has Role",
		filters={
			"role": "Giám đốc",
			"parenttype": "User"
		},
		fields=["parent as user"]
	)
	current_user_profile = frappe.db.get_value(
		"User",
		frappe.session.user,
		"role_profile_name"
	)

	subject = f"{current_user_profile} đã gửi <b style='font-weight:bold'>yêu cầu dừng LSX {wwo_doc.name}</b> tới Giám đốc. Lý do: {reason}"

	for user in director_list:
		if user.user:

			frappe.get_doc({
				"doctype": "Notification Log",
				"for_user": user.user,
				"subject": subject,
				"email_content": subject,
				"type": "Alert",
				"document_type": "Week Work Order",
				"document_name": wwo_doc.name
			}).insert(ignore_permissions=True)

	wwo_doc.add_comment(
		comment_type="Workflow",
		text=f"đã gửi <b style='font-weight:bold'>yêu cầu dừng LSX</b> tới Giám đốc. Lý do: {reason}"
	)

	wwo_doc.wo_status_saved = str(wwo_doc.wo_status)
	wwo_doc.requested_stop_by = frappe.session.user
	wwo_doc.wo_status = "Requested Stop"
	wwo_doc.save(ignore_permissions=True)

@frappe.whitelist()
def process_stop(wwo, choice, reason=None, standalone=False):
	wwo_doc = frappe.get_doc("Week Work Order", wwo)
	requester = wwo_doc.requested_stop_by
	subject = None

	if choice == "Accepted":
		if not standalone: subject = f"Yêu cầu dừng LSX {wwo_doc.name} đã được Giám đốc chấp nhận"
		wo_list = frappe.db.get_all("Work Order", {"custom_plan": wwo_doc.name}, pluck='name')
		sent_users = []
		for wo in wo_list:
			wo_doc = frappe.get_doc("Work Order", wo)
			if wo_doc.docstatus == 0:
				wo_doc.workflow_state = "Đã bị dừng"
				wo_doc.add_comment(
					comment_type="Workflow",
					text="Đã bị dừng"
				)
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
					sent_users.append(user)

		wwo_doc.wo_status = "Stopped"
		wwo_doc.add_comment(comment_type="Workflow", text="LSX đã bị dừng")

		sub_subject = None
		comment_text = None
		list_user = ["Phát triển công nghệ", "Quản đốc"]
		if reason:
			sub_subject = f"LSX {wwo_doc.name} bị Giám đốc yêu cầu <b style='font-weight:bold'>dừng lại</b>. Lý do: {reason}",
			comment_text = f"Giám đốc đã dừng LSX. Lý do: {reason}"
			list_user.append("Kế hoạch sản xuất")
		else:
			sub_subject = f"LSX {wwo_doc.name} bị Giám đốc yêu cầu <b style='font-weight:bold'>dừng lại</b>."
			comment_text = "Giám đốc đã dừng LSX."


		wwo_doc.add_comment(comment_type="Workflow", text=comment_text)
		outline_users = frappe.db.get_all("User", filters={"role_profile_name": ["in", list_user], "enabled": 1}, pluck="name")
		outline_users = [u for u in outline_users if u not in sent_users]
		outline_users = list(set(outline_users))		

		for u in outline_users:
			frappe.get_doc({
				"doctype": "Notification Log",
				"for_user": u,
				"subject": sub_subject,
				"email_content": sub_subject,
				"type": "Alert",
				"document_type": "Week Work Order",
				"document_name": wwo_doc.name
			}).insert(ignore_permissions=True)
	else:
		if reason:
			subject = f"Yêu cầu dừng LSX {wwo_doc.name} đã bị Giám đốc từ chối. Lý do: {reason}"
			comment_text = f"Giám đốc từ chối dừng. Lý do: {reason}"
		else:
			subject = f"Yêu cầu dừng LSX {wwo_doc.name} đã bị Giám đốc từ chối."
			comment_text = "Giám đốc từ chối dừng."

		wwo_doc.wo_status = wwo_doc.wo_status_saved
		wwo_doc.add_comment(comment_type="Workflow", text=comment_text)

	if not standalone:
		frappe.get_doc({
			"doctype": "Notification Log",
			"for_user": requester,
			"subject": subject,
			"email_content": subject,
			"type": "Alert",
			"document_type": "Week Work Order",
			"document_name": wwo_doc.name
		}).insert(ignore_permissions=True)

	wwo_doc.save(ignore_permissions=True)
	


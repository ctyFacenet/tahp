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

@frappe.whitelist()
def wwo_generate():
	plan = frappe.new_doc('WWO Plan')
	plan.insert(ignore_permissions=True)
	frappe.response['plan'] = plan.get_title()

@frappe.whitelist()
def check_wwo():
	detail = frappe.form_dict.detail
	if not detail:
		frappe.response['ok'] = True
		frappe.response['messages'] = []
	else:
		shortage = []
		entry_items = []
		detail = json.loads(detail)
		for row in detail:
			if row.get("scrap"):
				continue
			bom_name = row.get("bom")
			item_code = row.get("item")
			qty = frappe.utils.flt(row.get("qty") or 0)

			if not bom_name or not item_code or qty <= 0:
				continue
			try:
				bom_doc = frappe.get_doc("BOM", bom_name)
			except:
				shortage.append(f"BOM <b>{bom_name}</b> không tồn tại.")
				continue

			if not bom_doc.items:
				continue

			for bom_item in bom_doc.items:
				bom_ratio = frappe.utils.flt(bom_item.qty) / frappe.utils.flt(bom_doc.quantity)
				required_qty = qty * bom_ratio

				item_code_req = bom_item.item_code
				item_name_req = bom_item.item_name
				wh = None  # dòng detail không có source_warehouse nên ta buộc phải đi tìm

				# Lấy warehouse mặc định từ Item Group
				try:
					item_doc = frappe.get_doc("Item", item_code_req)
					ig = item_doc.item_group
					defaults = frappe.db.get_all("Item Default", 
						filters={"parent": ig}, 
						fields=["default_warehouse"], 
						limit_page_length=1)
					if defaults:
						wh = defaults[0].default_warehouse
				except:
					pass

				if not wh:
					shortage.append(f"Không tìm thấy kho mặc định cho nguyên liệu <b>{item_code_req}</b> trong nhóm <b>{ig}</b>")
					continue

				actual_qty = frappe.db.get_value("Bin", {
					"item_code": item_code_req,
					"warehouse": wh
				}, "actual_qty") or 0

				if actual_qty < required_qty:
					uom = bom_item.uom or "đơn vị"
					missing_qty = required_qty - actual_qty
					
					shortage.append({
						"nguyen_lieu": item_code_req,
						"item_name": item_name_req,
						"required": f"{required_qty:.2f} {uom}",
						"missing": f"{missing_qty:.2f} {uom}",
					})
					
					entry_items.append({
						"item_code": item_code_req,
						"item_name": item_name_req,
						"qty": missing_qty,
						"uom": uom,
						"t_warehouse": wh,
					})
		frappe.response['ok'] = not shortage
		frappe.response['messages'] = shortage
		frappe.response['entry_items'] = entry_items

@frappe.whitelist()
def wwo_notify():
	data = frappe.form_dict
	role = data.get("role")
	subject = data.get("subject")
	document_type = data.get("document_type")
	document_name = data.get("document_name")
	email_content = data.get("email_content") or "Vui lòng kiểm tra"

	params = {
		"role": role,
		"subject": subject,
		"document_type": document_type,
		"document_name": document_name
	}

	missing = [key for key, value in params.items() if not value]

	if missing:
		frappe.throw(f"Thiếu tham số: {', '.join(missing)}\n\nĐã truyền:\n" +
					"\n".join(f"- {k}: {v}" for k, v in params.items()))

	# Lấy danh sách user có role và đang hoạt động
	user_ids = frappe.db.get_all(
		"Has Role",
		filters={"role": role},
		fields=["parent"],
		distinct=True
	)
	user_ids = [u["parent"] for u in user_ids]

	active_users = frappe.db.get_all(
		"User",
		filters={"name": ["in", user_ids], "enabled": 1},
		pluck="name"
	)

	# Gửi thông báo
	if not active_users:
		frappe.response["ok"] = False
		frappe.response["message"] = "Không tìm thấy người dùng hoạt động có vai trò này"
	else:
		for user in active_users:
			frappe.get_doc({
				"doctype": "Notification Log",
				"for_user": user,
				"subject": subject,
				"email_content": email_content,
				"type": "Alert",
				"document_type": document_type,
				"document_name": document_name
			}).insert(ignore_permissions=True)
		frappe.response["ok"] = True
		frappe.response["message"] = f"Đã gửi thông báo đến {len(active_users)} người dùng"
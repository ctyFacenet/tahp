import frappe
from frappe import _
import json

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

@frappe.whitelist(methods=["GET", "POST"])
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
		

@frappe.whitelist()
def wwo_plan():
	plans = frappe.db.get_all('Week Work Order', 
        filters={'plan': frappe.form_dict.plan,  'docstatus': ['!=', 2]},
        fields=['name', 'workflow_state']
    )
	for plan in plans:
		plan['items'] = frappe.db.get_all(
			'Week Work Order Item', 
			filters={'parent': plan['name']}, 
			fields=['bom','item','name','planned_start_time','planned_end_time','qty','uom']
		)    
	frappe.response["message"] = plans

@frappe.whitelist()
def wwo_flow():
	wwo_name = frappe.form_dict.name
	new_status = frappe.form_dict.workflow

	def process_wwo_approval(wwo_name, new_status):
		def format_date(d):
			parts = str(d).split("-")
			if len(parts) == 3:
				return parts[2] + "-" + parts[1] + "-" + parts[0]
			return str(d)

		wwo = frappe.db.get_value("Week Work Order", wwo_name, ["workflow_state", "plan"], as_dict=1)
		if wwo.workflow_state != 'Đợi GĐ duyệt':
			return {"alert": True}

		if new_status == "Duyệt xong":
			wwo_doc = frappe.get_doc("Week Work Order", wwo_name)
			plan_doc = frappe.get_doc("WWO Plan", wwo.plan)
		
			# Lấy danh sách (item_group, start_date, end_date) của LSX đang duyệt
			this_items_info = []
			for row in wwo_doc.items:
				if row.planned_start_time and row.planned_end_time and row.item:
					item_group = frappe.db.get_value("Item", row.item, "item_group")
					if item_group:
						this_items_info.append({
							"item_group": item_group,
							"start": frappe.utils.get_datetime(row.planned_start_time).date(),
							"end": frappe.utils.get_datetime(row.planned_end_time).date(),
							"item": row.item
						})
		
			if not this_items_info:
				frappe.throw("Phát hiện LSX Tuần chưa khai báo đủ thời gian dự kiến hoặc chưa có nhóm hàng")
		
			all_wwos = frappe.get_all(
				"Week Work Order",
				filters=[["name", "!=", wwo_name], ["docstatus", "=", 1]],
				fields=["name"]
			)
		
			for other in all_wwos:
				other_doc = frappe.get_doc("Week Work Order", other.name)
				for row in other_doc.items:
					if not row.planned_start_time or not row.planned_end_time or not row.item:
						continue
		
					other_item_group = frappe.db.get_value("Item", row.item, "item_group")
					if not other_item_group:
						continue
		
					other_start = frappe.utils.get_datetime(row.planned_start_time).date()
					other_end = frappe.utils.get_datetime(row.planned_end_time).date()
		
					# So sánh với từng item trong LSX đang duyệt
					for this_item in this_items_info:
						# Nếu nhóm hàng trùng và khoảng thời gian trùng → cảnh báo
						if (
							this_item["item_group"] == other_item_group and
							other_start <= this_item["end"] and
							other_end >= this_item["start"]
						):
							other_link = frappe.utils.get_link_to_form("Week Work Order", other.name)
							this_link = frappe.utils.get_link_to_form("Week Work Order", wwo_name)
											
							other_item_name = frappe.db.get_value("Item", row.item, "item_name")
							this_item_name = frappe.db.get_value("Item", this_item["item"], "item_name")
		
							html_table = f"""
								<p>LSX Tuần đang duyệt có <b>ngày dự kiến thực hiện bị trùng</b> với LSX Tuần khác (cùng nhóm hàng). 
								Giám đốc có thể nhấn vào LSX Tuần cũ để xem và hủy nếu cần.</p>
								
								<!-- Desktop Table -->
								<div class="d-none d-md-block">
									<table class="table table-bordered">
										<thead>
											<tr>
												<th>LSX Tuần</th>
												<th>Mặt hàng</th>
												<th>Nhóm hàng</th>
												<th>Ngày bắt đầu</th>
												<th>Ngày kết thúc</th>
												<th>Trạng thái</th>
											</tr>
										</thead>
										<tbody>
											<tr style="background-color: #f8d7da;">
												<td>{other_link}</td>
												<td>{other_item_name} ({row.item})</td>
												<td>{other_item_group.split("-")[0].strip()}</td>
												<td>{format_date(other_start)}</td>
												<td>{format_date(other_end)}</td>
												<td>LSX bị trùng</td>
											</tr>
											<tr>
												<td>{this_link}</td>
												<td>{this_item_name} ({this_item["item"]})</td>
												<td>{this_item["item_group"].split("-")[0].strip()}</td>
												<td>{format_date(this_item["start"])}</td>
												<td>{format_date(this_item["end"])}</td>
												<td>LSX đang duyệt</td>
											</tr>
										</tbody>
									</table>
								</div>
								
								<!-- Mobile Card -->
								<div class="d-md-none">
									<div class="card mb-2" style="background-color: #f8d7da;">
										<div class="card-body">
											<p><b>LSX Tuần:</b> {other_link}</p>
											<p><b>Mặt hàng:</b> {other_item_name} ({row.item})</p>
											<p><b>Nhóm hàng:</b> {other_item_group.split("-")[0].strip()}</p>
											<p><b>Ngày bắt đầu:</b> {format_date(other_start)}</p>
											<p><b>Ngày kết thúc:</b> {format_date(other_end)}</p>
											<p><b>Trạng thái:</b> LSX bị trùng</p>
										</div>
									</div>
									<div class="card mb-2">
										<div class="card-body">
											<p><b>LSX Tuần:</b> {this_link}</p>
											<p><b>Mặt hàng:</b> {this_item_name} ({this_item["item"]})</p>
											<p><b>Nhóm hàng:</b> {this_item["item_group"].split("-")[0].strip()}</p>
											<p><b>Ngày bắt đầu:</b> {format_date(this_item["start"])}</p>
											<p><b>Ngày kết thúc:</b> {format_date(this_item["end"])}</p>
											<p><b>Trạng thái:</b> LSX đang duyệt</p>
										</div>
									</div>
								</div>
								"""
							return {"error_html": html_table}

			# Lấy toàn bộ WWO khác cùng plan (bao gồm chính nó)
			all_wwos_same_plan = frappe.get_all("Week Work Order", filters={"plan": wwo.plan}, fields=["name"])

			for other in all_wwos_same_plan:
				other_doc = frappe.get_doc("Week Work Order", other.name)
				for idx, row in enumerate(other_doc.items):
					approved = ""
					if idx == 0:
						if other.name == wwo_name:
							approved = "Duyệt xong"
						else:
							approved = "Không được chọn"
					plan_doc.append('items', {
						'wwo': other.name if idx == 0 else "",
						'approved': approved,
						'item': row.item,
						'qty': row.qty,
						'bom': row.bom,
						'planned_start_time': row.planned_start_time,
						'planned_end_time': row.planned_end_time
					})

				# Nếu là WWO bị loại → reset trạng thái và plan
				if other.name != wwo_name:
					other_doc.workflow_state = "Nháp"
					other_doc.plan = None
					other_doc.save();

			plan_doc.save()
			wwo_doc.submit()
			plan_doc.submit()

			return {"success": True}
		else:
			# frappe.db.set_value("Week Work Order", wwo_name, "workflow_state", new_status)
			other_doc = frappe.get_doc("Week Work Order", wwo_name)
			other_doc.workflow_state = new_status
			other_doc.save()
			return {"success": True}

	result = process_wwo_approval(wwo_name, new_status)
	frappe.response.update(result)
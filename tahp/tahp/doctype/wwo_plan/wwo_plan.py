# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class WWOPlan(Document):
	pass

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
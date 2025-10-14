import frappe
import json
from datetime import timedelta
from frappe.model.document import Document
from frappe.utils import now_datetime, get_datetime


class OperationTrackerInspection(Document):
	pass

def ceil_next_time(dt, min_delta_seconds=60):
	"""
	Làm tròn dt lên phút gần nhất và đảm bảo ít nhất min_delta_seconds so với from_time
	"""
	# loại bỏ giây/microsecond
	next_time = dt.replace(second=0, microsecond=0)
	
	# nếu còn phần giây, cộng thêm 1 phút
	if dt.second > 0 or dt.microsecond > 0:
		next_time += timedelta(minutes=1)
	
	return next_time

@frappe.whitelist()
def generate_inspection(job_card, operation, from_time):
	if isinstance(from_time, str):
		from_time = frappe.utils.get_datetime(from_time)  # đảm bảo from_time là datetime

	tracker = frappe.get_single("Operation Tracker")
	for row in tracker.items:
		if row.operation == operation:
			inspection = frappe.new_doc("Operation Tracker Inspection")
			inspection.job_card = job_card
			inspection.operation = operation
			inspection.start_time = from_time
			inspection.frequency = row.frequency
			# tính next_time với ceil và buffer tối thiểu 60s
			next_time = from_time + timedelta(minutes=row.frequency)
			inspection.next_time = ceil_next_time(next_time)
			# đảm bảo cách from_time ít nhất 60 giây
			if (inspection.next_time - from_time).total_seconds() < 60:
				inspection.next_time += timedelta(minutes=1)

			inspection.employee = row.employee

			if row.qc_template:
				template_doc = frappe.get_doc("Quality Inspection Template", row.qc_template)
				for spec in template_doc.item_quality_inspection_parameter:
					inspection.append("parameters", {
						"specification": spec.specification,
						"unit": spec.custom_unit
					})

			inspection.insert(ignore_permissions=True)

def add_inspection():
	now = now_datetime()
	inspections = frappe.db.get_all(
		"Operation Tracker Inspection",
		filters={"docstatus": 0},
		fields=["name", "next_time", "job_card", "operation"]
	)

	for insp in inspections:
		doc = frappe.get_doc("Operation Tracker Inspection", insp.name)
		jc_status = frappe.get_value("Job Card", doc.job_card, "docstatus")
		if jc_status != 0: continue
		if now < doc.next_time: continue
		doc.next_time = (now + timedelta(minutes=int(doc.frequency))).replace(second=0, microsecond=0)
		user, employee_name = frappe.db.get_value(
			"Employee",
			doc.employee,
			["user_id", "employee_name"]
		)
		frappe.get_doc({
			"doctype": "Notification Log",
			"for_user": user,
			"subject": f"Yêu cầu nhân viên {employee_name} tới công đoạn {doc.operation} lấy mẫu đo đạc",
			"email_content": "",
			"type": "Alert",
			"document_type": "Operation Tracker Inspection",
			"document_name": doc.name
		}).insert(ignore_permissions=True)
		
		doc.append("posts", {
			"created_date": now,
		})

		doc.save(ignore_permissions=True)

@frappe.whitelist()
def generate_input(inspection):
	doc = frappe.get_doc("Operation Tracker Inspection", inspection)
	now = now_datetime()
	if not doc.posts: return
	newest_post = doc.posts[-1]
	newest_post.checked_date = now
	for param in doc.parameters:
		doc.append("items", {
			"specification": param.specification,
			"parent_name": newest_post.name
		})
	doc.save(ignore_permissions=True)

@frappe.whitelist()
def update_params(inspection, items, parent_name=None, feedback=None):
	doc = frappe.get_doc("Operation Tracker Inspection", inspection)
	now = now_datetime()

	if isinstance(items, str):
		items = json.loads(items)

	# --- Cập nhật value cho từng specification ---
	for item in items:
		spec = item.get("specification")
		value = item.get("value")

		for row in doc.items:
			if row.specification == spec and row.parent_name == parent_name:
				row.value = value
				row.to_time = now
				break

	# --- Cập nhật feedback cho post nếu có ---
	if parent_name and feedback:
		for post in doc.posts:
			if post.name == parent_name:
				post.filled_date = now
				post.feedback = feedback
				break

		# --- Cập nhật custom_tracker trong Job Card ---
		jc_doc = frappe.get_doc("Job Card", doc.job_card)
		if not hasattr(jc_doc, "custom_tracker") or jc_doc.custom_tracker is None:
			jc_doc.custom_tracker = []

		jc_doc.append("custom_tracker", {
			"from_time": now,
			"feedback": feedback,
			"feedback_id": parent_name  # feedback_id = parent_name
		})
		jc_doc.save(ignore_permissions=True)

		# --- Gửi notification cho Shift Leader ---
		wo_doc = frappe.get_doc("Work Order", jc_doc.work_order)
		shift_leader = wo_doc.custom_shift_leader
		if shift_leader:
			user = frappe.db.get_value("Employee", shift_leader, "user_id")
			if user:
				frappe.get_doc({
					"doctype": "Notification Log",
					"for_user": user,
					"subject": f"Yêu cầu mới từ bộ phận đo đạc tại công đoạn <b style='font-weight:bold'>{doc.operation}</b>: {feedback}",
					"email_content": f"Yêu cầu mới từ bộ phận đo đạc tại công đoạn <b style='font-weight:bold'>{doc.operation}</b>: {feedback}",
					"type": "Alert",
					"document_type": "Job Card",
					"document_name": jc_doc.name
				}).insert(ignore_permissions=True)

	doc.save(ignore_permissions=True)

@frappe.whitelist()
def send_recommendation(inspection, items, operation=None):
	"""
	Trả về feedback gợi ý dựa trên Operation Tracker Evaluation.
	items: list of dicts [{specification, value}]
	Trả về string, mỗi feedback trên 1 dòng có gạch đầu dòng.
	"""
	if isinstance(items, str):
		import json
		items = json.loads(items)

	# Lấy tất cả evaluation
	evaluations = frappe.get_all(
		"Operation Tracker Evaluation",
		filters=[["operation", "in", [None, operation]]],
		fields=["specification", "evaluation", "value", "feedback"]
	)

	feedback_lines = []

	for item in items:
		spec = item.get("specification")
		val = item.get("value")

		for ev in evaluations:
			if ev.specification != spec:
				continue

			try:
				# ép kiểu float để so sánh số
				item_val = float(val)
				eval_val = float(ev.value)
			except (ValueError, TypeError):
				continue

			# Kiểm tra điều kiện
			op = ev.evaluation.strip()
			if op == ">" and item_val > eval_val:
				feedback_lines.append(f"{ev.feedback}")
			elif op == "<" and item_val < eval_val:
				feedback_lines.append(f"{ev.feedback}")
			elif op == "=" and item_val == eval_val:
				feedback_lines.append(f"{ev.feedback}")
			elif op in ["≥", ">="] and item_val >= eval_val:
				feedback_lines.append(f"{ev.feedback}")
			elif op in ["≤", "<="] and item_val <= eval_val:
				feedback_lines.append(f"{ev.feedback}")

	# loại bỏ các feedback rỗng
	feedback_lines = [line for line in feedback_lines if line.strip()]
	return ", ".join(feedback_lines)

@frappe.whitelist()
def check_qr(inspection, scanned):
	doc = frappe.get_doc("Operation Tracker Inspection", inspection)
	workstation = frappe.get_value("Operation", doc.operation, "workstation")
	if workstation:
		custom_qr = frappe.get_value("Workstation", workstation, "custom_qr")
		if custom_qr == scanned:
			return True
	return False
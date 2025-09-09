# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import json
from frappe.model.document import Document
from frappe.utils import now_datetime, add_to_date

class QualityCard(Document):
	pass

@frappe.whitelist()
def create_quality_card(work_order):
	qc_doc = frappe.new_doc("Quality Card")
	qc_doc.work_order = work_order
	
	wo_doc = frappe.get_doc("Work Order", work_order)

	for op in wo_doc.operations:
		tracker = frappe.db.get_all(
			"Operation Tracker",
			filters={
				"operation": op.operation,
			},
			fields=["name", "frequency","from_time"],
			order_by="creation desc",
			limit=1
		)
		if tracker:
			qc_doc.append('items',{
				"tracker": tracker[0].name,
				"frequency": tracker[0].frequency,
				"from_time": add_to_date(now_datetime(), minutes=tracker[0].from_time)
			})

	qc_doc.insert(ignore_permissions=True)


@frappe.whitelist()
def get_qc(work_order, tracker):
	operation = frappe.db.get_value("Operation Tracker", tracker, "operation")
	if not operation: return
	job_card = frappe.get_all( "Job Card",
		filters={
			"work_order": work_order,
			"operation": operation
		},
		fields=["name"],
		order_by="creation desc",
		limit=1
	)
	if not job_card: return None
	job_card_name = job_card[0].name
	qc = frappe.db.get_all(
		"Quality Inspection",
		filters={"reference_name": job_card_name},
		fields=["name"],
		limit=1
	)
	return qc[0].name if qc else None

@frappe.whitelist()
def start(quality_card, items): 
	if isinstance(items, str): items = json.loads(items)
	doc = frappe.get_doc("Quality Card", quality_card)
	doc.items = []
	for d in items:
		doc.append("items", {
			"employee": d.get("employee"),
			"tracker": d.get("tracker"),
			"frequency": d.get("frequency"),
			"is_done": d.get("is_done"),
			"from_time": d.get("from_time"),
		})
	doc.save(ignore_permissions=True)
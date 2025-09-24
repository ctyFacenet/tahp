# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from datetime import timedelta
from frappe.model.document import Document


class OperationTrackerInspection(Document):
	pass

@frappe.whitelist()
def generate_inspection(job_card, operation, from_time):
	tracker = frappe.get_single("Operation Tracker")
	for row in tracker.items:
		if row.operation == operation:
			inspection = frappe.new_doc("Operation Tracker Inspection")
			inspection.job_card = job_card
			inspection.operation = operation
			inspection.start_time = from_time
			inspection.frequency = row.frequency
			inspection.next_time = from_time + timedelta(minutes=row.frequency)
			inspection.insert(ignore_permissions=True)

@frappe.whitelist()
def add_inspection():
	print('hi')

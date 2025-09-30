# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class OperationTracker(Document):
	pass

@frappe.whitelist()
def is_qr_check():
	tracker = frappe.get_single("Operation Tracker")
	return tracker.is_qr

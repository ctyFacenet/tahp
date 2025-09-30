# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class ProblemReason(Document):
	pass

@frappe.whitelist()
def get():
    return frappe.get_single("Problem Reason")
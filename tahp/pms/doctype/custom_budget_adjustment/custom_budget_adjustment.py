# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CustomBudgetAdjustment(Document):
	def before_cancel(self):
		budget = frappe.get_doc("Custom Budget", self.budget)
		if self.adjustment_type == "Tăng":
			budget.increased_amount = max(budget.increased_amount - self.amount, 0)
		elif self.adjustment_type == "Giảm":
			budget.actual_amount = max(budget.actual_amount - self.amount, 0)
		budget.save(ignore_permissions=True)

	def on_submit(self):
		budget = frappe.get_doc("Custom Budget", self.budget)
		if self.adjustment_type == "Tăng":
			budget.increased_amount += self.amount
		elif self.adjustment_type == "Giảm":
			budget.actual_amount += self.amount
		budget.save(ignore_permissions=True)
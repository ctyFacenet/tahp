# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CustomBudget(Document):
	@property
	def total_planned_amount(self):
		return self.initial_budget + self.increased_amount - self.planned_amount - self.actual_amount
	
	@property
	def total_actual_amount(self):
		return self.initial_budget + self.increased_amount - self.actual_amount
	  

@frappe.whitelist()
def process_budget_adjustment(budget_name, adjustment_type, adjust_amount, account):
	adjust_amount = float(adjust_amount)
	doc = frappe.new_doc("Custom Budget Adjustment")
	doc.budget = budget_name
	doc.adjustment_type = adjustment_type
	doc.amount = adjust_amount
	doc.posting_date = frappe.utils.today()
	doc.account = account
	doc.link_doctype = "Custom Budget"
	doc.link_name = budget_name
	doc.insert().submit()
	if doc.name: return {"success": True}
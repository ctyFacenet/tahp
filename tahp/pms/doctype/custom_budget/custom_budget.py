# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CustomBudget(Document):
	pass


@frappe.whitelist()
def process_budget_adjustment(budget_name, adjustment_type, adjust_amount):
    """
    Process budget adjustment: create adjustment record and update budget
    
    Args:
        budget_name: Custom Budget name
        adjustment_type: "Giảm" (decrease) or "Tăng" (increase)
        adjust_amount: Adjustment amount
    """
    adjust_amount = float(adjust_amount)
    
    if adjust_amount <= 0:
        frappe.throw("Số tiền điều chỉnh phải lớn hơn 0")
    
    budget_doc = frappe.get_doc("Custom Budget", budget_name)
    
    if budget_doc.docstatus != 1:
        frappe.throw("Chỉ có thể điều chỉnh ngân sách đã được submit")
    
    adjustment_doc = frappe.get_doc({
        "doctype": "Custom Budget Adjustment",
        "budget": budget_name,
        "adjustment_type": adjustment_type,
        "amount": adjust_amount,
        "posting_date": frappe.utils.today()
    })
    adjustment_doc.insert()
    adjustment_doc.submit()
    
    print(f"Created and submitted adjustment: {adjustment_doc.name}, Type: {adjustment_type}, Amount: {adjust_amount}")
    
    if adjustment_type == "Giảm":
        budget_doc.planned_amount = (budget_doc.planned_amount or 0) + adjust_amount
        budget_doc.actual_amount = (budget_doc.actual_amount or 0) + adjust_amount
        print(f"Updated planned_amount: {budget_doc.planned_amount}, actual_amount: {budget_doc.actual_amount}")
        
    elif adjustment_type == "Tăng":
        budget_doc.increased_amount = (budget_doc.increased_amount or 0) + adjust_amount
        print(f"Updated increased_amount: {budget_doc.increased_amount}")
    
    budget_doc.flags.ignore_validate_update_after_submit = True
    budget_doc.save(ignore_permissions=True)
    
    return {
        "success": True,
        "message": "Điều chỉnh ngân sách thành công",
        "adjustment_id": adjustment_doc.name,
        "budget": budget_doc.as_dict()
    }
import frappe
import json

@frappe.whitelist()
def autofill_item_rate(item_code, supplier=None):
    filters = {"item_code": item_code}
    if supplier: filters["supplier"] = supplier
    rates = frappe.db.get_all("Supplier Item Rate", filters=filters, fields=["rate", "origin"], order_by="creation desc", limit=1)
    if rates: return rates[0]

@frappe.whitelist()
def get_budget_from_purpose(purposes): 
    result = []
    if isinstance(purposes, str): purposes = json.loads(purposes)
    purposes = list(set(purposes))
    for purpose in purposes:
        account = frappe.db.get_value("Purchase Purpose", purpose, "account")
        budgets = frappe.db.get_all("Custom Budget", filters={"account": account}, limit=1)
        if budgets:
            doc = frappe.get_doc("Custom Budget", budgets[0].name)
            result.append({"purpose": purpose, "budget": doc})
    return result
    

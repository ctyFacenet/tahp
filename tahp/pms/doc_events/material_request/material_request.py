import frappe

@frappe.whitelist()
def autofill_employee():
    user = frappe.session.user
    if user:
        employee = frappe.db.get_value("Employee", {"user_id": user}, ["name", "employee_name", "department"], as_dict=True)
        return employee
    
@frappe.whitelist()
def autofill_purpose(item_code):
    return frappe.db.get_value("Purchase Purpose Mapping", {"item_code": item_code}, "purchase_purpose")
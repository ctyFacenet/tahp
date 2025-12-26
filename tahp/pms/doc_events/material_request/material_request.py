import frappe

@frappe.whitelist()
def autofill_employee():
    user = frappe.session.user
    if user:
        employee = frappe.get_value("Employee", {"user_id": user}, ["name", "employee_name", "department"], as_dict=True)
        return employee
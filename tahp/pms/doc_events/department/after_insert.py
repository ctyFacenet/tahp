import frappe

def after_insert(doc, method):
    parent = frappe.db.get_value("Cost Center", {"cost_center_name": doc.company})
    if not parent or frappe.db.exists("Cost Center", {"cost_center_name": doc.department_name, "company": doc.company}): return
    frappe.get_doc({
        "doctype": "Cost Center",
        "cost_center_name": doc.department_name,
        "parent_cost_center": parent,
        "company": doc.company,
        "is_group": 0,
    }).insert(ignore_permissions=True)


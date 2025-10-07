import frappe

@frappe.whitelist()
def get_warehouse(item_code):
    item_group = frappe.db.get_value("Item", item_code, "item_group")
    warehouse = frappe.db.get_value(
        "Item Default",
        {"parent": item_group},
        "default_warehouse"
    )
    return warehouse
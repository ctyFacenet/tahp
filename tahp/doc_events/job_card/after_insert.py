import frappe

def after_insert(doc, method):
    print('hello')
    settings = frappe.get_single("Manufacturing Settings")

    if not doc.wip_warehouse:
        doc.wip_warehouse = settings.default_wip_warehouse
        doc.save(ignore_permissions=True)
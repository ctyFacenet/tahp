import frappe

def on_submit(doc, method):
    for item in doc.items:
        if item.custom_purchase_purpose:
            exists = frappe.db.exists("Purchase Purpose Mapping", {"item_code": item.item_code, "purchase_purpose": item.custom_purchase_purpose})
            if not exists:
                purpose = frappe.new_doc("Purchase Purpose Mapping")
                purpose.item_code = item.item_code
                purpose.purchase_purpose = item.custom_purchase_purpose
                purpose.save(ignore_permissions=True)
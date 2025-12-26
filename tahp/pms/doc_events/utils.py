import frappe

@frappe.whitelist()
def autofill_item_rate(item_code, supplier=None):
    filters = {"item_code": item_code}
    if supplier: filters["supplier"] = supplier
    rates = frappe.db.get_all("Item Price", filters=filters, fields=["rate", "origin"], order_by="creation desc", limit=1)
    if rates: return rates[0]
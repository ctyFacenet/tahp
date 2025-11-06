import frappe

def on_trash(doc, method):
    if doc.docstatus != 0: return
    if not doc.custom_plan: return
    wwo_doc = frappe.get_doc("Week Work Order", doc.custom_plan)
    other_wos = frappe.db.count(
        "Work Order",
        {
            "custom_plan": doc.custom_plan,
            "name": ["!=", doc.name],
        }
    )
    if other_wos == 0:
        wwo_doc.db_set("wo_status", "")
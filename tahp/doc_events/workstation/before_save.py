import frappe

def before_save(doc, method):
    if doc.custom_is_parent:
        if doc.status in ["Problem", "Maintenance"]:
            children = frappe.get_all(
                "Workstation",
                filters={"custom_parent": doc.name},
                fields=["name", "status"]
            )

            for child in children:
                child_doc = frappe.get_doc("Workstation", child["name"])
                if child_doc.status != doc.status:
                    child_doc.status = doc.status
                    child_doc.save(ignore_permissions=True)


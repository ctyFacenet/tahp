import os
import json
import frappe

def cleanup_custom():
    app_path = frappe.get_app_path("tahp")
    custom_path = os.path.join(app_path,"tahp","custom")
    result = dict()
    for row in os.listdir(custom_path):
        dir = os.path.join(custom_path, row)
        with open(dir) as file:
            custom_data = json.load(file)
            dt = custom_data["doctype"]
            result[dt] = []
            for row in custom_data["custom_fields"]:
                if row["fieldname"].startswith("custom"):
                    result[dt].append(row["fieldname"])
    
    db_custom_fields = frappe.db.get_all(
        "Custom Field",
        fields=["name", "dt", "fieldname"]
    )
    for field in db_custom_fields:
        dt = field["dt"]
        fname = field["fieldname"]

        if dt in result and fname not in result[dt]:
            print(f"Deleting unused Custom Field: {dt}.{fname}")
            frappe.delete_doc("Custom Field", field["name"], force=1)

    frappe.db.commit()
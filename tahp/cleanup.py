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
                result[dt].append(row["fieldname"])
    
    db_custom_fields = frappe.db.get_all(
        "Custom Field",
        fields=["name", "dt", "fieldname"]
    )
    for field in db_custom_fields:
        dt = field["dt"]
        fname = field["fieldname"]

        if dt in result and fname not in result[dt] and fname != "workflow_state":
            print(f"Deleting unused Custom Field: {dt}.{fname}")
            frappe.delete_doc("Custom Field", field["name"], force=1)

    # --- Kiểm tra và tắt Use Perpetual Inventory ---
    company = frappe.db.get_single_value("Global Defaults", "default_company")
    if company:
        use_perpetual = frappe.db.get_value("Company", company, "enable_perpetual_inventory")
        if use_perpetual:
            print(f"Tắt Use Perpetual Inventory cho công ty: {company}")
            frappe.db.set_value("Company", company, "enable_perpetual_inventory", 0)
            frappe.db.commit()
        else:
            print(f"Use Perpetual Inventory đã tắt sẵn cho công ty: {company}")
    else:
        print("Không tìm thấy công ty mặc định trong Global Defaults")

    percentage_values = ["0%", "25%", "50%", "75%", "100%"]
    shift_list = frappe.get_all("Shift Handover", fields=["name"])

    for sh in shift_list:
        doc = frappe.get_doc("Shift Handover", sh.name)

        for row in doc.table:
            fields_to_update = {}

            if row.status not in percentage_values and row.status == "Tốt":
                fields_to_update["status"] = "100%"

            if row.safe not in percentage_values and row.safe == "Đạt":
                fields_to_update["safe"] = "100%"

            if row.clean not in percentage_values and row.clean == "Sạch":
                fields_to_update["clean"] = "100%"

            if fields_to_update:
                frappe.db.set_value(
                    row.doctype,
                    row.name,
                    fields_to_update
                )

    routings = frappe.db.get_all("Routing", fields=["name"])
    TARGET_OPS = ["Lọc tách chân không", "Sấy"]
    for r in routings:
        doc = frappe.get_doc("Routing", r.name)
        updated = False
        for op in doc.operations:
            if op.custom_is_finished_operation: break
            if op.operation in TARGET_OPS:
                op.custom_is_finished_operation = 1
                updated = True
        if updated: doc.save()

    frappe.db.commit()

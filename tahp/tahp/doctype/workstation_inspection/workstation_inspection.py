# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from tahp.doc_events.job_card.job_card import update_workstations

class WorkstationInspection(Document):
    def on_submit(self):
        items = self.get("items")
        item_status_map = {d.workstation: d.status for d in items}
        parents = [d for d in items if d.heading]
        on_refresh = {}

        for parent in parents:
            parent_doc = frappe.get_doc("Workstation", parent.workstation)
            if parent_doc.custom_is_parent:
                children = frappe.db.get_all(
                    "Workstation",
                    filters={"custom_parent": parent.workstation},
                    fields=["name"]
                )

                children_statuses = [
                    item_status_map.get(ch["name"])
                    for ch in children
                    if item_status_map.get(ch["name"])
                ]

                if children_statuses:
                    if all(st == "Hỏng" for st in children_statuses):
                        parent_doc.status = "Problem"
                    else:
                        if parent_doc.status == "Problem":
                            parent_doc.status = "Off"
            else:
                parent_doc.status = "Problem" if parent.status == "Hỏng" else "Off"
                if parent.status != "Problem":
                    job_cards = frappe.db.get_all(
                        "Job Card",
                        filters={"docstatus": 0},
                        fields=["name"]
                    )
                    for jc in job_cards:
                        jc_doc = frappe.get_doc("Job Card", jc.name)
                        for row in jc_doc.custom_workstation_table or []:
                            if row.start_time and row.workstation == parent.workstation and row.status == "Hỏng":
                                if jc.name not in on_refresh:
                                    on_refresh[jc.name] = [row.workstation]
                                else:
                                    on_refresh[jc.name].append(row.workstation)
            parent_doc.save(ignore_permissions=True)

        children_items = [d for d in items if not d.heading]

        for ch in children_items:
            ws_doc = frappe.get_doc("Workstation", ch.workstation)
            if ws_doc.custom_parent:
                parent_status = frappe.db.get_value("Workstation", ws_doc.custom_parent, "status")
                if parent_status == "Problem":
                    continue
            if ch.status == "Hỏng":
                ws_doc.status = "Problem"
            elif ch.status == "Bình thường":
                if ws_doc.status == "Problem":
                    ws_doc.status = "Off"
                    job_cards = frappe.db.get_all(
                        "Job Card",
                        filters={"docstatus": 0},
                        fields=["name"]
                    )
                    for jc in job_cards:
                        jc_doc = frappe.get_doc("Job Card", jc.name)
                        for row in jc_doc.custom_workstation_table or []:
                            if row.start_time and row.workstation == ch.workstation and row.status == "Hỏng":
                                if jc.name not in on_refresh:
                                    on_refresh[jc.name] = [row.workstation]
                                else:
                                    on_refresh[jc.name].append(row.workstation)
            ws_doc.save(ignore_permissions=True)

        if on_refresh:
            for jc, ws in on_refresh.items():
                prepare = []
                for row in ws:
                    prepare.append({"workstation": row, "status": "Chạy"})
                update_workstations(jc, prepare)


@frappe.whitelist()
def workstation_query(doctype, txt, searchfield, start, page_len, filters):
    return frappe.db.sql("""
        SELECT name
        FROM `tabWorkstation`
        WHERE custom_is_parent = 1 OR custom_parent IS NULL
        ORDER BY name
        LIMIT %s, %s
    """, (start, page_len))

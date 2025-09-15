import frappe

@frappe.whitelist()
def get_workspace():
    workspaces = frappe.db.get_all("Workspace")
    result = []

    for workspace in workspaces:
        ws = frappe.get_doc("Workspace", workspace)

        if ws.is_hidden == 0:
            cleaned_links = []
            for link in ws.links:
                cleaned_links.append({
                    "label": link.label,
                    "link_to": link.link_to,
                    "link_type": link.link_type,
                    "type": link.type,
                    "is_query_report": link.is_query_report,
                    "onboard": link.onboard,
                    "hidden": link.hidden,
                    "idx": link.idx,
                    "doctype": link.doctype,
                })

            result.append({
                "name": ws.name,
                "links": cleaned_links,
                "shortcuts": ws.shortcuts,
            })

    return result
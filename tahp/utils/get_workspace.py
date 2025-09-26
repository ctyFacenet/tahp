import frappe

@frappe.whitelist()
def get_workspace():
    workspaces = frappe.db.get_all("Workspace")
    result = []

    for workspace in workspaces:
        ws = frappe.get_doc("Workspace", workspace)

        if ws.is_hidden == 0:
            # Duyệt và làm sạch các links
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
                    "idx": link.idx
                })

            # Shortcut không được yêu cầu xử lý, giữ nguyên
            result.append({
                "name": ws.name,
                "links": cleaned_links,
                "shortcuts": ws.shortcuts
            })

    return result

import frappe

@frappe.whitelist()
def find_workspace(page_name: str):
    """
    Truyền vào tên 1 page, trả về danh sách workspace có shortcut tới page đó.
    """
    workspaces = frappe.get_all("Workspace", filters={"is_hidden": 0}, pluck="name")
    result = []

    for ws_name in workspaces:
        ws = frappe.get_doc("Workspace", ws_name)

        for sc in ws.shortcuts:
            if sc.type == "DocType" and sc.link_to == page_name:
                return ws.name

# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe import _

def get_columns():
    """Định nghĩa các cột của báo cáo"""
    return [
        {
            "label": _("Week Work Order"),
            "fieldname": "name",
            "fieldtype": "Link",
            "options": "Week Work Order",
            "width": 200,
            "align": "left"
            
        },
        {
            "label": _("Ngày bắt đầu"),
            "fieldname": "start_date",
            "fieldtype": "Date",
            "width": 160,
            "align": "left"
        },
        {
            "label": _("Ngày kết thúc"),
            "fieldname": "end_date",
            "fieldtype": "Date",
            "width": 160,
            "align": "left"
        },
        {
            "label": _("Người bình luận"),
            "fieldname": "owner",
            "fieldtype": "Data",
            "width": 190,
            "align": "left"
        },
        {
            "label": _("Nội dung bình luận (Click để xem chi tiết)"),
            "fieldname": "comment",
            "fieldtype": "Small Text",
            "width": 400,
            "align": "left"
        },
        {
            "label": _("Ngày bình luận"),
            "fieldname": "comment_date",
            "fieldtype": "Datetime",
            "width": 210,
            "align": "left"
        }
    ]


def get_data(filters):
    """Lấy dữ liệu Week Work Order và Comments"""
    
    wwo_filters = {"docstatus": ["<", 2]}
    
    if filters.get("start_date"):
        wwo_filters["start_date"] = [">=", filters.get("start_date")]
    
    if filters.get("end_date"):
        wwo_filters["end_date"] = ["<=", filters.get("end_date")]
    
    if filters.get("week_work_order"):
        wwo_filters["name"] = filters.get("week_work_order")
    
    # Lấy danh sách Week Work Order
    week_work_orders = frappe.get_all(
        "Week Work Order",
        filters=wwo_filters,
        fields=["name", "start_date", "end_date"],
        order_by="start_date desc, name desc"
    )
    
    if not week_work_orders:
        return []
    
    result = []
    
    wwo_names = [wwo.name for wwo in week_work_orders]
    all_comments = frappe.get_all(
        "Comment",
        filters={
            "reference_doctype": "Week Work Order",
            "reference_name": ["in", wwo_names],
            "comment_type": "Comment"
        },
        fields=["reference_name", "owner", "content", "creation"],
        order_by="reference_name, creation asc"
    )
    
    # Lấy full_name của tất cả users
    user_names = list(set([comment.owner for comment in all_comments]))
    user_full_names = {}
    
    if user_names:
        users = frappe.get_all(
            "User",
            filters={"name": ["in", user_names]},
            fields=["name", "full_name"]
        )
        user_full_names = {user.name: user.full_name for user in users}
    
    comments_by_wwo = {}
    for comment in all_comments:
        ref_name = comment.reference_name
        if ref_name not in comments_by_wwo:
            comments_by_wwo[ref_name] = []
        comments_by_wwo[ref_name].append(comment)
    
    for wwo in week_work_orders:
        result.append({
            "name": wwo.name,
            "start_date": wwo.start_date,
            "end_date": wwo.end_date,
            "owner": "",
            "comment": "",
            "comment_date": "",
            "indent": 0
        })
        
        # Thêm các comments (con - indent 1)
        wwo_comments = comments_by_wwo.get(wwo.name, [])
        for comment in wwo_comments:
            content = frappe.utils.strip_html_tags(comment.content or "")
            
            owner_display = user_full_names.get(comment.owner, comment.owner)
            
            result.append({
                "name": "",
                "start_date": "",
                "end_date": "",
                "owner": owner_display,
                "comment": content,
                "comment_date": comment.creation,
                "indent": 1
            })
    
    return result


def execute(filters=None):
    """Báo cáo thống kê bình luận của Week Work Order"""
    
    columns = get_columns()
    data = get_data(filters)
    
    return columns, data
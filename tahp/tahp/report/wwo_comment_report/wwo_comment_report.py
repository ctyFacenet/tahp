import frappe
from frappe import _
from frappe.utils import strip_html_tags

def get_columns():
    return [
        {
            "label": _("Kế hoạch"),
            "fieldname": "plan_link",
            "fieldtype": "Dynamic Link",
            "options": "plan_type",
            "width": 250,
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
            "label": _("Ngày bình luận"),
            "fieldname": "comment_date",
            "fieldtype": "Datetime",
            "width": 210,
            "align": "left"
        },
        {
            "label": _("Nội dung bình luận"),
            "fieldname": "comment",
            "fieldtype": "Small Text",
            "width": 700,
            "align": "left"
        },

    ]

def get_data(filters):
    result = []

    # --- 1. Lấy WWO không new_plan ---
    wwo_filters = {"docstatus": ["<", 2], "new_plan": ["is", "not set"]}
    if filters.get("start_date"):
        wwo_filters["start_date"] = [">=", filters.get("start_date")]
    if filters.get("end_date"):
        wwo_filters["end_date"] = ["<=", filters.get("end_date")]

    week_work_orders = frappe.get_all(
        "Week Work Order",
        filters=wwo_filters,
        fields=["name", "start_date", "end_date"],
        order_by="start_date desc, name desc"
    )

    # --- 2. Lấy Custom Planner ---
    planners = frappe.get_all(
        "Custom Planner",
        fields=["name"],
        order_by="name desc"
    )

    # --- 3. Chuẩn bị indent=0 items ---
    plans = []

    # WWO không new_plan
    for wwo in week_work_orders:
        plans.append({
            "plan_link": wwo.name,
            "plan_type": "Week Work Order",
            "start_date": wwo.start_date,
            "end_date": wwo.end_date,
            "indent": 0
        })

    # Custom Planner: tính start/end từ child table
    planner_dates = {}
    for planner in planners:
        items = frappe.get_all(
            "Custom Planner Item",
            filters={"parent": planner.name},
            fields=["start_date", "end_date"]
        )
        if items:
            start_dates = [i.start_date for i in items if i.start_date]
            end_dates = [i.end_date for i in items if i.end_date]
            planner_dates[planner.name] = {
                "start_date": min(start_dates) if start_dates else None,
                "end_date": max(end_dates) if end_dates else None
            }
        else:
            planner_dates[planner.name] = {"start_date": None, "end_date": None}

    for planner in planners:
        dates = planner_dates.get(planner.name, {})
        plans.append({
            "plan_link": planner.name,
            "plan_type": "Custom Planner",
            "start_date": dates.get("start_date"),
            "end_date": dates.get("end_date"),
            "indent": 0
        })

    # --- 4. Sort tất cả indent=0 theo start_date giảm dần ---
    plans.sort(key=lambda x: x["start_date"] or "", reverse=True)
    result.extend(plans)

    # --- 5. Lấy tất cả comment (WWO không plan + Custom Planner + WWO có new_plan) ---
    all_plan_names = [p["plan_link"] for p in plans if p["plan_link"]]

    # WWO có new_plan trùng Custom Planner
    planner_names = [p.name for p in planners]
    wwo_with_new_plan = frappe.get_all(
        "Week Work Order",
        filters={"new_plan": ["in", planner_names], "docstatus": ["<", 2]},
        fields=["name", "new_plan"]
    )
    wwo_new_plan_map = {w.name: w.new_plan for w in wwo_with_new_plan}
    wwo_with_new_plan_names = [w.name for w in wwo_with_new_plan]

    # Lấy comment indent=1
    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_name": ["in", all_plan_names + wwo_with_new_plan_names],
            "comment_type": "Comment"
        },
        fields=["reference_name", "owner", "content", "creation", "reference_doctype"],
        order_by="creation asc"
    )

    # Lấy full_name user
    user_names = list(set([c.owner for c in comments]))
    user_full_names = {}
    if user_names:
        users = frappe.get_all(
            "User",
            filters={"name": ["in", user_names]},
            fields=["name", "full_name"]
        )
        user_full_names = {u.name: u.full_name for u in users}

    # Nhóm comment theo plan
    comments_by_plan = {}
    for c in comments:
        if c.reference_doctype == "Custom Planner":
            plan_name = c.reference_name
        elif c.reference_doctype == "Week Work Order":
            plan_name = wwo_new_plan_map.get(c.reference_name, c.reference_name)
        else:
            plan_name = c.reference_name
        comments_by_plan.setdefault(plan_name, []).append(c)

    # --- 6. Thêm comment vào result theo plan đã sort ---
    final_result = []
    for r in plans:
        final_result.append({
            "plan_link": r["plan_link"],
            "plan_type": r["plan_type"],
            "start_date": r["start_date"],
            "end_date": r["end_date"],
            "owner": "",
            "comment": "",
            "comment_date": "",
            "indent": 0
        })
        for c in comments_by_plan.get(r["plan_link"], []):
            final_result.append({
                "plan_link": "",
                "plan_type": "",
                "start_date": "",
                "end_date": "",
                "owner": user_full_names.get(c.owner, c.owner),
                "comment": strip_html_tags(c.content or ""),
                "comment_date": c.creation,
                "indent": 1
            })

    return final_result


def execute(filters=None):
    columns = get_columns()
    data = get_data(filters or {})
    return columns, data

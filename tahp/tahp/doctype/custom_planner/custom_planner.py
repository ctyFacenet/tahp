# # Copyright (c) 2025, FaceNet and contributors
# # For license information, please see license.txt

import json
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime, add_days, nowdate, getdate, formatdate
from frappe.model.workflow import apply_workflow

STEPS = {
    "Nháp": {
        "lock_fields": ["bom", "item_name", "stock_uom"],
        "edit_fields": ["item_code", "qty", "start_date", "end_date", "note"],
        "edit_fields_by": ["Kế hoạch sản xuất"],
        "edit_post": True,
        "edit_post_by": ["Kế hoạch sản xuất"],
        "edit_workflow_by": ["Kế hoạch sản xuất"],
    },
    "Đợi PTCN Duyệt": {
        "lock_fields": ["item_name", "stock_uom", "item_code", "qty", "start_date", "end_date"],
        "edit_fields": ["bom", "note"],
        "edit_fields_by": ["Phát triển công nghệ"],
        "edit_workflow_by": ["Phát triển công nghệ"],
    },
    "Đã được PTCN duyệt": {
        "lock_fields": ["bom", "item_name", "stock_uom", "item_code"],
        "edit_fields": ["qty", "start_date", "end_date", "note"],
        "edit_fields_by": ["Kế hoạch sản xuất"],
        "edit_workflow_by": ["Kế hoạch sản xuất"],
    },
    "Đợi GĐ duyệt": {
        "lock_fields": ["item_code", "item_name", "stock_uom", "qty", "start_date", "end_date", "bom"],
        "edit_fields": ["note"],
        "edit_fields_by": ["Giám đốc"],
        "actions": ["Phê duyệt"],
        "actions_by": ["Giám đốc"],
        "edit_workflow_by": ["Kế hoạch sản xuất", "Giám đốc"],
    },
    "Duyệt xong": {
        "lock_fields": ["item_code", "item_name", "stock_uom", "qty", "start_date", "end_date", "bom", "note"],
    },
    "Đã hủy bỏ": {
        "lock_fields": ["item_code", "item_name", "stock_uom", "qty", "start_date", "end_date", "bom", "note"],
    }
}

class CustomPlanner(Document):
    def autoname(self):
        clean_code = self.code_name.replace("LSX.", "").replace(".LSX", "").replace("LSX", "")
        clean_code = clean_code.strip(".")
        new_name = f"KHSX.{clean_code}"
        self.name = new_name

    def before_save(self):
        for item in self.items:
            if isinstance(item.parent_name, int):
                for post in self.posts:
                    if item.parent_name == post.routing:
                        item.parent_name = post.name
                        break
        if self.items:
            item_names = []
            start_times = []
            end_times = []

            for item in self.items:
                if item.item_code and item.item_name:
                    item_names.append(item.item_name)
                if item.start_date:
                    start_times.append(item.start_date)
                if item.end_date:
                    end_times.append(item.end_date)

            self.start_date = min(start_times) if start_times else None
            self.end_date = max(end_times) if end_times else None
            self.item_list = ", ".join(item_names)

        if self.posts:
            new_length = len(self.posts)
            if self.choice_length != new_length:
                self.choice_length = new_length

    def on_cancel(self):
        self.workflow_state = "Đã hủy bỏ"
        wwo_list = frappe.get_all("Week Work Order", filters={"new_plan": self.name}, pluck="name")
        for wwo_name in wwo_list:
            frappe.delete_doc("Week Work Order", wwo_name, force=True)

@frappe.whitelist()
def check_permission(workflow_state):
    roles = frappe.get_roles(frappe.session.user)
    step_config = STEPS.get(workflow_state, {})

    edit_post = any(r in roles for r in step_config.get("edit_post_by", [])) if step_config.get("edit_post_by") else False
    edit_workflow = any(r in roles for r in step_config.get("edit_workflow_by", [])) if step_config.get("edit_workflow_by") else False

    return {"edit_post": edit_post, "edit_workflow": edit_workflow}
    
@frappe.whitelist()
def render_content(planner, post, items={}):
    if isinstance(post, str): post = json.loads(post)
    if isinstance(items, str): items = json.loads(items)

    doc = None
    workflow_state = None
    if not planner.startswith("new-custom-planner"):
        doc = frappe.get_doc("Custom Planner", planner)
        workflow_state = doc.workflow_state
    else:
        workflow_state = "Nháp"

    roles = frappe.get_roles(frappe.session.user)
    step_config = STEPS.get(workflow_state, {})

    lock_fields = step_config.get("lock_fields", []).copy()

    edit_fields = []
    edit_fields_by_roles = step_config.get("edit_fields_by", [])
    if any(r in roles for r in edit_fields_by_roles):
        edit_fields = step_config.get("edit_fields", [])

    lock_fields += [f for f in step_config.get("edit_fields", []) if f not in edit_fields]
    edit_post = any(r in roles for r in step_config.get("edit_post_by", [])) if step_config.get("edit_post_by") else False
    actions = []
    if step_config.get("actions") and any(r in roles for r in step_config.get("actions_by", [])):
        actions = step_config.get("actions", [])

    post["lock"] = lock_fields
    post["edit_fields"] = edit_fields
    post["edit_post"] = edit_post
    post["actions"] = actions

    keys = ["item_code", "item_name", "stock_uom", "qty", "bom", "start_date", "end_date", "note", "materials", "idx"]
    post["data"] = []
    for item in items:
        for k in keys:
            if k not in item or item[k] is None:
                item[k] = 0 if k == "qty" else ""

        for date_key in ["start_date", "end_date"]:
            if item.get(date_key):
                item[date_key] = frappe.format_value(item[date_key], {"fieldtype": "Date"})

        item_dict = {k: frappe._(item[k]) for k in keys}
        post["data"].append(item_dict)

    html = frappe.render_template("/tahp/doctype/custom_planner/custom_planner.html", post)
    return html

@frappe.whitelist()
def handle_approve(planner, post, comment=None):
    doc = frappe.get_doc("Custom Planner", planner)
    ready = False
    routing = None
    for p in doc.posts:
        if p.name == post:
            p.approved = True
            routing = p.routing
            ready = True
            break

    if ready:
        plan = frappe.new_doc("Week Work Order")
        plan.name = doc.code_name
        plan.code_name = doc.code_name
        plan.new_plan = doc.name
        plan.creation_time = now_datetime()

        notes = []
        for item in doc.items:
            if item.parent_name == routing or item.parent_name == post:
                plan.append("items", {
                    "item": item.item_code,
                    "item_name": item.item_name,
                    "qty": item.qty,
                    "uom": item.stock_uom,
                    "bom": item.bom,
                    "planned_start_time": item.start_date,
                    "planned_end_time": item.end_date,
                    "note": item.note if item.note else ""
                })
                if item.note: notes.append(f"- Ghi chú {item.item_name}: {item.note}")

        plan.note = "\n".join(notes) if notes else None
        plan.insert(ignore_permissions=True)
        plan.db_set("workflow_state", "Duyệt xong")
        plan.submit()

    doc.db_set("workflow_state", "Duyệt xong")
    doc.add_comment(
        comment_type="Workflow",
        text="Duyệt xong"
    )
    doc.submit()

    subject= f"LSX Tuần {plan.name} đã được Giám đốc duyệt"
    if comment:
        plan.add_comment("Comment", f"<b>Giám đốc để lại lưu ý</b>: {comment}")
        subject = f"LSX Tuần {plan.name} đã được Giám đốc duyệt kèm theo lưu ý: {comment}"

    wwo_notify(
        role = "Kế hoạch sản xuất",
        subject = subject,
        document_type="Week Work Order",
        document_name=plan.name,
    )

@frappe.whitelist()
def wwo_notify(role, subject, document_type, document_name, comment=None):
    user_ids = frappe.db.get_all("Has Role", filters={"role": role}, pluck="parent", distinct=True)
    active_users = frappe.db.get_all("User", filters={"name": ["in", user_ids], "enabled": 1}, pluck="name")
    if not active_users: return
    for user in active_users:
        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": subject,
            "email_content": subject,
            "type": "Alert",
            "document_type": document_type,
            "document_name": document_name
        }).insert(ignore_permissions=True)

    if comment:
        doc = frappe.get_doc(document_type, document_name)
        doc.add_comment("Comment", f"{role}: {comment}")

    return {"ok": True}

@frappe.whitelist()
def recommend_code_name():
    today = getdate(nowdate())
    next_day = add_days(today, 1)
    code_date = formatdate(next_day, "dd.MM.yy")
    base_code = f"LSX.{code_date}"
    code_name = base_code

    existing_wo = frappe.get_all(
        "Week Work Order",
        filters={"name": ["like", f"LSX.{code_date}%"]},
        pluck="name"
    )

    existing_cp = frappe.get_all(
        "Custom Planner",
        filters={"name": ["like", f"KHSX.{code_date}%"]},
        pluck="name"
    )

    all_existing = existing_wo + existing_cp

    counters = []
    for name in all_existing:
        if name == base_code or name == f"KHSX.{code_date}":
            counters.append(0)
        else:
            try:
                counters.append(int(name.split(".")[-1]))
            except ValueError:
                pass

    next_counter = max(counters, default=-1) + 1

    if next_counter == 0:
        code_name = base_code
    else:
        code_name = f"{base_code}.{next_counter}"
    
    return code_name
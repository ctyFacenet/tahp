# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import json
from frappe import _
from frappe.utils import now_datetime
from frappe.model.document import Document


class CustomPlanner(Document):
    pass

@frappe.whitelist()
def add_post(planner):
    doc = frappe.get_doc("Custom Planner", planner)
    post = doc.append("posts", {})
    doc.save(ignore_permissions=True)
    doc.append("items", {"parent_name": post.name})
    doc.save(ignore_permissions=True)
    return {"post_name": post.name}

@frappe.whitelist()
def delete_post(planner, post_name):
    doc = frappe.get_doc("Custom Planner", planner)
    for post in list(doc.posts):
        if post.name == post_name:
            doc.remove(post)
            for item in doc.items:
                if item.parent_name == post_name:
                    doc.remove(item)
            break

    doc.save(ignore_permissions=True)
    return

@frappe.whitelist()
def delete_item(planner, item_name):
    doc = frappe.get_doc("Custom Planner", planner)
    for item in list(doc.items):
        if item.name == item_name:
            doc.remove(item)
            break

    doc.save(ignore_permissions=True)
    return

@frappe.whitelist()
def add_item(planner, post_name):
    doc = frappe.get_doc("Custom Planner", planner)
    doc.append("items", {"parent_name": post_name})
    doc.save(ignore_permissions=True)
    return

@frappe.whitelist()
def save_planner_data(planner, data):
    data = json.loads(data) if isinstance(data, str) else data
    print(data)

    doc = frappe.get_doc("Custom Planner", planner)

    existing_posts = {p.name for p in doc.posts}
    new_post_names = {p["post_name"] for p in data}
    mapping_posts = dict()

    # Xóa các post bị loại bỏ
    for post in list(doc.posts):
        if post.name not in new_post_names:
            doc.remove(post)

    # Xử lý từng post
    for post_block in data:
        post_name = post_block["post_name"]
        if post_name not in existing_posts:
            new_post = doc.append("posts", {})
            doc.save(ignore_permissions=True)
            mapping_posts[post_name] = new_post.name
            print('Added posts', new_post.name)

        # Lấy items cũ của post này
        existing_items = {i.name: i for i in doc.items if i.parent_name == post_name}
        new_item_names = {r["item_name"] for r in post_block["rows"]}

        # Xóa item bị loại bỏ
        for name in list(existing_items.keys()):
            if name not in new_item_names:
                doc.remove(existing_items[name])

        # Cập nhật / thêm item
        for row in post_block["rows"]:
            if row["item_name"] in existing_items:
                item = existing_items[row["item_name"]]
            else:
                if post_name in mapping_posts:
                    item = doc.append("items", {"parent_name": mapping_posts[post_name]})
                else:
                    item = doc.append("items", {"parent_name": post_name})

            for f in ['item_code','item_name_display','uom','qty','bom','start_date','end_date','note']:
                item.set(f, row.get(f))
            print(item.parent_name)
            
    doc.save(ignore_permissions=True)
    return True

@frappe.whitelist()
def render_template(planner, post_name=None):
    planner = frappe.get_doc("Custom Planner", planner)

    agents = {
        "Kế hoạch sản xuất": {
            "lock": ["bom"],
            "actions": [],
            "edit": True
        },
        "Phát triển công nghệ": {
            "lock": ["item_code", "item_name", "uom", "qty", "start_date", "end_date"],
            "actions": [],
            "edit": True
        },
        "Giám đốc": {
            "lock": [],
            "actions": ["Phê duyệt"],
            "edit": False
        }
    }

    user_roles = frappe.get_roles(frappe.session.user)
    matched_roles = [r for r in user_roles if r in agents]

    final_lock, final_actions, final_edit = [], [], False
    if matched_roles:
        all_locks = [set(agents[r]["lock"]) for r in matched_roles]
        final_lock = list(set.intersection(*all_locks)) if all_locks else []
        all_actions = sum([agents[r]["actions"] for r in matched_roles], [])
        final_actions = list(set(all_actions))
        final_edit = any(agents[r].get("edit", False) for r in matched_roles)

    # Nếu truyền post_name: chỉ render post đó
    posts_to_render = []
    if post_name:
        post = frappe.get_doc({
            "doctype": "Custom Planner Post",
            "name": post_name,
            "parent": planner.name,
            "parenttype": "Custom Planner",
            "parentfield": "posts",
            "title": f"Phương án #{len(planner.posts) + 1}"
        })
        posts_to_render = [post]
    else:
        posts_to_render = planner.posts

    result = []
    index = 1
    for post in posts_to_render:
        related_items = [i for i in planner.items if i.parent_name == post.name]

        items_data = [{
            "item_name": i.name,
            "post_name": post.name,
            "item_code": i.item_code or "",
            "item_name_display": i.item_name or "",
            "stock_uom": _(i.stock_uom) or "",
            "qty": i.qty or 0,
            "bom": i.bom or "",
            "start_date": i.start_date or "",
            "end_date": i.end_date or "",
            "note": i.note or "",
            "materials": getattr(i, "materials", []) or [],
        } for i in related_items]

        html = frappe.render_template(
            "/tahp/doctype/custom_planner/custom_planner.html",
            {
                "title": f"Phương án #{index}",
                "edit": final_edit,
                "lock": final_lock,
                "actions": final_actions,
                "data": items_data,
                "post_name": post.name
            }
        )
        result.append(html)
        index += 1

    return result



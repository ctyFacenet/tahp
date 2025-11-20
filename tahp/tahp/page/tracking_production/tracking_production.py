import frappe
import json
from frappe.utils import time_diff_in_seconds, get_datetime, add_to_date
from frappe.utils import getdate, get_first_day, get_last_day, nowdate
from collections import Counter
import datetime

def get_time_str(dt_actual, dt_target):
    diff_sec = abs(time_diff_in_seconds(dt_actual, dt_target))

    days = int(diff_sec // 86400)  # 1 ngày = 86400s
    remaining = diff_sec % 86400

    hours = int(remaining // 3600)
    minutes = int((remaining % 3600) // 60)

    # Xây chuỗi hiển thị
    parts = []

    if days > 0:
        parts.append(f"{days} ngày")
    if hours > 0:
        parts.append(f"{hours} giờ")
    if minutes > 0:
        parts.append(f"{minutes} phút")
    
    # Trường hợp diff < 1 phút
    if not parts:
        parts.append("0 phút")

    return " ".join(parts)

def fake_steps(wwo, wos, warning_hour = 60, helper = 60, workflow_mapping=None):
    
    steps = [
        {"label": "KHSX Tạo", "state": "pending", "workflow": "Đợi PTCN Duyệt", "doctype": wwo.doctype, "name": wwo.name},
        {"label": "PTCN Duyệt", "state": "pending", "workflow": "Đã được PTCN duyệt", "doctype": wwo.doctype, "name": wwo.name},
        {"label": "KHSX Duyệt", "state": "pending", "workflow": "Đợi GĐ duyệt", "doctype": wwo.doctype, "name": wwo.name},
        {"label": "Giám đốc Duyệt", "state": "pending", "workflow": "Duyệt xong", "doctype": wwo.doctype, "name": wwo.name},
        {"label": "Quản đốc tạo LSX Ca", "state": "pending", "workflow": "Quản đốc tạo LSX Ca", "doctype": wwo.doctype, "name": wwo.name},
    ]

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_name": wwo.name,
            "comment_type": "Workflow"
        },
        fields=["creation", "owner", "content"],
        order_by="creation asc"
    )

    if wwo.doctype == "Week Work Order" and wwo.plan and wwo.docstatus == 1:
        plan_modified, plan_modified_by = frappe.db.get_value(
            "WWO Plan",
            wwo.plan,
            ["modified", "modified_by"]
        )

        comments.append(frappe._dict({
            "creation": get_datetime(plan_modified),
            "owner": plan_modified_by,
            "content": "Duyệt xong",
            "comment_type": "Workflow"
        }))

        steps[3]["doctype"] = "WWO Plan"
        steps[3]["name"] = wwo.plan

    stopped_wwo = None
    if wwo.doctype == "Custom Planner" and wwo.docstatus == 1:
        result = frappe.db.get_all("Week Work Order", filters={"new_plan": wwo.name}, fields=["wo_status", "name"])
        if result:
            stopped_wwo = result[0]
            steps[4]["doctype"] = "Week Work Order"
            steps[4]["name"] = stopped_wwo.name

    if len(wos) and wwo.docstatus == 1:
        archived = dict()
        for item in wwo.items:
            item_key = getattr(item, "item", None) or getattr(item, "item_code", None)
            if item_key not in archived:
                archived[item_key] = {"qty": 0, "planned_qty": 0, "creation": None, "owner": None}
            archived[item_key]["qty"] += item.qty

        for w in wos:
            w = frappe._dict(w)
            if w.production_item in archived:
                archived[w.production_item]["planned_qty"] += w.qty
                archived[w.production_item]["creation"] = w.creation
                archived[w.production_item]["owner"] = w.owner
                
        for key, value in archived.items():
            if value["planned_qty"] < value["qty"]:
                steps[4]["flag"] = True
                if hasattr(wwo, "wo_status") and wwo.wo_status in ["Stopped", "Completed"]:
                    steps[4]["flag"] = False
                if stopped_wwo and hasattr(stopped_wwo, "wo_status") and stopped_wwo.wo_status in ["Stopped", "Completed"]:
                    steps[4]["flag"] = False
                break

        creations = [v["creation"] for v in archived.values() if v["creation"]]
        latest_creation = max(creations) if creations else None
        owners = [v["owner"] for v in archived.values() if v["owner"]]
        most_common_owner = Counter(owners).most_common(1)
        most_common_owner = most_common_owner[0][0] if most_common_owner else None
        comments.append(frappe._dict({
            "creation": latest_creation,
            "owner": most_common_owner,
            "content": "Quản đốc tạo LSX Ca",
            "comment_type": "Workflow"
        }))

    creation_dt = get_datetime(wwo.creation)
    now_dt = frappe.utils.now_datetime()

    processing = False
    for step in steps:
        if processing:
            step["state"] = "pending"
            step["status"] = None
            step.pop("workflow", None)
            continue

        workflow_name = step.get("workflow")
        if not workflow_name:  continue

        target_time = workflow_mapping.get(workflow_name)
        if not target_time: continue

        target_hour, target_minute = map(int, target_time.split(":"))
        target_dt = creation_dt.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)

        comment_for_step = next((c for c in comments if c.content == workflow_name), None)
        if comment_for_step: 
            comment_dt = get_datetime(comment_for_step.creation)
        else:
            comment_dt = now_dt

        step["creation_dt"] = comment_dt
        time_str = get_time_str(comment_dt, target_dt)

        step_state = step["state"]
        status = None

        if step.get("flag"):
            step_state = "processing"
            processing = True

            delta_hours = abs((now_dt - now_dt).total_seconds()) / helper
            time_str = get_time_str(now_dt, target_dt)

            if delta_hours <= warning_hour:
                step_state = "late_warning"
            else:
                step_state = "late_danger"

            status = f"Trễ {time_str}"

            step["late_dt"] = delta_hours
            step["status"] = status
            step["updated"] = now_dt.strftime("%H:%M %d/%m")
            step["state"] = step_state
            step.pop("workflow", None)
            continue

        if comment_dt < target_dt:
            if comment_for_step:
                step_state = "completed"
                status = f"Sớm {time_str}"
            else:
                step_state = "processing"
                processing = True
            
            step["state"] = step_state
        else:
            delta_hours = abs((comment_dt - target_dt).total_seconds()) / helper
            if delta_hours <= warning_hour:
                step_state = "warning"

                if not comment_for_step:
                    step_state = "late_warning"
                    processing = True

            else:
                step_state = "danger"

                if not comment_for_step:
                    step_state = "late_danger"
                    processing = True

            step["late_dt"] = delta_hours
            status = f"Trễ {time_str}"

        step["status"] = status
        if status not in ["pending", "processing"] and status:
            step["updated"] = comment_dt.strftime("%H:%M %d/%m")
        step["state"] = step_state
        step.pop("workflow", None)

    if hasattr(wwo, "wo_status") and wwo.wo_status == "Stopped":
        steps.append({"label": "LSX bị dừng", "updated": get_datetime(wwo.modified).strftime("%H:%M %d/%m"), "state": "warning", "doctype": "Week Work Order", "name": wwo.name})
    if stopped_wwo and hasattr(stopped_wwo, "wo_status") and stopped_wwo.wo_status == "Stopped":
        steps.append({"label": "LSX bị dừng", "updated": get_datetime(stopped_wwo.modified).strftime("%H:%M %d/%m"), "state": "warning", "doctype": "Week Work Order", "name": stopped_wwo.name})
        if steps[4]["state"].startswith("late"):
            steps[4]["state"] = steps[4]["state"].replace("late_", "")

    creation_times = [s.get("creation_dt") for s in steps if s.get("creation_dt")]
    start_dt = min(creation_times)
    end_dt = max(creation_times)
    total_time = get_time_str(start_dt, end_dt)

    total_late_dt = sum([s.get("late_dt", 0) for s in steps if s.get("late_dt")])

    if total_late_dt < warning_hour:
        evaluation = "warning"
    else:
        evaluation = "danger"

    if total_late_dt > 0:
        start_dt = datetime.timedelta(0)
        end_dt = datetime.timedelta(minutes=total_late_dt)
        total_time = get_time_str(start_dt, end_dt)
    else:
        total_time = "0 phút"
        evaluation = "completed"

    return steps, evaluation, total_time

def process_step(step, comment_content, target_dt, comments, now_dt, warning_hour = 60, helper = 60):
    comment = next((c for c in comments if c["content"] == comment_content), None)
    
    if not comment:
        check_dt = now_dt
        if now_dt < target_dt:
            step["state"] = "processing"
        else:
            delta_hours = abs((now_dt - target_dt).total_seconds()) / helper
            time_str = get_time_str(now_dt, target_dt)
            if delta_hours <= warning_hour:
                step["state"] = "late_warning"
            else:
                step["state"] = "late_danger"
            step["status"] = f"Trễ {time_str}"
            step["late_dt"] = delta_hours
        step["block"] = True
    else:
        check_dt = get_datetime(comment.creation)
        if check_dt < target_dt:
            step["state"] = "completed"
            time_str = get_time_str(check_dt, target_dt)
            step["status"] = f"Sớm {time_str}"
        else:
            delta_hours = abs((check_dt - target_dt).total_seconds()) / helper
            time_str = get_time_str(check_dt, target_dt)
            if delta_hours <= warning_hour:
                step["state"] = "warning"
            else:
                step["state"] = "danger"
            step["status"] = f"Trễ {time_str}"
            step["late_dt"] = delta_hours
        step["updated"] = check_dt.strftime("%H:%M %d/%m")

    step["creation_dt"] = check_dt

def fake_wo_steps(wo, warning_hour = 60, helper = 60, workflow_mapping_wo=None):

    steps = [
        {"label": "Trưởng ca Duyệt", "state": "pending", "doctype": "Work Order", "name": wo.name},
        {"label": "Quản đốc Duyệt", "state": "pending", "doctype": "Work Order", "name": wo.name},
        {"label": "Trưởng ca bắt đầu", "state": "pending", "doctype": "Work Order", "name": wo.name},
        {"label": "Công nhân thực hiện", "state": "pending"},
        {"label": "Trưởng ca chốt sản lượng", "state": "pending", "doctype": "Work Order", "name": wo.name},
        {"label": "KCS xác nhận thành phẩm", "state": "pending"},
    ]

    comments = frappe.get_all(
        "Comment",
        filters={
            "reference_name": wo.name,
            "comment_type": "Workflow"
        },
        fields=["creation", "owner", "content"],
        order_by="creation asc"
    )

    planned_start_date = get_datetime(wo.planned_start_date)
    target_hour, target_minute = map(int, workflow_mapping_wo["Đợi Quản đốc duyệt"].split(":"))
    target_dt = planned_start_date.replace(hour=target_hour, minute=target_minute, second=0, microsecond=0)
    now_dt = frappe.utils.now_datetime()
    block_index = None
    process_step(steps[0], "Đợi Quản đốc duyệt", target_dt, comments, now_dt, warning_hour, helper)

    if steps[0].get("block"): block_index = 0

    shift_doc = frappe.get_doc("Shift", wo.custom_shift)
    start_time = shift_doc.start_time
    end_time = shift_doc.end_time

    start_hour = start_time.seconds // 3600
    start_minute = (start_time.seconds % 3600) // 60
    start_second = start_time.seconds % 60

    end_hour = end_time.seconds // 3600
    end_minute = (end_time.seconds % 3600) // 60
    end_second = end_time.seconds % 60

    start_shift = planned_start_date.replace(
        hour=start_hour,
        minute=start_minute,
        second=start_second,
        microsecond=0
    )

    end_shift = planned_start_date.replace(
        hour=end_hour,
        minute=end_minute,
        second=end_second,
        microsecond=0
    )

    back_time_min = workflow_mapping_wo["Duyệt xong"]["back_time"]
    target_dt = add_to_date(start_shift, minutes=-back_time_min)
    if block_index is None:
        process_step(steps[1], "Duyệt xong", target_dt, comments, now_dt, warning_hour, helper)
        if steps[1].get("block"): block_index = 1

    on_time_min = workflow_mapping_wo["Trưởng ca bắt đầu"]["on_time"]
    target_dt = add_to_date(start_shift, minutes=on_time_min)
    if block_index is None:
        process_step(steps[2], "Bắt đầu", target_dt, comments, now_dt, warning_hour, helper)
        if steps[2].get("block"): block_index = 2

    if block_index is None:
        job_cards = frappe.db.get_all(
            "Job Card",
            filters={"work_order": wo.name},
            fields=["name", "docstatus", "modified", "owner"]
        )

        state = "pending"
        status = None
        latest_modified = None

        if job_cards:
            for jc in job_cards:
                mod_dt = get_datetime(jc.modified)
                if latest_modified is None or mod_dt > latest_modified:
                    latest_modified = mod_dt

            if any(jc["docstatus"] == 0 for jc in job_cards):
                state = "processing"
                target_dt_check = end_shift
                if now_dt > target_dt_check:
                    delta_hours = abs((now_dt - target_dt_check).total_seconds()) / helper
                    time_str = get_time_str(now_dt, target_dt_check)
                    if delta_hours <= warning_hour:
                        state = "late_warning"
                    else:
                        state = "late_danger"
                    status = f"Trễ {time_str}"
                    steps[3]["late_dt"] = delta_hours
                steps[3]["creation_dt"] = now_dt
                steps[3]["block"] = True
                block_index = 3
            else:
                if latest_modified > end_shift:
                    delta_hours = abs((latest_modified - end_shift).total_seconds()) / helper
                    time_str = get_time_str(latest_modified, end_shift)
                    state = "warning" if delta_hours <= warning_hour else "danger"
                    status = f"Trễ {time_str}"
                    steps[3]["late_dt"] = delta_hours
                elif latest_modified <= end_shift:
                    time_str = get_time_str(latest_modified, end_shift)
                    state = "completed"
                    status = f"Sớm {time_str}"

            steps[3]["doctype"] = "Job Card"
            steps[3]["name"] = [jc.name for jc in job_cards]
        else:
            state = "completed"
            status = "Không có công đoạn"

        steps[3]["state"] = state
        steps[3]["status"] = status
        if latest_modified:
            steps[3]["updated"] = latest_modified.strftime("%H:%M %d/%m")
            steps[3]["creation_dt"] = latest_modified

    if block_index is None:
        result = frappe.db.get_all("Work Order Finished Item",
            filters={"work_order": wo.name, "type_posting": ["in", ["Thành phẩm", "TP sau QC"]], "item_code": wo.production_item},
            fields = ["name", "item_code", "item_code_new", "creation", "owner", "modified_by", "modified"]
        )

        state = "pending"
        status = None
        on_time_min = workflow_mapping_wo["Trưởng ca chốt sản lượng"]["on_time"]
        target_dt = add_to_date(end_shift, minutes=on_time_min)

        if not result:
            state = "processing"
            if now_dt > target_dt:
                delta_hours = abs((now_dt - target_dt).total_seconds()) / helper
                time_str = get_time_str(now_dt, target_dt)
                if delta_hours <= warning_hour:
                    state = "late_warning"
                else:
                    state = "late_danger"
                status = f"Trễ {time_str}"
                steps[4]["late_dt"] = delta_hours
            steps[4]["creation_dt"] = now_dt
            steps[4]["block"] = True
            block_index = 4
        else:
            finish_item = result[0]
            finish_dt = get_datetime(finish_item.creation)
            if finish_dt <= target_dt:
                state = "completed"
                time_str = get_time_str(finish_dt, target_dt)
                status = f"Sớm {time_str}"
            else:
                delta_hours = abs((finish_dt - target_dt).total_seconds()) / helper
                time_str = get_time_str(finish_dt, target_dt)
                if delta_hours <= warning_hour:
                    state = "warning"
                else:
                    state = "danger"
                status = f"Trễ {time_str}"
                steps[4]["late_dt"] = delta_hours
            steps[4]["updated"] = finish_dt.strftime("%H:%M %d/%m")
            steps[4]["creation_dt"] = finish_dt

        steps[4]["state"] = state
        steps[4]["status"] = status

        if not block_index:
            state = "pending"
            status = None
            on_time_min = workflow_mapping_wo["KCS xác nhận thành phẩm"]["on_time"]
            target_dt = add_to_date(end_shift, minutes=on_time_min)

            if not result or not result[0].item_code_new:
                state = "processing"
                if now_dt > target_dt:
                    delta_hours = abs((now_dt - target_dt).total_seconds()) / helper
                    time_str = get_time_str(now_dt, target_dt)
                    if delta_hours <= warning_hour:
                        state = "late_warning"
                    else:
                        state = "late_danger"
                    status = f"Trễ {time_str}"
                    steps[5]["late_dt"] = delta_hours
                steps[5]["creation_dt"] = now_dt
                steps[5]["block"] = True
                block_index = 5
            else:
                finish_item = result[0]
                finish_dt = get_datetime(finish_item.modified)
                if finish_dt <= target_dt:
                    state = "completed"
                    time_str = get_time_str(finish_dt, target_dt)
                    status = f"Sớm {time_str}"
                else:
                    delta_hours = abs((finish_dt - target_dt).total_seconds()) / helper
                    time_str = get_time_str(finish_dt, target_dt)
                    if delta_hours <= warning_hour:
                        state = "warning"
                    else:
                        state = "danger"
                    status = f"Trễ {time_str}"
                    steps[5]["late_dt"] = delta_hours
                steps[5]["updated"] = finish_dt.strftime("%H:%M %d/%m")
                steps[5]["creation_dt"] = finish_dt
                
            steps[5]["doctype"] = "Work Order Finished Item"
            steps[5]["name"] = [r.name for r in result]


            steps[5]["state"] = state
            steps[5]["status"] = status

    stop_step = next((c for c in comments if c["content"] == "Đã bị dừng"), None)
    if stop_step:
        stop_dt = get_datetime(stop_step.creation)
        stop_step_dict = {
            "label": "LSX Ca bị dừng",
            "updated": stop_dt.strftime("%H:%M %d/%m"),
            "state": "warning",
            "workflow": None,
            "doctype": "Work Order",
            "name": wo.name
        }
        insert_idx = None
        for i, s in enumerate(steps):
            step_dt = s.get("creation_dt")
            if step_dt and stop_dt < step_dt:
                insert_idx = i
                break     
        if insert_idx is not None:
            steps.insert(insert_idx, stop_step_dict)
            steps = steps[:insert_idx+1]
        else:
            steps.append(stop_step_dict)
            steps = steps[:len(steps)]

    creation_times = [s.get("creation_dt") for s in steps if s.get("creation_dt")]
    start_dt = min(creation_times)
    end_dt = max(creation_times)
    total_time = get_time_str(start_dt, end_dt)

    total_late_dt = sum([s.get("late_dt", 0) for s in steps if s.get("late_dt")])

    if total_late_dt < warning_hour:
        evaluation = "warning"
    else:
        evaluation = "danger"

    if total_late_dt > 0:
        start_dt = datetime.timedelta(0)
        end_dt = datetime.timedelta(minutes=total_late_dt)
        total_time = get_time_str(start_dt, end_dt)
    else:
        total_time = "0 phút"
        evaluation = "completed"

    return steps, evaluation, total_time

def build_wo_record(wo, warning_hour, helper, workflow_mapping_wo):
    steps, evaluation, total_time = fake_wo_steps(wo, warning_hour, helper, workflow_mapping_wo)

    return {
        "name": wo.name,
        "item_name": wo.item_name,
        "shift": wo.custom_shift,
        "qty": wo.qty,
        "stock_uom": wo.stock_uom,
        "steps": steps,
        "production_item": wo.production_item,
        "owner": wo.owner,
        "creation": wo.creation,    
        "doctype": "Work Order",
        "planned_start_date": wo.planned_start_date,
        "total_time": {"time_count": total_time, "state": evaluation}
    }

def get_work_orders(plan_name, warning_hour, helper, workflow_mapping_wo=None):
    wos = frappe.get_all(
        "Work Order",
        filters={"custom_plan": plan_name},
        fields=["name", "item_name", "qty", "stock_uom", "custom_shift", "creation", "owner", "production_item", "planned_start_date"]
    )
    return [build_wo_record(wo, warning_hour, helper, workflow_mapping_wo) for wo in wos]

def build_record(name, posts, wos, creation, wwo, warning_hour, helper, workflow_mapping=None):
    steps, evualation, total_time = fake_steps(wwo, wos, warning_hour, helper, workflow_mapping)

    return {
        "name": name,
        "posts": posts,
        "steps": steps,
        "total_time": {"time_count": total_time, "state": evualation},
        "wos": wos,
        "creation": creation,
        "doctype": wwo.doctype
    }

@frappe.whitelist()
def get_response(filters=dict()):
    if isinstance(filters, str): filters = json.loads(filters)
    today = getdate(nowdate())
    default_from = get_first_day(today)
    default_to = get_last_day(today)

    from_date = getdate(filters.get("from_date")) if filters.get("from_date") else default_from
    to_date = getdate(filters.get("to_date")) if filters.get("to_date") else default_to

    status = filters.get("status") if filters.get("status") else None

    results = []

    rules = frappe.get_single("Tracking Setting")

    workflow_mapping = {
        "Đợi PTCN Duyệt": rules.first_step or "12:00",
        "Đã được PTCN duyệt": rules.second_step or "12:15",
        "Đợi GĐ duyệt": rules.third_step or "12:30",
        "Duyệt xong": rules.fourth_step or "12:45",
        "Quản đốc tạo LSX Ca": rules.fifth_step or "13:00",
    }

    workflow_mapping_wo = {
        "Đợi Quản đốc duyệt": rules.sixth_step or "13:30",
        "Duyệt xong": {"back_time": int(rules.seventh_step) if rules.seventh_step else 30},
        "Trưởng ca bắt đầu": {"on_time": int(rules.eighth_step) if rules.eighth_step else 30},
        "Trưởng ca chốt sản lượng": {"on_time": int(rules.ninth_step) if rules.ninth_step else 30},
        "KCS xác nhận thành phẩm": {"on_time": int(rules.tenth_step) if rules.tenth_step else 30},
    }

    warning_hour = int(rules.warning_minute or 60)

    wwo_filters = {"new_plan": ["is", "not set"], "docstatus": ["!=", "2"]}
    if from_date and to_date:
        wwo_filters["start_date"] = ["between", [from_date, to_date]]
    elif from_date:
        wwo_filters["start_date"] = [">=", from_date]
    elif to_date:
        wwo_filters["start_date"] = ["<=", to_date]

    week_wos = frappe.db.get_all(
        "Week Work Order",
        filters=wwo_filters,
        fields=["name"]
    )

    for w in week_wos:
        doc = frappe.get_doc("Week Work Order", w.name)

        posts = [[
            {
                "item_code": it.item,
                "item_name": it.item_name,
                "qty": it.qty,
                "stock_uom": it.uom,
            }
            for it in doc.items
        ]]

        wos = get_work_orders(doc.name, warning_hour, 60, workflow_mapping_wo) if doc.docstatus == 1 else []
        results.append(build_record(doc.name, posts, wos, doc.creation, doc, warning_hour, 60, workflow_mapping))


    plan_filters={"docstatus": ["!=", "2"]}
    if from_date and to_date:
        plan_filters["creation"] = ["between", [from_date, to_date]]
    elif from_date:
        plan_filters["creation"] = [">=", from_date]
    elif to_date:
        plan_filters["creation"] = ["<=", to_date]
    planners = frappe.get_all("Custom Planner", fields=["name"], filters=plan_filters)

    for p in planners:
        doc = frappe.get_doc("Custom Planner", p.name)
        grouped = {}
        for it in doc.items:
            grouped.setdefault(it.parent_name, []).append({
                "item_code": it.item_code,
                "item_name": it.item_name,
                "qty": it.qty,
                "stock_uom": it.stock_uom,
            })

        if doc.docstatus == 1:
            approved_parents = set()

            for row in doc.posts:
                if row.approved == 1:
                    approved_parents.add(row.name)
                    if row.routing:
                        approved_parents.add(row.routing)
                    break

            # Giữ lại đúng các group được approved
            grouped = {
                parent_name: items
                for parent_name, items in grouped.items()
                if parent_name in approved_parents
            }

        posts = list(grouped.values())

        # Tìm Week Work Order liên kết
        related_wwo = frappe.get_all(
            "Week Work Order",
            filters={"new_plan": doc.name},
            fields=["name"]
        )

        wos = []
        for wwo in related_wwo: wos.extend(get_work_orders(wwo.name, warning_hour, 60, workflow_mapping_wo))
        results.append(build_record(doc.name, posts, wos, doc.creation, doc, warning_hour, 60, workflow_mapping))

    if status == "Chậm tiến độ":
        new_results = []

        for r in results:
            flag = False
            for s in r.get("steps"):
                if s.get("state") in ["late_danger", "late_warning", "processing", "pending"]:
                    new_results.append(r)
                    flag = True
                    break
            if flag: continue
            for w in r.get("wos"):
                for s in w.get("steps"):
                    if s.get("state") in ["late_danger", "late_warning", "processing", "pending"]:
                        new_results.append(r)
                        flag = True
                        break
                if flag:
                    break

        results = new_results

    results.sort(key=lambda x: x["creation"], reverse=True)
    return results

@frappe.whitelist()
def get_deadline():
    deadlines = frappe.get_single("Tracking Setting")
    return deadlines

@frappe.whitelist()
def save_deadline(values):
    if isinstance(values, str): values = json.loads(values)
    print(values)
    deadlines = frappe.get_single("Tracking Setting")
    time_fields = ["first_step", "second_step", "third_step", "fourth_step", "fifth_step", "sixth_step"]
    int_fields = ["seventh_step", "eighth_step", "ninth_step", "tenth_step"]

    # Gán giá trị
    for f in time_fields:
        if f in values and values[f]:
            # chỉ lấy HH:MM
            hh_mm = values[f][:5]  # "13:15:00" -> "13:15"
            setattr(deadlines, f, hh_mm)

    for f in int_fields:
        if f in values and values[f] is not None:
            setattr(deadlines, f, int(values[f]))   
    
    deadlines.save()

@frappe.whitelist()
def get_warning():
    ts = frappe.get_single("Tracking Setting")
    return ts.warning_minute or 60

@frappe.whitelist()
def set_warning(warning_minute):
    ts = frappe.get_single("Tracking Setting")
    ts.warning_minute = int(warning_minute)
    ts.save()
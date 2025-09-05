import frappe
import json

@frappe.whitelist()
def get_team(job_card):
    result = []
    doc = frappe.get_doc("Job Card", job_card)
    operation = doc.operation
    team = doc.custom_team_table
    if not team:
        current_user = frappe.session.user
        current_employee = frappe.db.get_value("Employee", {"user_id":current_user}, ["name", "employee_name"])
        if current_employee: 
            result.append({"employee": current_employee[0], "employee_name": current_employee[1]})
        operation_doc = frappe.get_doc("Operation", operation)
        if getattr(operation_doc, "custom_team", None):
            for emp in operation_doc.custom_team:
                if emp.employee != current_employee[0]:
                    result.append({"employee": emp.employee, "employee_name": emp.employee_name})
    else:
        for row in team:
            result.append({
                "employee": row.employee,
                "employee_name": row.employee_name
            })
    return result

@frappe.whitelist()
def set_team(job_card, team):
    """
    Cập nhật danh sách hiện tại và lịch sử nhân viên cho Job Card.
    """
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    team = json.loads(team)

    if not team:
        return

    new_employee_ids = {emp.get("employee") for emp in team if emp.get("employee")}
    current_table = []

    existing_employees = {r.employee for r in doc.custom_team_table or []}

    if new_employee_ids == existing_employees:
        return

    for r in doc.custom_team_table or []:
        if r.employee in new_employee_ids:
            current_table.append(r)

    for emp in team:
        emp_id = emp.get("employee")
        emp_name = emp.get("employee_name")
        if not emp_id or not emp_name:
            continue
        if emp_id not in existing_employees:
            row = doc.append("custom_team_table", {
                "employee": emp_id,
                "employee_name": emp_name
            })
            current_table.append(row)

    doc.custom_team_table = current_table

    last_history = {r.employee: r for r in doc.custom_teams or []}

    for emp in team:
        emp_id = emp.get("employee")
        emp_name = emp.get("employee_name")
        if not emp_id or not emp_name:
            continue

        last_record = last_history.get(emp_id)

        if not last_record:
            # Nhân viên hoàn toàn mới → thêm bản ghi lịch sử
            doc.append("custom_teams", {
                "employee": emp_id,
                "employee_name": emp_name,
                "from_time": from_time,
                "exit": False
            })
        else:
            if getattr(last_record, "exit", False):
                doc.append("custom_teams", {
                    "employee": emp_id,
                    "employee_name": emp_name,
                    "from_time": from_time,
                    "exit": False
                })

    format_team = {r.employee: r for r in doc.custom_team_table or []}
    for employee in last_history:
        if employee not in format_team and not getattr(last_record, "exit", False):
            doc.append("custom_teams", {
                "employee": r.employee,
                "employee_name": getattr(r, "employee_name", ""),
                "from_time": from_time,
                "exit": True
            })

    doc.save(ignore_permissions=True)

@frappe.whitelist()
def change_member(job_card, employee, new_employee):
    doc = frappe.get_doc("Job Card", job_card)
    current_time = frappe.utils.now_datetime()

    new_emp_doc = frappe.get_doc("Employee", new_employee)
    new_employee_name = new_emp_doc.employee_name

    for r in doc.custom_team_table or []:
        if r.employee == employee:

            doc.append("custom_teams", {
                "employee": r.employee,
                "from_time": current_time,
                "exit": True
            })

            doc.append("custom_teams", {
                "employee": new_employee,
                "from_time": current_time,
                "exit": False
            })

            r.employee = new_employee
            r.employee_name = new_employee_name
            break

    doc.save(ignore_permissions=True)

@frappe.whitelist()
def pause_member(job_card, employee):
    """
    Đánh dấu một nhân viên nghỉ.
    """

    doc = frappe.get_doc("Job Card", job_card)
    current_time = frappe.utils.now_datetime()

    if len(doc.custom_team_table) == 1:
        frappe.throw("Trong LSX công đoạn bắt buộc phải có ít nhất 1 nhân viên", title="Cập nhật danh sách thất bại")

    # --- 1. Xóa nhân viên khỏi custom_team_table ---
    doc.custom_team_table = [
        r for r in doc.custom_team_table or [] if r.employee != employee
    ]

    # --- 2. Thêm bản ghi lịch sử exit=True ---
    last_history = {r.employee: r for r in doc.custom_teams or []}
    last_record = last_history.get(employee)

    if not last_record or not getattr(last_record, "exit", False):
        doc.append("custom_teams", {
            "employee": employee,
            "employee_name": last_record.get("employee_name") if last_record else "",
            "from_time": current_time,
            "exit": True
        })

    doc.save(ignore_permissions=True)

@frappe.whitelist()
def get_workstations(job_card):
    """
    Lấy thông tin workstation cho Job Card:
    - Kiểm tra production_capacity và số Job Card đang Work In Progress.
    - Quản lý trạng thái máy, máy con theo logic mới.
    """
    result = []
    doc = frappe.get_doc("Job Card", job_card)

    # Mapping trạng thái mới
    status_map = {
        "Off": "Sẵn sàng",
        "Production": "Chạy",
    }
    
    # Lấy workstation chính
    workstation = frappe.get_doc("Workstation", doc.workstation)

    # Kiểm tra production_capacity
    if workstation.production_capacity:
        # Số lượng Job Card đang WIP trên workstation này (trừ job card hiện tại)
        wip_count = frappe.db.count(
            "Job Card",
            filters={
                "workstation": doc.workstation,
                "status": "Work In Progress",
                "name": ["!=", doc.name]
            }
        )
        if wip_count >= workstation.production_capacity:
            frappe.thrơw(f"{'Cụm thiết bị' if workstation.is_parent else 'Thiết bị'}'{workstation.name}' đã đạt tối đa công suất")

    # Nếu không phải máy parent
    if not workstation.custom_is_parent:
        if workstation.status in status_map:
            mapped_status = status_map[workstation.status]
        else:
            mapped_status = "Hỏng"  # Mặc định
        result.append({
            "workstation": workstation.name,
            "status": mapped_status
        })

    # Lấy danh sách máy con
    children = frappe.db.get_all(
        "Workstation",
        filters={"custom_parent": doc.workstation},
        fields=["name", "status"]
    )

    for child in children:
        # Nếu máy con đang Off => Sẵn sàng
        if child.status == "Off":
            mapped_status = "Sẵn sàng"
        elif child.status == "Production":
            running_count = frappe.db.count(
                "Job Card Workstation",
                filters={
                    "workstation": child.name,
                    "parenttype": "Job Card",
                    "parent": ["!=", doc.name],
                    "status": "Chạy"
                }
            )
            if running_count < workstation.production_capacity:
                mapped_status = "Sẵn sàng"
            else:
                mapped_status = "Bận"
        else:
            mapped_status = "Hỏng"

        result.append({
            "workstation": child.name,
            "status": mapped_status
        })

    return result

@frappe.whitelist()
def set_workstations(job_card, workstations, start=False):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if isinstance(workstations, str): workstations = json.loads(workstations)
    workstation_doc = frappe.get_doc("Workstation", doc.workstation)
    if workstation_doc:
        if workstation_doc.status in ["Problem", "Maintenance"]:
            frappe.throw('Toàn bộ cụm thiết bị/thiết bị đang hỏng, không thể sử dụng')
            return
        else:
            workstation_doc.status = "Production"
            workstation_doc.save(ignore_permissions=True)

    is_problem = all( workstation.get("status") in ["Problem", "Maintenance"] for workstation in workstations)
    if is_problem:
        frappe.throw('Toàn bộ thiết bị đều đang hỏng hoặc cần bảo trì')
        return
    
    doc.custom_workstation_table = []
    doc.custom_workstations = []
    for workstation in workstations:
        if workstation.get("workstation") and workstation.get("status"):
            status = workstation.get("status")
            ws = workstation.get("workstation")
            data = { "workstation": ws, "status": status }
            if status not in ["Hỏng", "Bận"]:
                if not start:  
                    data["status"] = "Sẵn sàng"
                else:
                    data["status"] = "Chạy"
                doc.append("custom_workstations", {**data, "from_time": from_time})
                ws_doc = frappe.get_doc("Workstation", ws)
                if ws_doc.name != workstation_doc.name:
                    ws_doc.status = "Production"
                    ws_doc.save(ignore_permissions=True)
            doc.append("custom_workstation_table", data)
    doc.save(ignore_permissions=True)

@frappe.whitelist()
def get_configs(job_card):
    result = []
    doc = frappe.get_doc("Job Card", job_card)
    configs = doc.custom_config_table
    if not configs:
        operation_doc = frappe.get_doc("Operation", doc.operation)
        if getattr(operation_doc, "custom_configs", None):
            for config in operation_doc.custom_configs:
                    result.append({
                        "config_name": config.config_name, 
                        "config_value": config.config_default, 
                        "unit": config.unit, 
                        "workstation": getattr(config, "workstation", None) or None},)
    else:
        for row in configs:
            result.append({
                "config_name": row.config_name,
                "config_value": row.config_value,
                "unit": row.unit,
                "workstation": getattr(row, "workstation", None) or None
            })        
    return result

@frappe.whitelist()
def set_configs(job_card, configs):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if isinstance(configs, str): configs = json.loads(configs)

    updated = False

    for i, config in enumerate(configs):
        if not config.get("config_name") or not config.get("config_value"):
            continue

        data = {
            "config_name": config.get("config_name"),
            "config_value": config.get("config_value"),
            "workstation": config.get("workstation"),
            "unit": config.get("unit"),
        }

        # Lấy bản ghi cũ tại vị trí i
        old_row = (doc.custom_config_table[i] if doc.custom_config_table and i < len(doc.custom_config_table) else None)
        if old_row:
            if old_row.config_name != data["config_name"] or old_row.config_value != data["config_value"] or old_row.workstation != data["workstation"]:
                doc.append("custom_configs", {**data, "from_time": from_time})
                old_row.config_name = data["config_name"]
                old_row.config_value = data["config_value"]
                old_row.workstation = data["workstation"]
                old_row.unit = data["unit"]
                updated = True
        else:
            # Nếu bảng hiện tại ngắn hơn configs, append thêm mới
            doc.append("custom_configs", {**data, "from_time": from_time})
            doc.append("custom_config_table", data)
            updated = True

    if updated:
        doc.save(ignore_permissions=True)

@frappe.whitelist()
def update_time(docname, timestamp, active):
    """
    Cập nhật trạng thái đồng hồ của Job Card
    docname: tên doc Job Card
    timestamp: thời gian hiện tại client gửi lên (string)
    active: True nếu start/resume, False nếu pause
    """
    doc = frappe.get_doc("Job Card", docname)
    ts = frappe.utils.get_datetime(timestamp)

    if active == "true":
        doc.status = "Work In Progress"
        start = True if doc.custom_start_time else False

        if not doc.custom_active:
            doc.custom_start_time = ts

        if not doc.time_logs:
            if not doc.custom_team_table:
                frappe.throw("Vui lòng thêm nhân viên trước")
            doc.append("time_logs", {"employee": doc.custom_team_table[0].employee, "from_time": frappe.utils.now_datetime(), "completed_qty": doc.for_quantity })
    
        doc.custom_active = True
        doc.save(ignore_permissions=True, ignore_version=True)

        if not start:
            if all(ws.status in ["Hỏng", "Bận"] for ws in doc.custom_workstation_table):
                frappe.throw("Toàn bộ thiết bị đang bận/hỏng, không thể tiếp tục công đoạn")
                
            workstations = get_workstations(doc.name)
            set_workstations(doc.name, workstations, True)
        else:
            workstations_to_update = []
            if all(ws.status in ["Hỏng", "Bận"] for ws in doc.custom_workstation_table):
                frappe.throw("Toàn bộ thiết bị đang bận/hỏng, không thể tiếp tục công đoạn")

            for ws in doc.custom_workstation_table:
                if ws.status == "Dừng":
                    workstations_to_update.append({"workstation": ws.workstation, "status": "Chạy"})
                
            if workstations_to_update:
                update_workstations(docname, workstations_to_update, True)

    else:
        doc.custom_active = False
        doc.status = "On Hold"
        elapsed_ms = int((ts - doc.custom_start_time).total_seconds() * 1000)
        doc.custom_check_time = (doc.custom_check_time or 0) + elapsed_ms
        doc.save(ignore_permissions=True, ignore_version=True)

        workstations_to_update = []
        for ws in doc.custom_workstation_table:
            if ws.status == "Chạy":
                workstations_to_update.append({"workstation": ws.workstation, "status": "Dừng"})

        if workstations_to_update:
            update_workstations(docname, workstations_to_update, True)

@frappe.whitelist()
def update_workstations(job_card, workstations, update_manual=False):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if isinstance(workstations, str): workstations = json.loads(workstations)
    ready = []
    for item in workstations:
        status = item.get("status")
        workstation = item.get("workstation")
        reason = item.get("reason")
        group_name = item.get("group_name", "")
        data = { "workstation": workstation, "status": status }
        ws_doc = frappe.get_doc("Workstation", workstation)
        if status == "Hỏng":
            ws_doc.status = "Problem"
        elif status == "Tắt":
            ws_doc.status = "Off"
        ws_doc.save(ignore_permissions=True)

        
        for row in doc.custom_workstation_table:
            if row.workstation == workstation:
                if row.status != status:
                    exists = any( cw.workstation == workstation for cw in doc.custom_workstations)
                    if not exists:
                        doc.append("custom_workstations", {**data, "status": "Chạy", "from_time": from_time})
                    row.status = status


        if status in ["Dừng", "Hỏng", "Tắt"]:
            ready.append({
                "workstation": workstation,
                "from_time": from_time,
                "reason": reason,
                "group_name": group_name,
                "is_danger": 1 if status == "Hỏng" else 0
            })
        elif status in ["Chạy"]:
            if ws_doc.status in ["Problem", "Maintenance"]:
                frappe.throw("Khôi phục thất bại, bộ phận bảo trì chưa cập nhật tình trạng máy")
                return
            downtime_rows = [d for d in doc.custom_downtime if d.workstation == workstation and not d.to_time]
            if downtime_rows:
                last_downtime = sorted(downtime_rows, key=lambda x: x.from_time, reverse=True)[0]
                last_downtime.to_time = from_time
                # Tính duration theo phút
                from_dt = frappe.utils.get_datetime(last_downtime.from_time)
                to_dt = frappe.utils.get_datetime(from_time)
                duration = frappe.utils.time_diff_in_seconds(to_dt, from_dt)
                last_downtime.duration = duration

    all_stopped = all(row.status in ["Dừng", "Hỏng", "Tắt"] for row in doc.custom_workstation_table)
    if all_stopped:
        ready = []
        print('all stopped')
        doc.append("custom_downtime", {
            "workstation": "Tất cả",
            "from_time": from_time,
            "group_name": group_name,
            "reason": reason,
            "is_danger": 1 if status == "Hỏng" else 0
        })
        doc.save(ignore_permissions=True, ignore_version=True)
        if doc.custom_start_time and not update_manual:
            update_time(job_card, str(frappe.utils.now_datetime()), active="false")
    else:
        print('all continue')
        available_rows = [row for row in doc.custom_workstation_table if row.status not in ["Hỏng", "Bận"]]
        all_available_running = all(row.status == "Chạy" for row in available_rows)
        if all_available_running:
            downtime_rows = [d for d in doc.custom_downtime if d.workstation == "Tất cả" and not d.to_time]
            if downtime_rows:
                last_downtime = sorted(downtime_rows, key=lambda x: x.from_time, reverse=True)[0]
                last_downtime.to_time = from_time
                from_dt = frappe.utils.get_datetime(last_downtime.from_time)
                to_dt = frappe.utils.get_datetime(from_time)
                duration = frappe.utils.time_diff_in_seconds(to_dt, from_dt)
                last_downtime.duration = duration   
            doc.save(ignore_permissions=True, ignore_version=True)
            if doc.custom_start_time and not update_manual:
                update_time(job_card, str(frappe.utils.now_datetime()), active="true")
        else:
            for row in ready:
                doc.append("custom_downtime", row)           
            doc.save(ignore_permissions=True, ignore_version=True)

@frappe.whitelist()
def set_inputs(job_card, inputs=None):
    """
    Nếu custom_input_table của Job Card trống:
    - Nạp các dòng từ Operation liên kết với Job Card
    - Nếu dòng có is_meter = 1, lấy custom_unit_per_reading từ Item
    Khi có thay đổi:
    - Cập nhật custom_input_table
    - Thêm dòng y hệt vào custom_inputs với from_time
    """

    import json
    from frappe.utils import now_datetime, flt

    doc = frappe.get_doc("Job Card", job_card)

    if not doc.operation:
        return

    operation = frappe.get_doc("Operation", doc.operation)
    if not operation.get("custom_inputs"):
        return
    
    from_time = now_datetime()
    changed = False

    # Nếu custom_input_table trống, nạp dữ liệu từ operation
    if not doc.custom_input_table:
        for op_input in operation.custom_inputs:
            item = frappe.get_doc("Item", op_input.item_code)
            new_row = {
                "item_code": op_input.item_code,
                "item_name": op_input.item_name,
                "is_meter": op_input.is_meter,
                "uom": item.stock_uom
            }

            if op_input.is_meter:
                new_row["unit_per_reading"] = item.get("custom_unit_per_reading")

            doc.append("custom_input_table", new_row)

            # Append luôn vào custom_inputs
            doc.append("custom_inputs", {
                "item_code": new_row["item_code"],
                "item_name": new_row["item_name"],
                "is_meter": new_row["is_meter"],
                "uom": new_row["uom"],
                "qty": getattr(new_row, "qty", 0),
                "meter": getattr(new_row, "meter", 0),
                "meter_out": getattr(new_row, "meter_out", 0),
                "unit_per_reading": getattr(new_row, "unit_per_reading", None),
                "from_time": from_time
            })

        doc.save(ignore_permissions=True)
        return

    # Nếu có inputs truyền vào
    inputs = json.loads(inputs) if isinstance(inputs, str) else inputs

    for input_row in inputs:
        row = next((r for r in doc.custom_input_table if r.item_code == input_row.get("item_code")), None)
        if not row:
            continue

        if not row.is_meter:
            new_qty = flt(input_row.get("qty"))
            if flt(row.qty) != new_qty:
                row.qty = new_qty
                changed = True
        else:
            new_meter_in = flt(input_row.get("meter") or 0)
            new_meter_out = flt(input_row.get("meter_out") or 0)
            if flt(row.meter or 0) != new_meter_in or flt(row.meter_out or 0) != new_meter_out:
                row.meter = new_meter_in
                row.meter_out = new_meter_out
                row.qty = (new_meter_out - new_meter_in) * flt(row.unit_per_reading or 1)
                changed = True

        # Nếu có thay đổi, thêm dòng y hệt vào custom_inputs
        if changed:
            doc.append("custom_inputs", {
                "item_code": row.item_code,
                "item_name": row.item_name,
                "is_meter": row.is_meter,
                "uom": row.uom,
                "qty": row.qty,
                "meter": getattr(row, "meter", 0),
                "meter_out": getattr(row, "meter_out", 0),
                "unit_per_reading": getattr(row, "unit_per_reading", None),
                "from_time": from_time
            })

    if changed:
        doc.save(ignore_permissions=True)

@frappe.whitelist()
def set_subtask(job_card, reason=None):
    """
    Lấy subtask từ operation của Job Card:
    - Nếu operation không có custom_subtask, tạo 1 subtask mặc định
    - Nếu truyền vào một reason, hàm được dùng để xác định hoàn thành việc
    """
    doc = frappe.get_doc("Job Card", job_card)
    if not doc.operation: return
    operation = frappe.get_doc("Operation", doc.operation)
    if not doc.custom_subtask:
        if not operation.custom_subtasks:
            doc.append("custom_subtask", {
                "reason": doc.operation,
            })
        else:
            for subtask in operation.custom_subtasks:
                doc.append("custom_subtask", {
                    "reason": subtask.reason,
                    "workstation": subtask.workstation,
                })
        doc.save(ignore_permissions=True)
        return

    if reason and doc.custom_subtask:
        for subtask in doc.custom_subtask:
            if subtask.reason == reason:
                subtask.done = 1
    
    doc.save(ignore_permissions=True)

@frappe.whitelist()
def submit(job_card):
    doc = frappe.get_doc("Job Card", job_card)

    input_issues = [
        t for t in doc.get("custom_input_table")
        if t.is_meter and t.meter != 0 and t.meter_out == 0
    ]
    if input_issues:
        frappe.throw("Bạn nhập số đo đồng hồ đầu vào nhưng chưa nhập đầu ra, vui lòng nhập đủ")

    for ws in doc.get("custom_workstation_table"):
        if ws.status in ["Chạy", "Dừng"]:
            ws.status = 'Sẵn sàng'
            ws_doc = frappe.get_doc("Workstation", ws.workstation)
            ws_doc.status = "Off"
            ws_doc.save(ignore_permissions=True)
    
    if doc.time_logs and len(doc.time_logs) > 0:
        doc.time_logs[0].to_time = frappe.utils.now_datetime()

    if doc.custom_subtask and len(doc.custom_subtask) > 0:
        last_subtask = doc.custom_subtask[-1]
        last_subtask.done = 1

    doc.custom_active = False
    elapsed_ms = int((frappe.utils.now_datetime() - doc.custom_start_time).total_seconds() * 1000)
    doc.custom_check_time = (doc.custom_check_time or 0) + elapsed_ms
    doc.status = "Completed"

    # Thông báo cho trưởng ca
    wo_name = doc.work_order
    wo_doc = frappe.get_doc("Work Order", wo_name)
    shift_leader = wo_doc.custom_shift_leader
    user = frappe.db.get_value("Employee", shift_leader, "user_id")

    other_job_cards = frappe.get_all(
        "Job Card",
        filters={
            "work_order": wo_name,
            "name": ["!=", job_card],
            "docstatus": 1
        },
        fields=["name"]
    )

    if other_job_cards:
        subject = f"Đã hoàn thành toàn bộ công đoạn của LSX Ca: {wo_name}"
        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": subject,
            "email_content": "",
            "type": "Alert",
            "document_type": "Work Order",
            "document_name": wo_name
        }).insert(ignore_permissions=True)

    doc.submit()

    
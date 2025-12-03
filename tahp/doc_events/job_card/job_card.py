from collections import Counter
import frappe
import json
from frappe.utils import now_datetime, flt
from tahp.tahp.doctype.operation_tracker_inspection.operation_tracker_inspection import generate_inspection

@frappe.whitelist()
def get_team(job_card):
    result = []
    emp_code = set()  # dùng set cho nhanh

    doc = frappe.get_doc("Job Card", job_card)
    operation = doc.operation
    team = doc.custom_team_table

    # --- Nếu Job Card đã có team thì trả về luôn ---
    if team:
        for row in team:
            result.append({
                "employee": row.employee,
                "employee_name": row.employee_name
            })
        return result

    # --- Bước 1: Lấy từ Work Order ---
    wo_doc = frappe.get_doc("Work Order", doc.work_order)
    for op in wo_doc.operations:
        if op.operation == operation:
            if op.custom_employee and op.custom_employee not in emp_code:
                emp = frappe.get_doc("Employee", op.custom_employee)
                result.append({"employee": emp.name, "employee_name": emp.employee_name})
                emp_code.add(emp.name)
            if op.custom_v_employee and op.custom_v_employee not in emp_code:
                emp = frappe.get_doc("Employee", op.custom_v_employee)
                result.append({"employee": emp.name, "employee_name": emp.employee_name})
                emp_code.add(emp.name)

    # --- Bước 2: Lấy từ Operation (MDM) nếu có ---
    operation_doc = frappe.get_doc("Operation", operation)
    if getattr(operation_doc, "custom_team", None):
        for emp in operation_doc.custom_team:
            if emp.employee and emp.employee not in emp_code:
                result.append({"employee": emp.employee, "employee_name": emp.employee_name})
                emp_code.add(emp.employee)

    # --- Bước 3: Nếu vẫn không có ai, thêm current user ---
    if not result:
        current_user = frappe.session.user
        current_employee = frappe.db.get_value(
            "Employee",
            {"user_id": current_user},
            ["name", "employee_name"]
        )
        if current_employee:
            result.append({
                "employee": current_employee[0],
                "employee_name": current_employee[1]
            })

    return result

def check_member(employee_id, current_job_card):
    job_cards = frappe.get_all("Job Card",
        filters={
            "docstatus": 0,
            "status": ["!=", "Open"],
            "name": ["!=", current_job_card]
        },
        fields=["name"],
        order_by="creation asc"
    )

    active_jobs = []

    for jc in job_cards:
        jc_doc = frappe.get_doc("Job Card", jc.name)
        team_rows = jc_doc.custom_team_table or []
        team_member = [r for r in team_rows if r.employee == employee_id]
        if not team_member: continue
        active_jobs.append((jc_doc, team_rows, team_member))
    if len(active_jobs) > 1:
        jc_doc, team_rows, team_member = active_jobs[-1] 

        if len(team_rows) > 1:
            from_time = now_datetime()
            jc_doc.append("custom_teams", {
                "employee": employee_id,
                "employee_name": team_member[0].employee_name,
                "from_time": from_time,
                "exit": True
            })
            jc_doc.custom_team_table = [
                r for r in team_rows if r.employee != employee_id
            ]
            jc_doc.save(ignore_permissions=True)
        else:
            frappe.throw(
                f"Nhân viên {employee_id} không thể thêm/đổi công đoạn "
                f"do Công đoạn {jc_doc.name} chỉ có duy nhất 1 nhân viên"
            )
            return        

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
            check_member(emp_id, job_card)
            row = doc.append("custom_team_table", {
                "employee": emp_id,
                "employee_name": emp_name
            })
            current_table.append(row)

    doc.custom_team_table = current_table

    last_history = {r.employee: r for r in doc.custom_teams or []}

    for emp in team:
        emp_id = emp.get("employee")
        if not emp_id:
            continue

        last_record = last_history.get(emp_id)

        if not last_record:
            doc.append("custom_teams", {
                "employee": emp_id,
                "from_time": from_time,
                "exit": False
            })
        else:
            if getattr(last_record, "exit", False):
                doc.append("custom_teams", {
                    "employee": emp_id,
                    "from_time": from_time,
                    "exit": False
                })

    format_team = {r.employee for r in doc.custom_team_table or []}

    for emp_id, last_record in last_history.items():
        if emp_id not in format_team:
            if not last_record.exit:
                doc.append("custom_teams", {
                    "employee": emp_id,
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

            check_member(new_employee, job_card)

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
    result = []
    doc = frappe.get_doc("Job Card", job_card)
    workstation = frappe.get_doc("Workstation", doc.workstation)

    if workstation.custom_is_parent:
        children = frappe.db.get_all(
            "Workstation",
            filters={"custom_parent": doc.workstation},
            fields=["name", "status"]
        )

        for child in children:
            if child.status == "Hỏng":
                continue
            
            result.append({
                "workstation": child.name,
                "status": "Sẵn sàng"
            })

        if not result:
            frappe.throw("Không có máy con nào khả dụng trong cụm")

    else:
        if workstation.status == "Hỏng":
            frappe.throw(f"Thiết bị {workstation.name} đang bị hỏng")

        result.append({
            "workstation": workstation.name,
            "status": "Sẵn sàng"
        })

    result.sort(key=lambda x: x["workstation"])

    return result

@frappe.whitelist()
def set_workstations(job_card, workstations):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if isinstance(workstations, str): workstations = json.loads(workstations)
    doc.custom_workstation_table = []
    doc.custom_workstations = []

    for ws in workstations:
        if ws.get("workstation") and ws.get("status"):
            status = ws.get("status")
            if status == "Sẵn sàng":
                ws_status = "Sẵn sàng"
            doc.append("custom_workstation_table", {"workstation": ws["workstation"], "status": ws_status})
            doc.append("custom_workstations", {"workstation": ws["workstation"], "status": ws_status, "from_time": from_time})

    shift_handover = frappe.db.get_all("Shift Handover", filters={"work_order": doc.work_order}, pluck="name", limit=1)
    if shift_handover:
        workstation = frappe.get_doc("Workstation", doc.workstation)
        if workstation.custom_is_parent:
            child = frappe.db.get_all("Workstation", filters={"custom_parent": doc.workstation}, pluck="name")
            w_temp = [w.workstation for w in doc.custom_workstation_table]
            outlier = [w for w in child if w not in w_temp]
            sh_doc = frappe.get_doc("Shift Handover", shift_handover[0])
            for row in sh_doc.table[:]:
                if row.caption in outlier:
                    sh_doc.remove(row)

            sh_doc.save(ignore_permissions=True)

    doc.save(ignore_permissions=True)

    set_configs(job_card)

@frappe.whitelist()
def set_configs(job_card, configs=None, workstation=None):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    raw_configs = doc.custom_config_table

    if not raw_configs:
        operation_doc = frappe.get_doc("Operation", doc.operation)
        if getattr(operation_doc, "custom_configs", None):
            for config in operation_doc.custom_configs:
                if config.workstation is None:
                    for ws in doc.custom_workstation_table:
                        doc.append("custom_config_table", {
                            "config_name": config.config_name, 
                            "config_value": config.config_default, 
                            "unit": config.unit, 
                            "workstation": ws.workstation
                        })
                        if config.config_default:
                            doc.append("custom_configs", {
                                "config_name": config.config_name, 
                                "config_value": config.config_default, 
                                "unit": config.unit, 
                                "workstation": ws.workstation,
                                "from_time": from_time
                            })
                else:
                    doc.append("custom_config_table", {
                        "config_name": config.config_name, 
                        "config_value": config.config_default, 
                        "unit": config.unit, 
                        "workstation": getattr(config, "workstation")
                    })
                    if config.config_default:
                        doc.append("custom_configs", {
                            "config_name": config.config_name, 
                            "config_value": config.config_default, 
                            "unit": config.unit, 
                            "workstation": getattr(config, "workstation"),
                            "from_time": from_time
                        })
        doc.save(ignore_permissions=True)
        return

    if isinstance(configs, str): configs = json.loads(configs)
    updated = False
    for config in configs:
        for row in doc.custom_config_table:
            if not config.get('config_value'): continue
            if row.config_name == config.get("config_name") and row.config_value != str(config.get("config_value")) and row.workstation == workstation:
                doc.append("custom_configs", {
                    "config_name": row.config_name,
                    "config_value": config.get("config_value") if config.get("config_value") else 0,
                    "unit": row.unit,
                    "workstation": row.workstation,
                    "from_time": from_time
                })
                row.config_value = config.get("config_value")
                updated = True
                break

    if updated:
        doc.save(ignore_permissions=True)

@frappe.whitelist()
def update_workstations(job_card, workstations):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if isinstance(workstations, str): workstations = json.loads(workstations)
    for item in workstations:
        status = item.get("status")
        workstation = item.get("workstation")
        reason = item.get("reason")
        group_name = item.get("group_name", "")
        workstation_doc = frappe.get_doc("Workstation", workstation)
        if status == "Hỏng":
            send_noti_workstation(doc.operation, workstation_doc.name, job_card, reason)
            workstation_doc.status = "Problem"
            workstation_doc.save()
        if status == "Chạy" or status == "Dừng":
            if workstation_doc.status in ["Problem", "Maintenance"]:
                frappe.throw(f"Thiết bị {workstation} đang hỏng hoặc bảo trì, không thể chạy")
            workstation_doc.status = "Production"
            workstation_doc.save()


        for row in doc.custom_workstation_table:
            if row.workstation == workstation:
                if status == "Chạy":
                    if not doc.custom_team_table:
                        frappe.throw("Vui lòng thêm nhân viên trước")

                    if not row.active:
                        if not doc.time_logs:
                            generate_inspection(doc.name, doc.operation, from_time)
                            doc.append("time_logs", {"employee": doc.custom_team_table[0].employee, "from_time": from_time, "completed_qty": doc.for_quantity})
                        
                        if len(doc.custom_subtask) == 1:
                            doc.custom_subtask[0].done = "Đang thực hiện"
                        row.start_time = from_time
    
                    row.active = True
                elif status in ["Dừng", "Tắt", "Hỏng"]:
                    row.active = False
                    if row.start_time:
                        second = int((from_time - row.start_time).total_seconds() * 1000)
                        row.time = (row.time or 0) + second
                        doc.append("custom_downtime", {
                            "workstation": workstation,
                            "from_time": from_time,
                            "reason": reason,
                            "is_danger": 1 if status == "Hỏng" else 0,
                            "group_name": group_name
                        })

                row.status = status

    for item in doc.custom_downtime:
        for workstation in workstations:
            if item.workstation == workstation.get("workstation") and workstation.get("status") == "Chạy" and item.to_time == None:
                item.to_time = from_time
                item.duration = frappe.utils.time_diff_in_seconds(item.to_time, item.from_time)
                break

    all_stopped = all(
        row.status == "Dừng" for row in doc.custom_workstation_table 
        if row.status not in ["Hỏng", "Bận"]
    )

    if all_stopped:
        doc.status = "On Hold"
    else:
        doc.status = "Work In Progress"
    doc.save()

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
    doc = frappe.get_doc("Job Card", job_card)
    if not doc.operation: return
    
    from_time = now_datetime()
    changed = False

    if not doc.custom_input_table:
        wo = frappe.get_doc("Work Order", doc.work_order)
        bom = frappe.get_doc("BOM", wo.bom_no)

        for bom_item in bom.items:
            print(bom_item)
            try:
                item_ops = json.loads(bom_item.custom_operations or "[]")
                if isinstance(item_ops, str):
                    item_ops = [item_ops]
            except:
                item_ops = []
            if any(op == doc.operation for op in item_ops):
                item_doc = frappe.get_doc("Item", bom_item.item_code)
                is_meter = item_doc.get("custom_is_meter") or False
                unit_per_reading = item_doc.get("custom_unit_per_reading") if is_meter else None

                new_row = {
                    "item_code": bom_item.item_code,
                    "item_name": bom_item.item_name,
                    "is_meter": is_meter,
                    "uom": item_doc.stock_uom,
                    "unit_per_reading": unit_per_reading
                }

                doc.append("custom_input_table", new_row)

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

            print(doc.operation, doc.operation in item_ops, item_ops)
            for r in doc.custom_inputs:
                print(r.item_code, r.item_name, r.is_meter, r.qty, r.unit_per_reading)
        
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
    Quản lý trạng thái subtask trong Job Card:
    - Nếu chưa có thì tạo subtask từ operation (mặc định Pending)
    - Nếu truyền reason -> set subtask đó = In Progress,
      đồng thời chuyển subtask trước đó từ In Progress thành Completed
    """
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    if not doc.operation:
        return

    operation = frappe.get_doc("Operation", doc.operation)

    if not doc.custom_subtask:
        if not operation.custom_subtasks:
            doc.append("custom_subtask", { "reason": doc.operation })
        else:
            for subtask in operation.custom_subtasks:
                if subtask.reason:
                    doc.append("custom_subtask", { "reason": subtask.reason, "workstation": subtask.workstation, "from_time": from_time })
            if len(doc.custom_subtask) == 0:
                doc.append("custom_subtask", { "reason": doc.operation, "from_time": from_time})
        doc.save(ignore_permissions=True)
        return

    if reason and doc.custom_subtask:
        for subtask in doc.custom_subtask:
            if subtask.done == "Đang thực hiện":
                subtask.done = "Xong"

        for subtask in doc.custom_subtask:
            if subtask.reason == reason:
                subtask.done = "Đang thực hiện"

    doc.save(ignore_permissions=True)

@frappe.whitelist()
def submit(job_card):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()

    # 1. Kiểm tra input
    input_issues = [
        t for t in doc.get("custom_input_table")
        if t.is_meter and t.meter != 0 and t.meter_out == 0
    ]
    if input_issues:
        frappe.throw("Bạn nhập số đo đồng hồ đầu vào nhưng chưa nhập đầu ra, vui lòng nhập đủ")

    # 2. Xử lý workstations: dừng & cộng dồn thời gian
    for ws in doc.get("custom_workstation_table"):
        if ws.status in ["Chạy", "Dừng"]:
            if ws.start_time:
                elapsed = int((from_time - ws.start_time).total_seconds() * 1000)
                ws.time = (ws.time or 0) + elapsed
                ws.active = False

            ws.status = "Sẵn sàng"

            # cập nhật Workstation doc
            ws_doc = frappe.get_doc("Workstation", ws.workstation)
            ws_doc.status = "Off"
            ws_doc.save(ignore_permissions=True)

    # 3. Chốt downtime entries chưa đóng
    for dt in doc.get("custom_downtime"):
        if not dt.to_time:
            dt.to_time = from_time
            dt.duration = frappe.utils.time_diff_in_seconds(dt.to_time, dt.from_time)

    # 4. Đóng time_logs nếu có
    if doc.time_logs and len(doc.time_logs) > 0:
        if not doc.time_logs[-1].to_time:
            doc.time_logs[-1].to_time = from_time

    # 5. Đánh dấu subtask cuối là hoàn thành
    if doc.custom_subtask:
        for subtask in doc.custom_subtask:
            if subtask.done == "Đang thực hiện":
                subtask.done = "Xong"

    # 6. Đổi trạng thái job card
    doc.status = "Completed"
    
    # 8. Submit
    doc.submit()

    inspection_name = frappe.db.get_value(
        "Operation Tracker Inspection", 
        {"job_card": doc.name}, 
        "name"
    )
    if inspection_name:
        inspection = frappe.get_doc("Operation Tracker Inspection", inspection_name)
        inspection.submit()

@frappe.whitelist()
def send_noti_workstation(operation, workstation, job_card, reason):
    users = frappe.db.get_all(
        "User",
        filters={"role_profile_name": "Bảo trì", "enabled": 1},
        pluck="name"
    )
    for user in users:
        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": f"Công nhân công đoạn <b style='font-weight:bold'>{operation}</b> báo thiết bị <b style='font-weight:bold'>{workstation}</b> đang bị hỏng. Nguyên nhận: {reason}",
            "email_content": f"Công nhân công đoạn {operation} báo thiết bị {workstation} đang bị hỏng. Vui lòng kiểm tra!",
            "document_type": "Workstation",
            "document_name": workstation,
            "type": "Alert",
        }).insert(ignore_permissions=True)

    doc = frappe.get_doc("Job Card", job_card)
    wo_doc = frappe.get_doc("Work Order", doc.work_order)
    shift_leader = wo_doc.custom_shift_leader
    if shift_leader:
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if user:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": f"Công nhân công đoạn <b style='font-weight:bold'>{operation}</b> báo thiết bị <b style='font-weight:bold'>{workstation}</b> đang bị hỏng. Nguyên nhận: {reason}. Trưởng ca vui lòng tiến hành kiểm tra",
                "email_content": f"Công nhân công đoạn {operation} báo thiết bị {workstation} đang bị hỏng. Nguyên nhận: {reason}. Trưởng ca vui lòng tiến hành kiểm tra",
                "document_type": "Job Card",
                "document_name": doc.name,
                "type": "Alert",
            }).insert(ignore_permissions=True)

@frappe.whitelist()
def update_comment(docname, comment):
    role_exists = frappe.db.exists("Role", "Phát triển công nghệ")
    if role_exists and "Phát triển công nghệ" not in frappe.get_roles(frappe.session.user):
        return

    frappe.get_doc({
        "doctype": "Comment",
        "comment_type": "Comment",
        "reference_doctype": "Job Card",
        "reference_name": docname,
        "content": comment,
        "comment_email": frappe.session.user,
        "comment_by": frappe.session.user_fullname
    }).insert(ignore_permissions=True)

    job_card = frappe.get_doc("Job Card", docname)
    current_time = now_datetime().strftime("[%H:%M]")
    if job_card.custom_team_table:
        first_emp = job_card.custom_team_table[0].employee
        if first_emp:
            emp = frappe.get_doc("Employee", first_emp)
            if emp.user_id:
                frappe.get_doc({
                    "doctype": "Notification Log",
                    "for_user": emp.user_id,
                    "subject": f"<b style='font-weight:bold'>{current_time}</b> PTCN gửi phản ánh tại công đoạn <b style='font-weight:bold'>{job_card.operation}</b>: {comment}",
                    "email_content": f"{current_time} PTCN gửi phản ánh tại công đoạn {job_card.operation}: {comment}",
                    "document_type": "Job Card",
                    "document_name": docname,
                    "type": "Alert"
                }).insert(ignore_permissions=True)
    return {"status": "success"}

@frappe.whitelist()
def check_ptcn_role():
    role_name = "Phát triển công nghệ"
    if not frappe.db.exists("Role", role_name):
        return True

    direct_roles = frappe.get_all(
        "Has Role",
        filters={
            "parent": frappe.session.user,
            "role": role_name
        },
        pluck="role"
    )

    return bool(direct_roles)

@frappe.whitelist()
def update_feedback(docname):
    doc = frappe.get_doc("Job Card", docname)
    pending_feedback = [fb for fb in doc.custom_tracker if not fb.to_time]
    if not pending_feedback: return
    latest_fb = sorted(pending_feedback, key=lambda x: x.from_time, reverse=True)[0]
    latest_fb.to_time = now_datetime()
    doc.save(ignore_permissions=True)

    inspections = frappe.get_all(
        "Operation Tracker Inspection",
        filters={"job_card": docname},
        fields=["name"]
    )
    for insp in inspections:
        insp_doc = frappe.get_doc("Operation Tracker Inspection", insp.name)
        update = False
        for row in insp_doc.posts:
            if row.name == latest_fb.feedback_id:
                row.approved_date = now_datetime()
                update = True
        if update: insp_doc.save(ignore_permissions=True)

@frappe.whitelist()
def process_comment(job_card, employee, workstation, reason):
    employee_name = None
    if employee != "Toàn bộ công nhân": 
        employee_code = employee.split(":")[0].strip()
        employee_name = employee.split(":")[1].strip()
    else:
        employee_code = employee
        employee_name = "mọi công nhân"

    doc = frappe.get_doc("Job Card", job_card)
    from_time = now_datetime()
    doc.append("custom_comment", {
        "from_date": from_time,
        "employee": employee_code,
        "employee_name": employee_name if employee_name != "mọi công nhân" else None,
        "workstation": workstation,
        "reason": reason
    })
    doc.save(ignore_permissions=True)

    shift_handover = frappe.get_all(
        "Shift Handover",
        filters={"work_order": doc.work_order},
        fields=["name"],
        limit=1
    )

    note = None
    timestamp = from_time.strftime("%H:%M")
    if workstation != "Toàn bộ thiết bị":
        note = f"[{timestamp}] Công đoạn {doc.operation}, {employee_name} phản ánh ở {workstation}: {reason}"
    else:
        note = f"[{timestamp}] Công đoạn {doc.operation}, {employee_name} phản ánh: {reason}"

    if shift_handover:
        sh_doc = frappe.get_doc("Shift Handover", shift_handover[0].name)

        if sh_doc.notes_1:
            sh_doc.notes_1 = note + "\n" + sh_doc.notes_1
        else:
            sh_doc.notes_1 = note
        sh_doc.save(ignore_permissions=True)

    shift_leader = frappe.db.get_value("Work Order", doc.work_order, "custom_shift_leader")
    if shift_leader:
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if user:
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": note,
                "document_type": "Job Card",
                "document_name": job_card,
                "type": "Alert"
            }).insert(ignore_permissions=True)        
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
        if not current_employee: return

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
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    team = json.loads(team)
    doc.custom_team_table = []
    for emp in team:
        data = {
            "employee": emp.get("employee"),
            "employee_name": emp.get("employee_name")
        }

        doc.append("custom_teams", {**data, "from_time": from_time})
        doc.append("custom_team_table", data)
    
    doc.save(ignore_permissions=True)

@frappe.whitelist()
def get_workstations(job_card):
    result = []
    doc = frappe.get_doc("Job Card", job_card)
    workstations = doc.custom_workstation_table
    maps = {"Problem": "Đang hỏng", "Maintenance": "Đang bảo trì", "Off": "Sẵn sàng", "Production": "Đang vận hành"}
    if not workstations:
        workstation = frappe.get_doc("Workstation", doc.workstation)
        if not workstation.custom_is_parent:
            result = [workstation]
        data = frappe.db.get_all("Workstation", {"custom_parent": doc.workstation}, ["name", "status"])
        result = [{"workstation": item.name, "status": maps[item.status]} for item in data]
    return result

@frappe.whitelist()
def set_workstations(job_card, workstations):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    workstations = json.loads(workstations)
    doc.custom_workstation_table = []
    for workstation in workstations:
        status = workstation.get("status")
        data = {
            "workstation": workstation.get("workstation"),
            "status": status
        }
        if status in ["Sẵn sàng", "Đang vận hành"]:
            doc.append("custom_workstations", {**data, "from_time": from_time})
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
                    result.append({"config_name": config.config_name, "config_value": config.config_default, "workstation": getattr(config, "workstation", None) or None})
    else:
        for row in configs:
            result.append({
                "config_name": row.config_name,
                "config_value": row.config_value,
                "workstation": getattr(row, "workstation", None) or None
            })        
    return result

@frappe.whitelist()
def set_configs(job_card, configs):
    doc = frappe.get_doc("Job Card", job_card)
    from_time = frappe.utils.now_datetime()
    configs = json.loads(configs)
    doc.custom_config_table = []
    for config in configs:
        data = {
            "config_name": config.get("config_name"),
            "config_value": config.get("config_value"),
            "workstation": config.get("workstation"),
        }

        doc.append("custom_configs", {**data, "from_time": from_time})
        doc.append("custom_config_table", data)
    
    doc.save(ignore_permissions=True)

@frappe.whitelist()
def get_inputs(job_card):
    pass

import frappe
from tahp.doc_events.job_card.job_card import set_inputs, get_workstations, set_workstations, get_configs, set_configs, set_subtask

def after_insert(doc, method):
    print('hello')
    settings = frappe.get_single("Manufacturing Settings")

    if not doc.wip_warehouse:
        doc.wip_warehouse = settings.default_wip_warehouse

    if not doc.workstation_type:
        ws = frappe.get_doc("Workstation", doc.workstation)
        doc.workstation_type = ws.workstation_type

    doc.save(ignore_permissions=True)

    if not doc.custom_input_table:
        set_inputs(doc.name)

    if not doc.custom_workstation_table:
        workstations = get_workstations(doc.name)
        set_workstations(doc.name, workstations)

    if not doc.custom_config_table:
        configs = get_configs(doc.name)
        set_configs(doc.name, configs)

    if not doc.custom_subtask:
        set_subtask(doc.name)
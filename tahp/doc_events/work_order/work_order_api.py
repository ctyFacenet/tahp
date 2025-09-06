import frappe

@frappe.whitelist()
def check_shift_handover(work_order, custom_plan, custom_plan_code):
    pre_work_order = frappe.get_all(
        'Work Order',
        filters = {
            'custom_plan': custom_plan,
            'custom_plan_code': custom_plan_code,
            "name": ["!=", work_order],
            "docstatus": 1
        },
        fields = ['name', 'creation']
    )
   
    if pre_work_order:
        pre_work_order.sort(key=lambda x: x.creation, reverse=True)
        late_work_order = pre_work_order[0]
        
        shift_handover = frappe.get_all(
            'Shift Handover',
            filters={'work_order': late_work_order.name},
            fields=['name', 'workflow_state']
        )
        if shift_handover:
            for sh in shift_handover:
                if sh.workflow_state != "Completed":
                    # link đến Shift Handover chưa Submit
                    work_order_link = f'<a href="/app/shift-handover/{sh.name}" target="_blank">{sh.name}</a>'
                    return {
                        "warning": f"Biên bản giao ca <b>{work_order_link}</b> của LSX <b>{late_work_order.name}</b> chưa được hoàn thành bàn giao. Vui lòng vào biên bản để nhấn 'Nhận bàn giao'."
                    }
    
    return {}

@frappe.whitelist()
def complete_shift_handover(shift_handover_name):
    sh = frappe.get_doc("Shift Handover", shift_handover_name)
    print(sh)

    # Tìm Work Order mới nhất có cùng custom_plan và custom_plan_code
    prev_wo = frappe.get_doc("Work Order", sh.work_order)
    new_wo = frappe.get_all(
        "Work Order",
        filters={
            "custom_plan": prev_wo.custom_plan,
            "custom_plan_code": prev_wo.custom_plan_code,
            "creation": [">", prev_wo.creation]
        },
        fields=["name", "custom_shift_leader"],
        order_by="creation asc",
        limit=1
    )

    if new_wo:
        print(new_wo[0].name)
        print("ok1")
        sh.db_set("shift_leader_2", new_wo[0].custom_shift_leader, update_modified=True)
        print("ok2", new_wo[0].custom_shift_leader)

    sh.db_set("workflow_state", "Completed", update_modified=True)

    return {
        "status": "success",
        "message": f"Đã nhận bàn giao. Trưởng ca 2 = {sh.shift_leader_2}"
    }

    # doc = frappe.get_doc
    # doc.shift_ 
    # doc.save()
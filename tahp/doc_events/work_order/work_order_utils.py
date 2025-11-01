import frappe
import json
from frappe.utils import now_datetime, get_datetime, flt

@frappe.whitelist()
def get_consumed_produced_items(work_order):
    doc = frappe.get_doc("Work Order", work_order)
    result = {"required": [], "produced": []}
    for item in doc.required_items:
        result["required"].append({
            "item_code": item.item_code,
            "item_name": item.item_name,
            "stock_uom": item.stock_uom,
            "standard_qty": item.required_qty,
            "actual_qty": item.required_qty,
            "warehouse": item.source_warehouse,
            "posting_date": now_datetime(),
            "type_posting": "Nguyên liệu tiêu hao",
            "flag": False,
        })

    job_cards = frappe.get_all("Job Card", filters={"docstatus": 1, "work_order": work_order}, fields=["name"])
    for jc in job_cards:
        jc_doc = frappe.get_doc("Job Card", jc.name)
        for row in jc_doc.custom_input_table:
            if row.qty and row.qty > 0:
                for item in result["required"]:
                    if item["item_code"] == row.item_code:
                        if not item["flag"]:
                            item["flag"] = True
                            item["standard_qty"] = 0
                            item["actual_qty"] = 0
                        item["standard_qty"] += row.qty
                        item["actual_qty"] += row.qty
    
    result["produced"].append({
            "item_code": doc.production_item,
            "item_name": doc.item_name,
            "stock_uom": doc.stock_uom,
            "standard_qty": doc.qty,
            "actual_qty": doc.qty,
            "warehouse": doc.fg_warehouse,
            "posting_date": now_datetime(),
            "type_posting": "Thành phẩm",
    })

    bom_no = frappe.db.get_value("Work Order", work_order, "bom_no")
    bom_doc = frappe.get_doc("BOM", bom_no)
    if bom_doc.custom_sub_items:
        for row in bom_doc.custom_sub_items:
            item_group = frappe.db.get_value("Item", row.item_code, "item_group")
            warehouse = frappe.db.get_value(
                "Item Default",
                {"parent": item_group},
                "default_warehouse"
            )
            if not warehouse:
                wo_doc = frappe.get_doc("Work Order", work_order)
                warehouse = wo_doc.fg_warehouse

            for item in result["produced"]:
                if row.item_code != item["item_code"]:
                    result["produced"].append({
                        "item_code": row.item_code,
                        "item_name": row.item_name,
                        "stock_uom": row.stock_uom,
                        "standard_qty": 0,
                        "actual_qty": 0,
                        "warehouse": doc.fg_warehouse,
                        "posting_date": now_datetime(),
                        "type_posting": "Phụ phẩm",
                    })

    return result

@frappe.whitelist()
def process_consumed_produced_items(work_order, required, produced, planned_start_date=None, actual_end_date=None, raise_qc=None):
    if isinstance(required, str): required = json.loads(required)
    if isinstance(produced, str): produced = json.loads(produced)
    wo_doc = frappe.get_doc("Work Order", work_order)

    for item_list in [required, produced]:
        for item in item_list:
            if flt(item.get("actual_qty")) == 0: continue
            doc = frappe.new_doc("Work Order Finished Item")
            doc.work_order = work_order
            doc.item_code = item.get("item_code")
            doc.item_name = item.get("item_name")
            doc.standard_qty = flt(item.get("standard_qty"))
            doc.actual_qty = flt(item.get("actual_qty"))
            doc.warehouse = item.get("warehouse")
            doc.posting_date = get_datetime(actual_end_date)
            doc.type_posting = item.get("type_posting")
            doc.save(ignore_permissions=True)
            doc.submit()

            if doc.item_code == wo_doc.production_item:
                wo_doc.db_set("produced_qty", doc.actual_qty)
                wo_doc.db_set("fg_warehouse", doc.warehouse)
                noti_qc(doc)

            else:
                for row in wo_doc.required_items:
                    if row.item_code == doc.item_code:
                        row.db_set("consumed_qty", doc.actual_qty, update_modified=False)



    wo_doc.db_set("status", "Completed")
    if planned_start_date:
        wo_doc.db_set("planned_start_date", get_datetime(planned_start_date))
    if actual_end_date:
        wo_doc.db_set("actual_end_date", get_datetime(actual_end_date) if actual_end_date else now_datetime())
    wo_doc.save(ignore_permissions=True)

    noti_shift_handover(wo_doc)
    update_wwo(wo_doc)
    return

def update_wwo(wo_doc):
    if not wo_doc.custom_plan: return

    wwo = frappe.get_doc("Week Work Order", wo_doc.custom_plan)

    work_orders = frappe.get_all(
        "Work Order",
        filters={
            "custom_plan": wo_doc.custom_plan,
            "status": ["!=", "Cancelled"]
        },
        fields=["status"]
    )

    all_done = all(wo.status == "Completed" for wo in work_orders)

    if all_done and wwo.wo_status != "Completed":
        wwo.wo_status = "Completed"
        wwo.save(ignore_permissions=True)

@frappe.whitelist()
def noti_qc(doc):
    role_profile_name = "Phát triển công nghệ"
    users = frappe.get_all("User", filters={"role_profile_name": role_profile_name}, pluck="name")
    message = (
        "Cần đo đạc thông số thành phẩm {item_code} {item_name} tại {warehouse}, phục vụ LSX Ca {work_order}"
    ).format(
        item_code=doc.get("item_code"),
        item_name=doc.get("item_name"),
        warehouse=doc.get("warehouse"),
        actual_qty=doc.get("actual_qty"),
        work_order=doc.get("work_order")
    )

    for user in users:
        frappe.get_doc({
            "doctype": "Notification Log",
            "subject": message,
            "for_user": user,
            "type": "Alert",
            "document_type": doc.get("doctype"),
            "document_name": doc.get("name"),
            "email_content": message
        }).insert(ignore_permissions=True)
    return

@frappe.whitelist()
def reject_work_order(name, comment):
    doc = frappe.get_doc("Work Order", name)
    shift_leader = doc.get("custom_shift_leader")
    
    if shift_leader:
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        
        if user:
            subject = f"LSX ca <b style='font-weight:bold'>{name}</b> đã bị từ chối bởi quản đốc: {comment}"
            frappe.get_doc({
                "doctype": "Notification Log",
                "for_user": user,
                "subject": subject,
                "email_content": f"<p><strong>Lý do từ chối:</strong></p><p>{comment}</p>",
                "type": "Alert",
                "document_type": "Work Order",
                "document_name": doc.name
            }).insert(ignore_permissions=True)
    
    doc.add_comment(
        comment_type="Comment",
        text=f"<strong>Quản đốc từ chối. Lý do:</strong> {comment}",
        comment_by=frappe.session.user
    )

    doc.workflow_state = "Draft"
    doc.save(ignore_permissions=True)
    
@frappe.whitelist()
def noti_shift_handover(doc):
    latest_handover = frappe.db.get_all(
        'Shift Handover',
        filters={'work_order': doc.name},
        fields=['name'],
        order_by='creation desc',
        limit=1
    )

    if latest_handover:
        handover_name = latest_handover[0].name
        shift_leader = doc.custom_shift_leader
        if not shift_leader: return
        user = frappe.db.get_value("Employee", shift_leader, "user_id")
        if not user: return

        # Tạo Notification Log
        frappe.get_doc({
            "doctype": "Notification Log",
            "for_user": user,
            "subject": f"Vui lòng kiểm tra nội dung BBGC ca {handover_name} và gửi bàn giao",
            "email_content": "Vui lòng kiểm tra nội dung BBGC và gửi bàn giao",
            "type": "Alert",
            "document_type": "Shift Handover",
            "document_name": handover_name
        }).insert(ignore_permissions=True)

@frappe.whitelist()
def check_job_card(work_order):
    doc = frappe.get_doc("Work Order", work_order)
    flag = True
    for item in doc.operations:
        jc = frappe.db.get_all("Job Card", {"docstatus": 1, "work_order": work_order, "operation": item.operation})
        if not jc: flag = False

    return flag
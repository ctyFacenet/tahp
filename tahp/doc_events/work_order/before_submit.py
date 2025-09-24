import frappe
from tahp.doc_events.work_order.work_order_api import execute_shift_handover

def before_submit(doc, method):
    check_shift_leader(doc)
    check_workstation(doc)
    warn_workstation(doc)
    execute_shift_handover(doc)
    doc.status = "In Process"

def check_shift_leader(doc):
    if doc.custom_shift_leader:
        leader_user = frappe.db.get_value("Employee", doc.custom_shift_leader, "user_id")
        if leader_user and leader_user != frappe.session.user:
            frappe.throw("Chỉ trưởng ca mới có thể bắt đầu LSX Ca")

def check_workstation(doc):
    if not doc.operations:
        return

    issues = []
    for row in doc.operations:
        if not row.workstation:
            continue  # bỏ qua nếu dòng không có workstation
        status = frappe.db.get_value("Workstation", row.workstation, "status")
        if status in ["Problem", "Maintenance"]:
            issues.append({"workstation": row.workstation, "status": "Đang hỏng" if status == "Problem" else "Đang bảo trì"})

    if issues:
        # Tạo bảng HTML
        table_rows = "".join(
            f"<tr><td>{i['workstation']}</td><td>{i['status']}</td></tr>"
            for i in issues
        )
        msg = f"""
        <div>
            <table class="table table-bordered table-sm" style="margin:0px">
                <thead class="thead-light">
                    <tr>
                        <th>Danh sách</th>
                        <th>Trạng thái</th>
                    </tr>
                </thead>
                <tbody>
                    {table_rows}
                </tbody>
            </table>
        </div>
        """
        frappe.throw(msg=msg, title="Phát hiện thiết bị/cụm thiết bị không thể sử dụng")

def warn_workstation(doc):
    if not doc.operations:
        return

    # Tạo dict để nhóm các warns theo cha
    parent_warns = {}
    for row in doc.operations:
        if not row.workstation:
            continue
        is_parent = frappe.db.get_value("Workstation", row.workstation, "custom_is_parent")
        if not is_parent:
            continue
        children = frappe.db.get_all(
            "Workstation",
            filters={"custom_parent": row.workstation},
            fields=["name", "status"]
        )
        child_warns = [
            {"workstation": w["name"], "status": "Đang hỏng" if w["status"]=="Problem" else "Đang bảo trì"}
            for w in children if w["status"] in ["Problem", "Maintenance"]
        ]
        if child_warns:
            parent_warns[row.workstation] = child_warns

    if parent_warns:
        table_html = ""
        collapse_id = 1
        for parent, children in parent_warns.items():
            table_html += f"""
            <tr style="text-align:center;">
                <td>{parent}</td>
                <td>{len(children)}</td>
                <td>
                    <button class="btn btn-sm btn-secondary" type="button" data-toggle="collapse" data-target="#collapse{collapse_id}" aria-expanded="false" aria-controls="collapse{collapse_id}">
                        Xem chi tiết
                    </button>
                </td>
            </tr>
            <tr>
                <td colspan="3" style="padding:0; border:none;">
                    <div class="collapse" id="collapse{collapse_id}">
                        <table class="table table-bordered table-sm" style="margin:0px; text-align:center;">
                            <thead class="thead-light" style="text-align:center;">
                                <tr style="text-align:center;">
                                    <th>Thiết bị con</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {''.join([f"<tr style='text-align:center;'><td>{c['workstation']}</td><td>{c['status']}</td></tr>" for c in children])}
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
            """
            collapse_id += 1

        msg_html = f"""
        <div> 
            <table class="table table-bordered table-sm" style="text-align:center;" style="margin:0px">
                <thead class="thead-light" style="text-align:center;">
                    <tr>
                        <th>Cụm thiết bị</th>
                        <th>Số thiết bị lỗi</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {table_html}
                </tbody>
            </table>
        </div>
        """

        # Dùng frappe.throw để vừa hiển thị bảng HTML vừa cấm submit
        frappe.msgprint(
            msg_html,
            indicator="orange",
            title="Bắt đầu sản xuất, lưu ý các thiết bị sau không sử dụng được"
        )

@frappe.whitelist()
def check_status(work_order):
    work_order_doc = frappe.get_doc("Work Order", work_order)
    if work_order_doc.docstatus != 1:
        return False

    # Kiểm tra Job Cards
    job_cards = frappe.db.get_all("Job Card", filters={"work_order": work_order_doc.name, "docstatus":1})
    if len(job_cards) != len(work_order_doc.operations):
        return False

    # Kiểm tra Stock Entry dạng Manufacture đã tồn tại chưa
    stock_entry = frappe.db.get_value("Stock Entry", 
        filters={
            "work_order": work_order_doc.name,
            "stock_entry_type": "Manufacture",
            "docstatus": 0
        }, 
        fieldname="name"
    )

    if stock_entry:
        return stock_entry  # trả về name của Stock Entry nếu đã tồn tại
    return True  # chưa có Stock Entry

@frappe.whitelist()
def add_input(work_order):
    """
    Lấy danh sách input từ Job Card đã submit thuộc work_order,
    qty > 0, gán warehouse dựa theo item group defaults.
    """
    if not work_order:
        frappe.throw("Work Order không được để trống")

    job_cards = frappe.get_all(
        "Job Card",
        filters={"docstatus": 1, "work_order": work_order},
        fields=["name"]
    )
    print('hello2\n\n\n\n\n')
    result = []

    for jc in job_cards:
        doc = frappe.get_doc("Job Card", jc.name)
        for row in doc.custom_input_table:
            if row.qty and row.qty > 0:
                item_group = frappe.db.get_value("Item", row.item_code, "item_group")
                warehouse = frappe.db.get_value(
                    "Item Default",
                    {"parent": item_group},
                    "default_warehouse"
                )
                result.append({
                    "item_code": row.item_code,
                    "item_name": row.item_name,
                    "qty": row.qty,
                    "uom": row.uom,
                    "s_warehouse": warehouse,
                    "description": "Phụ gia tiêu hao trong SX"
                })

    bom_no = frappe.db.get_value("Work Order", work_order, "bom_no")
    bom_doc = frappe.get_doc("BOM", bom_no)
    if bom_doc.custom_sub_items:
        print('hello\n\n\n\n\n')
        for row in bom_doc.custom_sub_items:
            item_group = frappe.db.get_value("Item", row.item_code, "item_group")
            warehouse = frappe.db.get_value(
                "Item Default",
                {"parent": item_group},
                "default_warehouse"
            )
            if not warehouse:
                print('hello2\n\n\n\n\n')
                wo_doc = frappe.get_doc("Work Order", work_order)
                warehouse = wo_doc.fg_warehouse
            result.append({
                "item_code": row.item_code,
                "item_name": row.item_name,
                "uom": row.stock_uom,
                "qty": 0,
                "t_warehouse": warehouse,
                "description": "Phụ phẩm trong SX"
            })

    return result

@frappe.whitelist()
def get_shift_progress():
    """
    Trả về danh sách LSX Ca chưa hoàn tất, mới nhất lên trước
    """
    shifts = frappe.db.get_all("Work Order",
        filters=[["status", "in", ["Draft", "In Process"]]],
        fields=["name", "status", "custom_shift_leader", "custom_shift"],  # bỏ work_order
        order_by="creation desc"
    )

    result = []
    for shift in shifts:
        job_cards = frappe.db.get_all("Job Card", filters={"work_order": shift.name}, fields=["name", "docstatus", "work_order"])
        shift_leader = frappe.db.get_value("Employee", shift.custom_shift_leader, ["employee_name"])
        wo = frappe.get_doc("Work Order", shift.name)
        total_ops = len(wo.operations)
        completed_ops = 0
        for jc in job_cards:
            if jc.docstatus == 1:
                completed_ops += 1

        result.append({
            "lsx_ca": shift.name,
            "status": "Đang thực hiện" if shift.status == "In Process" else "Nháp",
            "shift_leader": f"{shift.custom_shift_leader}: {shift_leader}",
            "shift": shift.custom_shift,
            "progress": f"{completed_ops}/{total_ops}" if total_ops else "",
            "handover_record": ""
        })

    return result
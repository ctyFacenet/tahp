import frappe

def before_submit(doc, method):
    check_shift_leader(doc)
    check_workstation(doc)
    warn_workstation(doc)

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
            title="Phát hiện các thiết bị con đang không sử dụng được"
        )

@frappe.whitelist()
def check_status(work_order):
    work_order_doc = frappe.get_doc("Work Order", work_order)
    if work_order_doc.docstatus != 1: return False

    job_cards = frappe.db.get_all("Job Card", filters={"work_order": work_order_doc.name, "docstatus":1})
    if len(job_cards):
        return True
    return False
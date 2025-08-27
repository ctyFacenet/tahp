import frappe

# def before_submit(doc, method):
#     issues = []

#     if not doc.operations: return

#     for row in doc.operations:
#         if row.workstation and is_invalid(row.workstation):  # hàm is_invalid tự bạn định nghĩa
#             issues.append(row.workstation)

#     if issues:
#         msg = "<h4 style='color:red;'>Danh sách thiết bị/cụm thiết bị không thể sử dụng</h4>"
#         msg += "<table class='table table-bordered'>"
#         msg += "<tr><th>Workstation</th></tr>"

#         for ws in issues:
#             msg += f"<tr><td>{ws}</td></tr>"

#         msg += "</table>"

#         frappe.throw(msg, title="Kiểm tra thiết bị")

# def is_invalid(workstation_name):
#     """
#     Trả về True nếu workstation đang gặp sự cố
#     (Problem hoặc Maintainance), False nếu bình thường.
#     """
#     ws = frappe.get_doc("Workstation", workstation_name)
#     return ws.status in ["Problem", "Maintainance"]
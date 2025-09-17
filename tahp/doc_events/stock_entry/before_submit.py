import frappe

def before_submit(doc, method):
    user = frappe.session.user
    role_profile = frappe.db.get_value("User", user, "role_profile_name")
    if role_profile != "Chủ kho":
        frappe.throw("Chỉ <b>Chủ kho</b> mới có thể xác nhận phiếu")
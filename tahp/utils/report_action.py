import frappe

@frappe.whitelist()
def delete_document(doctype, name):
    doc = frappe.get_doc(doctype, name)
    if not frappe.has_permission(doctype, "delete", doc=doc):
        frappe.throw("Bạn không có quyền xóa")
    doc.delete()
    return "Đã xoá thành công"
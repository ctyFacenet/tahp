import frappe

subject = "Test Notification"
message = "Đây là notification log thử nghiệm gửi tới Item A."

# Tạo Notification Log
doc = frappe.get_doc({
    "doctype": "Notification Log",
    "subject": subject,
    "document_type": "Item",
    "document_name": "A",
    "email_content": message,
})

doc.insert(ignore_permissions=True)
frappe.db.commit()
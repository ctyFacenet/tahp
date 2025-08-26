import frappe
import os

def setup_website():
    # Tìm đúng path vật lý của file SVG trong mã nguồn
    file_path = os.path.join(frappe.get_app_path("tahp"), "public/images/logo_fn.png")

    if not os.path.exists(file_path):
        frappe.throw(f"Logo file not found at: {file_path}")

    # Đây là URL công khai sau khi build
    logo_url = "/assets/tahp/images/logo_fn.png"

    frappe.db.set_value("Website Settings", "Website Settings", "brand_html", f"<img src='{logo_url}' height='30px'>")
    frappe.db.set_value("Website Settings", "Website Settings", "favicon", logo_url)
    frappe.db.set_value("Website Settings", "Website Settings", "app_logo", logo_url)
    frappe.db.set_value("Website Settings", "Website Settings", "splash_image", logo_url)
    frappe.db.set_value("Website Settings", "Website Settings", "app_name", "Trường An Hải Phòng")
    frappe.db.set_value("System Settings", "System Settings", "language", "vi")
    frappe.db.commit()

    print("✅ Cài đặt logo & tên app và ngôn ngữ thành công.")

import frappe

def get_home_page(user):
    """Force redirect sau login về landingpage"""
    if frappe.session.user == "Guest":
        return "login"

    # Nếu có workspace Landing Page thì chuyển hướng
    if frappe.db.exists("Workspace", "Landing Page"):
        return "/landingpage"

    # fallback
    return "/app"

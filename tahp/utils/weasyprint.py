import frappe
from frappe import _

@frappe.whitelist(allow_guest=False)
def download_pdf():
    # Lấy dữ liệu từ body POST (JSON)
    data = frappe.local.form_dict
    html = data.get("html", "")
    letterhead = data.get("letterhead", None)

    HTML, CSS = import_weasyprint()

    # Thêm letterhead nếu có
    if letterhead and letterhead != _("No Letterhead"):
        from frappe import get_doc
        letterhead_doc = get_doc("Letter Head", letterhead)
        html = f"{letterhead_doc.content}\n{html}"

    # Tạo PDF
    pdf_doc = HTML(string=html, base_url=frappe.utils.get_url()).render()
    pdf_bytes = pdf_doc.write_pdf()

    frappe.local.response.filename = "document.pdf"
    frappe.local.response.filecontent = pdf_bytes
    frappe.local.response.type = "pdf"


def import_weasyprint():
    try:
        from weasyprint import CSS, HTML
        return HTML, CSS
    except OSError:
        import click
        message = "\n".join([
            "WeasyPrint depends on additional system dependencies.",
            "Follow instructions specific to your OS:",
            "https://doc.courtbouillon.org/weasyprint/stable/first_steps.html",
        ])
        click.secho(message, fg="yellow")
        frappe.throw(message)

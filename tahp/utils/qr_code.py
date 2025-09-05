import base64
import qrcode
import frappe
import io

@frappe.whitelist()
def generate_qr(data):
    """
    Trả về QR code dạng base64, không lưu file.
    """
    img = qrcode.make(data)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    qr_base64 = base64.b64encode(buf.read()).decode()
    return qr_base64

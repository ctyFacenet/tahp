import frappe

@frappe.whitelist()
def autofill_item_rate(item_code, supplier=None):
    filters = {"item_code": item_code}
    if supplier: filters["supplier"] = supplier
    rates = frappe.db.get_all("Supplier Item Rate", filters=filters, fields=["rate", "origin"], order_by="creation desc", limit=1)
    if rates: return rates[0]
    

@frappe.whitelist()
def get_employee_by_user(user=None):
    """
    Lấy thông tin Employee từ User ID
    """
    if not user:
        user = frappe.session.user
    
    employee = frappe.db.get_value(
        'Employee',
        {'user_id': user},
        ['name', 'employee_name'],
        as_dict=True
    )
    
    if employee:
        return {
            'success': True,
            'employee_id': employee.name,
            'employee_name': employee.employee_name
        }
    else:
        return {
            'success': False,
            'message': 'Không tìm thấy nhân viên '
        }
    
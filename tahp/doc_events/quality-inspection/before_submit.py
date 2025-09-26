import frappe

def before_submit(doc):
    pass

# Thêm hàm này vào file .py của bạn
@frappe.whitelist()
def check_qc_reading(reading_value, formula):
    """
    Checks if a reading value satisfies the given acceptance formula.
    """
    try:
        # Sử dụng eval an toàn để đánh giá công thức.
        # Lưu ý: Formula phải chứa biến '_value_' để tham chiếu đến reading_value.
        # Ví dụ: "_value_ > 100 and _value_ < 200"
        
        # Đảm bảo reading_value là số
        try:
            reading_value = float(reading_value)
        except ValueError:
            return "Rejected"
            
        _value_ = reading_value
        result = frappe.safe_eval(formula)
        
        return "Accepted" if result else "Rejected"
    
    except Exception as e:
        frappe.log_error(frappe.get_traceback(), "Error in check_qc_reading")
        return "Rejected"
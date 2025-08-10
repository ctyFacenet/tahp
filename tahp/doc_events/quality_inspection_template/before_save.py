def before_save(doc, method):
    """
    Sinh công thức kiểm tra cho bản ghi dựa trên các điều kiện người dùng nhập.

    Nếu người dùng chỉ nhập một điều kiện (trái hoặc phải), công thức chỉ chứa điều kiện đó.
    Nếu nhập cả hai, công thức sẽ nối bằng "and".

    Ví dụ:
        custom_left = ">="
        custom_left_value = 4
        custom_right = "*"
    Kết quả:
        acceptance_formula = "(reading_1 >= 4)"
    """
    for row in doc.item_quality_inspection_parameter:
        left = row.custom_left
        right = row.custom_right
        lvalue = row.custom_left_value
        rvalue = row.custom_right_value
        formula = []
        reading_no = 1
        print("hi")
        if left != "*" and lvalue is not None:
            formula.append(f"(reading_{reading_no} {left} {lvalue})")
        if right != "*" and rvalue is not None:
            formula.append(f"(reading_{reading_no} {right} {rvalue})")
        
        row.acceptance_formula = " and ".join(formula) if formula else ""
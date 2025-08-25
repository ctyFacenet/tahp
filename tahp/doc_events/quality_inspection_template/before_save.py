def before_save(doc, method):
    """
    Sinh công thức kiểm tra cho bản ghi dựa trên các điều kiện người dùng nhập.

    - Nếu chỉ nhập một điều kiện (trái hoặc phải), công thức chỉ chứa điều kiện đó.
    - Nếu nhập cả hai, công thức nối bằng "and".
    - custom_left: toán tử so sánh bên trái (>, >=, <, <=, *)
    - custom_left_value: giá trị ở bên trái (ví dụ 4 trong "4 < a")
    - custom_right: toán tử so sánh bên phải
    - custom_right_value: giá trị bên phải (ví dụ 5 trong "a < 5")

    Ví dụ:
        custom_left = "<"
        custom_left_value = 4
        custom_right = "<"
        custom_right_value = 5
    Kết quả:
        acceptance_formula = "(4 < reading_1 and reading_1 < 5)"
    """
    for row in doc.item_quality_inspection_parameter:
        left = row.custom_left
        right = row.custom_right
        lvalue = row.custom_left_value
        rvalue = row.custom_right_value
        formula = []
        reading_no = 1

        # Trái: 4 < a
        if left != "*" and lvalue is not None:
            formula.append(f"({lvalue} {left} reading_{reading_no})")

        # Phải: a < 5
        if right != "*" and rvalue is not None:
            formula.append(f"(reading_{reading_no} {right} {rvalue})")

        # Gán lại công thức
        row.acceptance_formula = " and ".join(formula) if formula else ""

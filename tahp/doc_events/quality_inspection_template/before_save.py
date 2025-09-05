import frappe

def before_save(doc, method):
    generate_formula(doc)


def generate_formula(doc):
    FORMULAS = {
        "Bằng": "{r} == {min}",
        "Trong khoảng (a, b)": "{min} < {r} and {r} < {max}",
        "Trong khoảng (a, b]":    "{min} < {r} and {r} <= {max}",
        "Trong khoảng [a, b)":    "{min} <= {r} and {r} < {max}",
        "Trong khoảng [a, b]":    "{min} <= {r} and {r} <= {max}",
        "Ngoài khoảng (x < a hoặc x > b)":   "{r} < {min} or {r} > {max}",
        "Ngoài khoảng (x ≤ a hoặc x ≥ b)":   "{r} <= {min} or {r} >= {max}",
        "Ngoài khoảng (x ≤ a hoặc x > b)":   "{r} <= {min} or {r} > {max}",
        "Ngoài khoảng (x < a hoặc x ≥ b)":   "{r} < {min} or {r} >= {max}",        
    }

    errors = []

    for row in doc.item_quality_inspection_parameter:
        adv = (row.custom_advance or "").strip()
        min_v = row.min_value
        max_v = row.max_value
        reading_no = 1
        formula = ""

        if adv in ("",) or adv.startswith("Trong khoảng"):
            if min_v is not None and max_v is not None:
                if min_v > max_v:
                    errors.append(
                        f"- {row.specification or '(không tên)'}: "
                        f"GT tối thiểu phải nhỏ hơn hoặc bằng giá trị tối đa"
                    )

        if adv == "" and min_v is not None and max_v is not None:
            adv = "Trong khoảng [a, b]"

        template = FORMULAS.get(adv)
        r = f"reading_{reading_no}"

        if template and min_v is not None and max_v is not None:
            formula = template.format(r=r, min=min_v, max=max_v)
        elif adv == "Bằng" and min_v is not None:
            formula = template.format(r=r, min=min_v, max="")
        elif adv == "" and min_v is not None:
            formula = f"{r} >= {min_v}"
        elif adv == "" and max_v is not None:
            formula = f"{r} <= {max_v}"


    if errors:
        frappe.throw("<br>".join(errors))
        
    row.acceptance_formula = formula
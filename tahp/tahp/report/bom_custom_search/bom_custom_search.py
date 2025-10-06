import frappe
from collections import Counter

def execute(filters=None):
    filters = filters or {}
    data = []

    # lấy cột + specs từ get_columns
    columns, specs_in, specs_out = get_columns(return_specs=True)

    # filter cơ bản
    bom_filters = {"docstatus": 1}
    if filters.get("bom_name"):
        bom_filters["name"] = filters["bom_name"]
    if filters.get("item_code"):
        bom_filters["item"] = filters["item_code"]
    if filters.get("custom_category"):
        bom_filters["custom_category"] = filters["custom_category"]
    if filters.get("custom_gyps"):
        bom_filters["custom_gyps"] = filters["custom_gyps"]

    boms = frappe.db.get_all("BOM", filters=bom_filters, fields=["name", "item"])
    indent = 0
    for bom in boms:
        doc = frappe.get_doc("BOM", bom.name)

        row = {
            "bom_name": doc.name,
            "custom_note": doc.custom_note,
            "item_code": doc.item,
            "item_name": frappe.get_value("Item", doc.item, "item_name") or "",
            "custom_density_normal": doc.custom_density_normal,
            "custom_category": doc.custom_category or "Không xác định",
            "custom_gyps": doc.custom_gyps,
        }

        for child in doc.custom_params or []:
            spec = child.specification
            if spec and spec in specs_in:
                key = spec.replace(" ", "_").lower()
                row[f"{key}_min_in"] = child.min_value or None
                row[f"{key}_max_in"] = child.max_value or None
                row[f"{key}_adv_in"] = child.custom_advance or ""

        for child in doc.custom_params_out or []:
            spec = child.specification
            if spec and spec in specs_out:
                key = spec.replace(" ", "_").lower()
                row[f"{key}_min_out"] = child.min_value or None
                row[f"{key}_max_out"] = child.max_value or None
                row[f"{key}_adv_out"] = child.custom_advance or ""

        include = True
        col_map = {c["fieldname"]: c for c in columns}
        lower_fields = {"item_name", "custom_note"}
        if filters:
            for fkey, fval in filters.items():
                if fval in (None, ""):
                    continue
                coldef = col_map.get(fkey)
                if not coldef:
                    continue
                if coldef["fieldtype"] in ("Link", "Select"):
                    if str(row.get(fkey)) != str(fval):
                        include = False
                        break
                elif fkey in lower_fields:
                    if fval.lower() not in str(row.get(fkey) or "").lower():
                        include = False
                        break
                else:
                    if not match_value(fkey, fval, row):
                        include = False
                        break

        if include:
            data.append(row)

    # --- Summary: đếm số BOM theo custom_category ---
    # category_counter = Counter(row["custom_category"] for row in data)
    # total_boms = len(data)
    # summary = [
    #     {"label": f"{cat}", "value": count} for cat, count in category_counter.items()
    # ]
    # summary.append({"label": "Tổng BOM", "value": total_boms})

    # # # --- Chart: hiển thị số BOM theo custom_category ---
    # chart = {
    #     "data": {
    #         "labels": list(category_counter.keys()),
    #         "datasets": [
    #             {
    #                 "name": "Số BOM",
    #                 "values": list(category_counter.values())
    #             }
    #         ]
    #     },
    #     "type": "bar"  # có thể đổi sang pie hoặc line
    # }

    # message = []

    # return columns, data, message, chart, summary
    return columns, data


def match_value(fkey, fval, row):
    FORMULAS = {
        "Bằng": "{r} == {min}",
        "Trong khoảng (a, b)": "{min} < {r} and {r} < {max}",
        "Trong khoảng (a, b]": "{min} < {r} and {r} <= {max}",
        "Trong khoảng [a, b)": "{min} <= {r} and {r} < {max}",
        "Trong khoảng [a, b]": "{min} <= {r} and {r} <= {max}",
        "Ngoài khoảng (x < a hoặc x > b)": "{r} < {min} or {r} > {max}",
        "Ngoài khoảng (x ≤ a hoặc x ≥ b)": "{r} <= {min} or {r} >= {max}",
        "Ngoài khoảng (x ≤ a hoặc x > b)": "{r} <= {min} or {r} > {max}",
        "Ngoài khoảng (x < a hoặc x ≥ b)": "{r} < {min} or {r} >= {max}",
    }

    try:
        r = float(fval)
        if r < 0: return False
    except (TypeError, ValueError):
        return False
    
    print('here')

    adv_key = fkey.replace("_min", "_adv").replace("_max", "_adv")
    adv_val = row.get(adv_key)

    min_val = row.get(fkey.replace("_max", "_min"), None)
    max_val = row.get(fkey.replace("_min", "_max"), None)

    try:
        min_v = float(min_val) if min_val not in (None, "") else None
        max_v = float(max_val) if max_val not in (None, "") else None
    except (TypeError, ValueError):
        return False

    if min_v is None and max_v is None:
        return False
    
    if adv_val and adv_val in FORMULAS:
        expr = FORMULAS[adv_val].format(r=r, min=min_v, max=max_v)
        try:
            return eval(expr)
        except Exception:
            return False
    else:
        if min_v is not None and r < min_v:
            return False
        if max_v is not None and r > max_v:
            return False
        return True
        
@frappe.whitelist()
def get_columns(return_specs=False):
    """Fetch BOM để lấy specs và build columns động"""
    columns = [
        {"label": "Hệ sản xuất", "fieldname": "custom_category", "fieldtype": "Link", "width": 110, "options": "Manufacturing Category", "align": "center"},
        {"label": "Công thức sản xuất (BOM)", "fieldname": "bom_name", "fieldtype": "Link", "options": "BOM", "width": 250, "freeze" : True},
        {"label": "Mã thành phẩm", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 200},
        {"label": "Tên thành phẩm", "fieldname": "item_name", "fieldtype": "Data", "width": 220, "align": "left"},
        {"label": "Tên loại Gyps", "fieldname": "custom_gyps", "fieldtype": "Link", "options": "Manufacturing Category Material", "width": 110, "align": "left"},
        {"label": "Ghi chú", "fieldname": "custom_note", "fieldtype": "Data", "width": 300, "align": "left"},
        {"label": "Tỷ trọng", "fieldname": "custom_density_normal", "fieldtype": "Data", "width": 90, "align": "center"},
    ]

    specs_in, specs_out = set(), set()

    # fetch BOM để lấy spec
    boms = frappe.db.get_all("BOM", filters={"docstatus": 1}, fields=["name"])
    for bom in boms:
        doc = frappe.get_doc("BOM", bom.name)
        for child in doc.custom_params or []:
            if child.specification:
                specs_in.add(child.specification)
        for child in doc.custom_params_out or []:
            if child.specification:
                specs_out.add(child.specification)

    # build columns cho spec in
    for spec in sorted(specs_in):
        key = spec.replace(" ", "_").lower()
        columns.append({
            "label": f"{spec} Tối thiểu (in)", "fieldname": f"{key}_min_in",
            "fieldtype": "Float", "width": 100,
            "parent": "Đầu vào",
            "align": "center"
        })
        columns.append({
            "label": f"{spec} Tối đa (in)", "fieldname": f"{key}_max_in",
            "fieldtype": "Float", "width": 100,
            "parent": "Đầu vào",
            "align": "center"
        })

    # build columns cho spec out
    for spec in sorted(specs_out):
        key = spec.replace(" ", "_").lower()
        columns.append({
            "label": f"{spec} Tối thiểu (out)", "fieldname": f"{key}_min_out",
            "fieldtype": "Float", "width": 100,
            "parent": "Đầu ra",
            "align": "center"
        })
        columns.append({
            "label": f"{spec} Tối đa (out)", "fieldname": f"{key}_max_out",
            "fieldtype": "Float", "width": 100,
            "parent": "Đầu ra",
            "align": "center"
        })

    if return_specs:
        return columns, specs_in, specs_out
    return columns

@frappe.whitelist()
def get_filter_columns():
    """Lấy filters từ get_columns nhưng lược bớt field không cần"""
    columns, _, _ = get_columns(return_specs=True)
    
    exclude = ["bom_name", "custom_category","custom_note"]

    filters = [{"fieldname": "week_work_order", "label": "Week Work Order", "fieldtype": "Data","hidden": 1}]
    for column in columns:
        if column["fieldname"] in exclude:
            continue
        
        temp = column.copy()  # tạo bản copy để chỉnh label
        if temp["label"].endswith("(in)"):
            temp["label"] = temp["label"].replace("(in)", "(Đầu vào)")
        elif temp["label"].endswith("(out)"):
            temp["label"] = temp["label"].replace("(out)", "(Đầu ra)")
        
        filters.append(temp)  # thêm bản copy đã chỉnh vào filters

    return filters
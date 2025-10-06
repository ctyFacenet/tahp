import frappe
import json
from datetime import timedelta
from collections import defaultdict

@frappe.whitelist()
def execute(filters=None):
    if isinstance(filters, str):
        filters = json.loads(filters)

    result = dict()

    main_item = frappe.get_doc("Item", filters.get("main_item")) if filters.get("main_item") else None
    sub_item = frappe.get_doc("Item", filters.get("sub_item")) if filters.get("sub_item") else None
    from_date = frappe.utils.getdate(filters.get("from_date")) if filters.get("from_date") else None
    to_date = frappe.utils.getdate(filters.get("to_date")) if filters.get("to_date") else None
    attribute = filters.get("attribute") if filters.get("attribute") else None
    
    if from_date and to_date and to_date < from_date: return

    # Overall
    num_days = (to_date - from_date).days + 1
    prev_from = from_date - timedelta(days=num_days)
    prev_to = from_date - timedelta(days=1)
    result["overall"] = dict()

    if main_item:
        main_current = overall(main_item, from_date, to_date)
        main_prev = overall(main_item, prev_from, prev_to)
        result["overall"]["main"] = {
            "qty": main_current["qty"],
            "produced_qty": main_current["produced_qty"],
            "old_qty": main_prev["produced_qty"],
            "label": main_item.item_name,
            "unit": main_item.stock_uom
        }

    if sub_item:
        sub_current = overall(sub_item, from_date, to_date)
        sub_prev = overall(sub_item, prev_from, prev_to)
        result["overall"]["sub"] = {
            "qty": sub_current["qty"],
            "produced_qty": sub_current["produced_qty"],
            "old_qty": sub_prev["produced_qty"],
            "label": sub_item.item_name,
            "unit": sub_item.stock_uom
        }

    # Category
    if main_item:
        data = category_overall(main_item, from_date, to_date, attribute)
        result["category_overall"] = data

    # Attribute
    if main_item:
        data = attribute_overall(main_item, from_date, to_date, attribute)
        result["attribute_overall"] = data

    # Manufacturing
    if main_item:
        data = manufacturing_overall(main_item, from_date, to_date, sub_item)
        result["manufacturing_overall"] = data

    # BOM
    if main_item:
        data = bom_overall(main_item, from_date, to_date)
        result["bom_overall"] = data

    return result

def overall(doc_item, start_date, end_date):
    if not doc_item:
        return {"qty": 0, "produced_qty": 0}

    if doc_item.has_variants:
        item_list = [d.name for d in frappe.get_all(
            "Item",
            filters={"variant_of": doc_item.name, "disabled": 0},
            fields=["name"]
        )]
    else:
        item_list = [doc_item.name]

    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "production_item": ["in", item_list],
            "planned_start_date": [">=", start_date],
            "actual_end_date": ["<", end_date + timedelta(days=1)],
            "docstatus": ["!=", 2]
        },
        fields=["qty", "produced_qty"]
    )

    total_qty = sum(wo.get("qty", 0) for wo in wo_list)
    total_produced = sum(wo.get("produced_qty", 0) for wo in wo_list)
    return {"qty": total_qty, "produced_qty": total_produced}

def category_overall(doc_item, start_date, end_date, attribute_name="Phân loại"):
    if not doc_item:
        return {}

    # Lấy danh sách items (bao gồm variants)
    if getattr(doc_item, "has_variants", False):
        item_list = frappe.db.get_all(
            'Item', filters={"variant_of": doc_item.name, "disabled": 0}, pluck='name'
        )
    else:
        item_list = [getattr(doc_item, "name", doc_item)]

    # Lấy tất cả categories
    categories = frappe.get_all("Manufacturing Category", pluck="name")
    if not categories:
        categories = ["Chung"]

    # Nếu có attribute_name thì lấy danh sách attribute values
    if attribute_name:
        all_attrs = frappe.db.get_all(
            "Item Variant Attribute",
            filters={"parent": ["in", item_list], "attribute": attribute_name},
            pluck="attribute_value"
        )
        all_attrs = list(set(all_attrs)) or ["Khác"]
    else:
        all_attrs = [None]  # Chỉ có main

    # Tạo dict sẵn cho các category
    result = {}
    item_label = getattr(doc_item, "item_name", doc_item)
    for cat_name in categories:
        if attribute_name:
            result[cat_name] = {
                f"{item_label} {attr}": {"qty": 0, "work_orders": []}
                for attr in all_attrs
            }
        else:
            result[cat_name] = {f"{item_label}": {"qty": 0, "work_orders": []}}

    # Lấy tất cả Work Orders trong khoảng
    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "planned_start_date": [">=", start_date],
            "actual_end_date": ["<", end_date + timedelta(days=1)],
            "production_item": ["in", item_list],
            "docstatus": ["!=", 2]
        },
        fields=["name", "produced_qty", "production_item", "custom_category"]
    )

    for wo in wo_list:
        # Xác định category
        if wo.custom_category and wo.custom_category in categories:
            cat_name = wo.custom_category
        else:
            cat_name = "Chung"

        # Nếu chưa có key "Chung" mà có dữ liệu, thì khởi tạo
        if cat_name == "Chung" and cat_name not in result:
            if attribute_name:
                result[cat_name] = {
                    f"{item_label} {attr}": {"qty": 0, "work_orders": []}
                    for attr in all_attrs
                }
            else:
                result[cat_name] = {f"{item_label}": {"qty": 0, "work_orders": []}}

        # Xác định key
        if attribute_name:
            attr_value = frappe.db.get_value(
                "Item Variant Attribute",
                {"parent": wo.production_item, "attribute": attribute_name},
                "attribute_value"
            ) or "Khác"
            key = f"{item_label} {attr_value}"
        else:
            key = f"{item_label}"

        if key not in result[cat_name]:
            result[cat_name][key] = {"qty": 0, "work_orders": []}

        result[cat_name][key]["qty"] += wo.get("produced_qty", 0)
        result[cat_name][key]["work_orders"].append(wo.name)

    return result

@frappe.whitelist()
def attribute_overall(main, from_date, to_date, attribute="Phân loại", category=None):
    """
    Lấy tổng qty và produced_qty theo attribute của main item trong một category.
    Nếu attribute=None thì gom chung vào main item.
    Nếu category=None thì lấy category đầu tiên tìm được.
    Nếu không có Manufacturing Category nào thì fallback về 'Chung'.
    Nếu Work Order không có category thì cũng coi là 'Chung'.
    """
    if isinstance(from_date, str):
        from_date = frappe.utils.getdate(from_date)
    if isinstance(to_date, str):
        to_date = frappe.utils.getdate(to_date)

    # Nếu main là str, lấy doc
    if isinstance(main, str):
        main = frappe.get_doc("Item", main)

    # Lấy danh sách variants
    if getattr(main, "has_variants", False):
        item_list = frappe.db.get_all(
            "Item", filters={"variant_of": main.name, "disabled": 0}, pluck="name"
        )
    else:
        item_list = [main.name]

    # Lấy category nếu chưa có
    if not category:
        categories = frappe.get_all("Manufacturing Category", pluck="name")
        category = categories[0] if categories else None

    # Nếu không có category nào trong hệ thống thì dùng 'Chung'
    if not category:
        category = "Chung"

    # Nếu có attribute thì lấy giá trị attribute, nếu không thì chỉ có main
    if attribute:
        all_attrs = frappe.db.get_all(
            "Item Variant Attribute",
            filters={"parent": ["in", item_list], "attribute": attribute},
            pluck="attribute_value"
        )
        all_attrs = list(set(all_attrs)) or ["Khác"]
        result = {
            attr: {"qty": 0, "produced_qty": 0, "label": f"{main.item_name} {attr}"}
            for attr in all_attrs
        }
    else:
        # Gom chung vào main
        result = {
            main.item_name: {"qty": 0, "produced_qty": 0, "label": main.item_name}
        }

    # Lấy danh sách Work Order
    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "production_item": ["in", item_list],
            "planned_start_date": [">=", from_date],
            "actual_end_date": ["<", to_date + timedelta(days=1)],
            "docstatus": ["!=", 2]
        },
        fields=["name", "qty", "produced_qty", "production_item", "custom_category"]
    )

    # Cộng dồn kết quả
    for wo in wo_list:
        wo_category = wo.get("custom_category") or "Chung"
        if wo_category != category:
            continue  # bỏ qua nếu khác category cần lấy

        if attribute:
            try:
                attr_value = frappe.db.get_value(
                    "Item Variant Attribute",
                    {"parent": wo.production_item, "attribute": attribute},
                    "attribute_value"
                ) or "Khác"
            except Exception:
                attr_value = "Khác"

            if attr_value not in result:
                result[attr_value] = {
                    "qty": 0, "produced_qty": 0, "label": f"{main.item_name} {attr_value}"
                }

            key = attr_value
        else:
            key = main.item_name

        result[key]["qty"] += wo.get("qty", 0)
        result[key]["produced_qty"] += wo.get("produced_qty", 0)

    result = dict(sorted(result.items(), key=lambda x: x[0]))
    return result

def manufacturing_overall(main, from_date, to_date, sub=None):
    """
    Tính tổng qty và produced_qty của Work Orders theo ngày.
    planned_start_date -> qty
    actual_end_date -> produced_qty
    main và sub đều có thể là Item object (hoặc str)
    Trả về dict dạng:
    {
        "YYYY-MM-DD": {
            "main": {
                "qty": ...,
                "produced_qty": ...,
                "qty_wo": [...],
                "produced_qty_wo": [...]
            },
            "sub": {...}
        }
    }
    """
    # Chuẩn hóa main
    if isinstance(main, str):
        main = frappe.get_doc("Item", main)

    main_items = [main.name]
    if getattr(main, "has_variants", False):
        main_items.extend(frappe.db.get_all("Item", filters={"variant_of": main.name, "disabled": 0}, pluck="name"))

    # Chuẩn hóa sub
    sub_items = []
    if sub:
        if isinstance(sub, str):
            sub = frappe.get_doc("Item", sub)
        sub_items = [sub.name]
        if getattr(sub, "has_variants", False):
            sub_items.extend(frappe.db.get_all("Item", filters={"variant_of": sub.name, "disabled": 0}, pluck="name"))

    # Lấy tất cả Work Orders trong khoảng thời gian cho main + sub
    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "planned_start_date": [">=", from_date],
            "actual_end_date": ["<", to_date + timedelta(days=1)],
            "production_item": ["in", main_items + sub_items],
            "docstatus": ["!=", 2]
        },
        fields=["name", "qty", "produced_qty", "planned_start_date", "actual_end_date", "production_item"]
    )

    # Khởi tạo dict kết quả
    result = defaultdict(lambda: {
        "main": {"qty": 0, "produced_qty": 0, "qty_wo": [], "produced_qty_wo": []},
        "sub": {"qty": 0, "produced_qty": 0, "qty_wo": [], "produced_qty_wo": []}
    })

    for wo in wo_list:
        planned_date = wo.planned_start_date.date() if wo.planned_start_date else None
        actual_date = wo.actual_end_date.date() if wo.actual_end_date else None

        if wo.production_item in main_items:
            target = "main"
        elif wo.production_item in sub_items:
            target = "sub"
        else:
            continue

        # Ghi nhận kế hoạch theo ngày planned
        if planned_date and from_date <= planned_date <= to_date:
            planned_remaining = wo.get("qty", 0) - wo.get("produced_qty", 0)
            if planned_remaining > 0:
                result[str(planned_date)][target]["qty"] += planned_remaining
                result[str(planned_date)][target]["qty_wo"].append(wo.name)

        # Ghi nhận thực tế theo ngày actual
        if actual_date and from_date <= actual_date <= to_date:
            produced = wo.get("produced_qty", 0)
            if produced > 0:
                result[str(actual_date)][target]["produced_qty"] += produced
                result[str(actual_date)][target]["produced_qty_wo"].append(wo.name)


    # Sắp xếp theo ngày
    sorted_result = dict(sorted(result.items()))
    return sorted_result

def bom_overall(main, from_date, to_date):
    """
    Tính tổng qty và produced_qty của nguyên liệu (BOM) theo ngày.
    - qty = required_qty của item / wo.qty
    - produced_qty = consumed_qty của item / wo.produced_qty
    Trả về dict dạng:
    {
        "YYYY-MM-DD": {
            "item_code": {"qty":..., "produced_qty":..., "label": item_name}
        }
    }
    """
    # Chuẩn hóa main
    if isinstance(main, str):
        main = frappe.get_doc("Item", main)

    # Lấy danh sách items (bao gồm variants nếu có)
    item_list = [main.name]
    if getattr(main, "has_variants", False):
        item_list.extend(frappe.db.get_all("Item", filters={"variant_of": main.name, "disabled": 0}, pluck="name"))

    # Lấy tất cả Work Orders của main item / variants trong khoảng
    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "production_item": ["in", item_list],
            "planned_start_date": [">=", from_date],
            "actual_end_date": ["<", to_date + timedelta(days=1)],
            "docstatus": 1
        },
        fields=["name", "qty", "produced_qty", "actual_end_date"]
    )

    result = defaultdict(dict)

    for wo in wo_list:
        wo_doc = frappe.get_doc("Work Order", wo.name)
        actual_date = wo.actual_end_date.date() if wo.actual_end_date else None
        if not actual_date:
            continue

        for ri in wo_doc.required_items:
            if ri.item_code in item_list or ri.item_code == main.item_code:
                continue

            # Định mức kế hoạch trên 1 tấn thành phẩm
            planned_per_unit = (ri.required_qty / wo.qty) if wo.qty else 0

            # Tiêu hao thực tế trên 1 tấn thành phẩm
            actual_per_unit = (ri.consumed_qty / wo.produced_qty) if wo.produced_qty else 0

            # Phần vượt định mức trên 1 tấn
            over_per_unit = actual_per_unit - planned_per_unit if actual_per_unit > planned_per_unit else 0

            date_key = str(actual_date)
            if ri.item_code not in result[date_key]:
                result[date_key][ri.item_code] = {
                    "qty": 0,                # Tổng định mức (1 tấn)
                    "produced_qty": 0,       # Tổng vượt định mức (1 tấn)
                    "label": ri.item_name,
                    "work_order": [],
                    "work_order_norm": [],
                }

            # Cộng dồn theo ngày
            result[date_key][ri.item_code]["qty"] += planned_per_unit
            result[date_key][ri.item_code]["produced_qty"] += over_per_unit
            if over_per_unit:
                result[date_key][ri.item_code]["work_order"].append(wo.name)
            if planned_per_unit:
                result[date_key][ri.item_code]["work_order_norm"].append(wo.name)


    # Sắp xếp theo ngày
    sorted_result = dict(sorted(result.items()))
    print(sorted_result)
    return sorted_result
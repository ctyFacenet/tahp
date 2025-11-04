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
        data = category_overall(from_date, to_date)
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
            "planned_start_date": ["between", [start_date, end_date]],
            "docstatus": ["!=", 2]
        },
        fields=["qty", "produced_qty"]
    )

    total_qty = sum(wo.get("qty", 0) for wo in wo_list)
    total_produced = sum(wo.get("produced_qty", 0) for wo in wo_list)
    return {"qty": total_qty, "produced_qty": total_produced}

def category_overall(start_date, end_date):
    categories = frappe.get_all("Manufacturing Category", pluck="name")
    if not categories:
        categories = ["Chung"]

    result = {}

    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "planned_start_date": ["between", [start_date, end_date]],
            "docstatus": ["!=", 2]
        },
        fields=["name", "produced_qty", "production_item", "item_name", "custom_category"]
    )

    for wo in wo_list:
        cat_name = wo.custom_category if (wo.custom_category and wo.custom_category in categories) else "Chung"

        if cat_name not in result:
            result[cat_name] = {}

        if wo.production_item not in result[cat_name]:
            result[cat_name][wo.production_item] = {
                "qty": 0,
                "work_orders": [],
                "item_name": wo.item_name
            }

        result[cat_name][wo.production_item]["qty"] += wo.get("produced_qty", 0)
        result[cat_name][wo.production_item]["work_orders"].append(wo.name)

    return result

@frappe.whitelist()
def attribute_overall(main, from_date, to_date, attribute="Phân loại", category=None):
    # chuẩn hoá ngày
    if isinstance(from_date, str):
        from_date = frappe.utils.getdate(from_date)
    if isinstance(to_date, str):
        to_date = frappe.utils.getdate(to_date)

    if category == "Tất cả": category=None

    # nếu main là string thì lấy document (chủ yếu để có tên hiển thị)
    main_doc = None
    if isinstance(main, str):
        try:
            main_doc = frappe.get_doc("Item", main)
        except Exception:
            main_doc = None
    elif hasattr(main, "doctype"):
        main_doc = main

    # lấy danh sách work order (không lọc theo item)
    filters = {
        "planned_start_date": ["between", [from_date, to_date]],
        "docstatus": ["!=", 2],
    }
    if category:
        filters["custom_category"] = category

    wo_list = frappe.get_all(
        "Work Order",
        filters=filters,
        fields=["name", "qty", "produced_qty", "production_item", "custom_category"],
    )

    result = {}

    for wo in wo_list:
        qty = wo.get("qty") or 0
        produced_qty = wo.get("produced_qty") or 0
        prod_item = wo.get("production_item")

        # Lấy thông tin variant_of
        try:
            variant_of = frappe.db.get_value("Item", prod_item, "variant_of")
        except Exception:
            variant_of = None

        # Nếu có variant_of thì group theo item cha
        base_item = variant_of or prod_item

        # Lấy attribute_value nếu có attribute
        if attribute:
            try:
                attr_value = frappe.db.get_value(
                    "Item Variant Attribute",
                    {"parent": prod_item, "attribute": attribute},
                    "attribute_value"
                ) or ""
            except Exception:
                attr_value = ""

            if variant_of:
                subkey = f"{variant_of} - {attr_value}"
            else:
                subkey = f"{prod_item} - {attr_value}"
        else:
            subkey = base_item
            attr_value = None

        # Xác định label hiển thị
        try:
            item_name = frappe.db.get_value("Item", base_item, "item_name")
        except Exception:
            item_name = None

        if attr_value:
            label = f"{item_name or base_item} {attr_value}"
        else:
            label = item_name or base_item

        # Cộng dồn kết quả
        if subkey not in result:
            result[subkey] = {"qty": 0, "produced_qty": 0, "label": label}

        result[subkey]["qty"] += qty
        result[subkey]["produced_qty"] += produced_qty

    # sắp xếp theo key
    result = dict(sorted(result.items(), key=lambda x: x[0]))
    return result

def manufacturing_overall(main, from_date, to_date, sub=None):
    if isinstance(main, str):
        main = frappe.get_doc("Item", main)

    main_items = [main.name]
    if getattr(main, "has_variants", False):
        main_items.extend(frappe.db.get_all("Item", filters={"variant_of": main.name, "disabled": 0}, pluck="name"))

    sub_items = []
    if sub:
        if isinstance(sub, str):
            sub = frappe.get_doc("Item", sub)
        sub_items = [sub.name]
        if getattr(sub, "has_variants", False):
            sub_items.extend(frappe.db.get_all("Item", filters={"variant_of": sub.name, "disabled": 0}, pluck="name"))

    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "planned_start_date": ["between", [from_date, to_date]],
            "production_item": ["in", main_items + sub_items],
            "docstatus": ["!=", 2]
        },
        fields=["name", "qty", "produced_qty", "planned_start_date", "actual_end_date", "production_item"]
    )

    result = defaultdict(lambda: {
        "main": {"qty": 0, "produced_qty": 0, "qty_wo": [], "produced_qty_wo": []},
        "sub": {"qty": 0, "produced_qty": 0, "qty_wo": [], "produced_qty_wo": []}
    })

    for wo in wo_list:
        # Ngày ghi nhận = actual_start_date nếu có, ngược lại lấy planned_start_date
        ref_date = wo.planned_start_date
        if not ref_date:
            continue  # bỏ qua nếu không có ngày nào

        ref_date = ref_date.date()
        if not (from_date <= ref_date <= to_date):
            continue  # bỏ qua nếu ngoài khoảng thời gian

        # Xác định loại item
        if wo.production_item in main_items:
            target = "main"
        elif wo.production_item in sub_items:
            target = "sub"
        else:
            continue

        # Ghi nhận kế hoạch (qty)
        planned_remaining = wo.get("qty", 0) - wo.get("produced_qty", 0)
        if planned_remaining > 0:
            result[str(ref_date)][target]["qty"] += planned_remaining
            result[str(ref_date)][target]["qty_wo"].append(wo.name)

        # Ghi nhận thực tế (produced_qty)
        produced = wo.get("produced_qty", 0)
        if produced > 0:
            result[str(ref_date)][target]["produced_qty"] += produced
            result[str(ref_date)][target]["produced_qty_wo"].append(wo.name)


    # Sắp xếp theo ngày
    sorted_result = dict(sorted(result.items()))
    return sorted_result

def bom_overall(main, from_date, to_date):
    if isinstance(main, str):
        main = frappe.get_doc("Item", main)

    item_list = [main.name]
    if getattr(main, "has_variants", False):
        item_list.extend(
            frappe.db.get_all(
                "Item",
                filters={"variant_of": main.name, "disabled": 0},
                pluck="name"
            )
        )

    wo_list = frappe.get_all(
        "Work Order",
        filters={
            "production_item": ["in", item_list],
            "planned_start_date": ["between", [from_date, to_date]],
            "docstatus": 1
        },
        fields=["name", "qty", "produced_qty", "planned_start_date"]
    )

    result = defaultdict(dict)

    for wo in wo_list:
        wo_doc = frappe.get_doc("Work Order", wo.name)
        planned_date = wo.planned_start_date.date()
        if not planned_date: continue
        date_key = str(planned_date)

        for ri in wo_doc.required_items:
            if ri.item_code in item_list or ri.item_code == main.item_code: continue
            planned_per_unit = (ri.required_qty / wo.qty) if wo.qty else 0
            actual_per_unit = (ri.consumed_qty / wo.produced_qty) if wo.produced_qty else 0
            over_per_unit = actual_per_unit - planned_per_unit if actual_per_unit > planned_per_unit else 0

            if ri.item_code not in result[date_key]:
                result[date_key][ri.item_code] = {
                    "qty": 0,
                    "produced_qty": 0,
                    "label": ri.item_name,
                    "work_order": [],
                    "work_order_norm": [],
                    "unit": ri.stock_uom
                }

            result[date_key][ri.item_code]["qty"] += planned_per_unit
            result[date_key][ri.item_code]["produced_qty"] += over_per_unit
            if over_per_unit:
                result[date_key][ri.item_code]["work_order"].append(wo.name)
            if planned_per_unit:
                result[date_key][ri.item_code]["work_order_norm"].append(wo.name)

    sorted_result = dict(sorted(result.items()))
    print(sorted_result)
    return sorted_result
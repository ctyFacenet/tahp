import frappe


@frappe.whitelist()
def get_data(filters=None):
    filters = filters or {}
    db_filters = {"is_manual_price": 1}
    for key in ["item_code", "item_name", "item_group", "supplier", "origin"]:
        val = filters.get(key) if filters else None
        if val:
            db_filters[key] = ["like", f"%{val}%"]

    docs = frappe.get_all(
        "Supplier Item Rate",
        filters=db_filters,
        fields=[
            "name",
            "item_code",
            "item_name",
            "item_group",
            "supplier",
            "origin",
            "rate",
            "old_rate",
            "recent_rate",
            "recent_rate_date",
            "order_rate",
            "order_date",
            "modified"
        ],
        order_by="modified desc",
        limit_page_length=500
    )
    return docs

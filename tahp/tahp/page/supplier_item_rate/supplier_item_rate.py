import frappe

@frappe.whitelist()
def get_data(filters=None):
    filters = filters or {}
    db_filters = {"is_manual_price": 1}
    # Áp dụng filter động từ client
    for key in ["item_code", "item_name", "item_group", "supplier", "origin"]:
        val = filters.get(key) if filters else None
        if val:
            db_filters[key] = ["like", f"%{val}%"]

    docs = frappe.get_all(
        "Supplier Item Rate",
        filters=db_filters,
        fields=[
            "item_code",
            "item_name",
            "item_group",
            "supplier",
            "origin",
            "rate"
        ],
        order_by="modified desc",
        limit_page_length=500
    )
    return docs

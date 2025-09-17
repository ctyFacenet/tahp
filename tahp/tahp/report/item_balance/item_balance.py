# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
    columns = [
        "Mã mặt hàng:Link/Item:150",
        "Tên mặt hàng:Data:200",
        "SL đang có:Float:120",
        "Nhà kho:Link/Warehouse:250",
        "Nhóm mặt hàng:Link/Item Group:220"
    ]

    data = frappe.db.sql(f"""
        SELECT
            a.item_code,
            a.item_name,
            b.actual_qty,
            b.warehouse,
            a.item_group
        FROM `tabItem` a
        LEFT JOIN `tabBin` b ON a.item_code = b.item_code
    """, as_list=True)

    return columns, data

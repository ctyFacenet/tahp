# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
    columns = [
        {"label": "Thời gian", "fieldname": "posting_datetime", "fieldtype": "Datetime", "width": 200},
        {"label": "Mã Phiếu Kho", "fieldname": "custom_code", "fieldtype": "Data", "width": 140},
        {"label": "Mã SP", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 210},
        {"label": "SL vào", "fieldname": "qty_in", "fieldtype": "Float", "width": 100},
        {"label": "SL ra", "fieldname": "qty_out", "fieldtype": "Float", "width": 100},
        {"label": "SL Tồn Kho", "fieldname": "qty_after_transaction", "fieldtype": "Float", "width": 120},
        {"label": "Kho", "fieldname": "warehouse", "fieldtype": "Link", "options": "Warehouse", "width": 250},
        {"label": "Nhóm hàng", "fieldname": "item_group", "fieldtype": "Link", "options": "Item Group", "width": 250},
        {"label": "Loại chứng từ", "fieldname": "stock_entry_type", "fieldtype": "Data", "width": 140}
    ]

    data = frappe.db.sql("""
        SELECT
            sle.posting_datetime AS posting_datetime,
            se.custom_code AS custom_code,
            sle.item_code AS item_code,
            CASE WHEN sle.actual_qty > 0 THEN sle.actual_qty ELSE 0 END AS qty_in,
            CASE WHEN sle.actual_qty < 0 THEN ABS(sle.actual_qty) ELSE 0 END AS qty_out,
            sle.qty_after_transaction AS qty_after_transaction,
            sle.warehouse AS warehouse,
            i.item_group AS item_group,
            se.stock_entry_type AS stock_entry_type
        FROM `tabStock Ledger Entry` sle
        LEFT JOIN `tabStock Entry` se 
            ON se.name = sle.voucher_no AND sle.voucher_type = 'Stock Entry'
        LEFT JOIN `tabItem` i ON i.item_code = sle.item_code
        WHERE sle.docstatus = 1
        ORDER BY sle.posting_datetime DESC
    """, filters, as_dict=True)

    return columns, data

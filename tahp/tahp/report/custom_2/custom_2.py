# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe


def execute(filters=None):
    columns = [
        {"label": "Mã SP", "fieldname": "item_code", "fieldtype": "Data", "width": 120},
        {"label": "Tên SP", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
        {"label": "Số lượng", "fieldname": "qty", "fieldtype": "Float", "width": 100},
    ]

    data = [
        {"item_code": "SP001", "item_name": "Cà phê sữa đá", "qty": 42},
        {"item_code": "SP002", "item_name": "Bánh mì thịt nướng", "qty": 17.5},
    ]
    print('meow meow chan chan')

    return columns, data

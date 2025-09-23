# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe


import frappe

def execute(filters=None):
    columns = [
        {"label": "Item", "fieldname": "item", "fieldtype": "Data", "width": 150},
        {"label": "Quantity", "fieldname": "qty", "fieldtype": "Int", "width": 100},
    ]

    data = [
        {"item": "Item A", "qty": 10},
        {"item": "Item B", "qty": 5},
    ]

    # You can return a message string here
    message = "This report shows the total quantity per item for the selected filters."

    return columns, data, message


import frappe

def after_insert(doc, method):
    for item in doc.items:
        item.bom_no = None
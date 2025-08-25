import frappe

def before_save(doc, method):
    frappe.msgprint('before 1')

def before_save_2(doc, method):
    frappe.msgprint('before 2')
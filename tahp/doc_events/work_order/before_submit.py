import frappe

def before_submit(doc, method):
    if doc.status == "Not Started":
        pass    

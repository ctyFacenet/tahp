import frappe
from tahp.tahp.doctype.shift_handover.shift_handover import create_shift_handover

def on_submit(doc, method):
    if doc.status == "Not Started":
        create_shift_handover(doc.name)
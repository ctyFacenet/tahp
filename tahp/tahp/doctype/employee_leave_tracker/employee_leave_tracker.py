# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class EmployeeLeaveTracker(Document):
	pass

@frappe.whitelist()
def generate_short_name(name):
    if not name:
        return ''
    first = ''.join([n.strip()[0].upper() for n in name.split() if n.strip()] )
    count = frappe.get_all(
        'Employee Leave Tracker',
        fields = ['name'],
        filters = {'employee' : name}
		
	)
    count = len(count)
    seq = count + 1
    return f'{first}{seq}'
import frappe

def high_priority():
    tmp = frappe.get_all('Employee Leave Tracker', 
                         fields = ['employee', 'from_date', 'to_date', 'priority', 'reason'], 
                         filters = {'priority' : 'high'}, 
                         order_by = 'employee'
    )
    if not tmp:
        return
    return tmp
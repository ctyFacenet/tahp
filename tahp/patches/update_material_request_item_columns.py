import frappe
"""Set Material Request Item có 10 cột  """
def execute():
    
    
    doc = frappe.get_doc('DocType', 'Material Request Item')
    
    # Fields to be visible with columns=1
    visible_fields = {
        'item_code': 1,
        'item_name': 1,
        'uom': 1,
        'custom_origin': 1,
        'custom_current_stock': 1,
        'qty': 1,
        'custom_actual_qty_v1': 1,
        'custom_estimated_rate': 1,
        'custom_estimated_amount': 1,
        'custom_required_date': 1
    }
    
    for field in doc.fields:
        if field.fieldname in visible_fields:
            field.columns = visible_fields[field.fieldname]
            field.in_list_view = 1
        else:
            # Hide other fields from list view
            field.in_list_view = 0
    
    doc.save()
    
    

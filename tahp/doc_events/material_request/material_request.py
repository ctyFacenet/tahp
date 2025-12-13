import frappe

def validate(doc, method):
    """
    Tính tổng thành tiền dự kiến từ Material Request Items
    """
    total = 0
    for item in doc.items:
        if item.custom_estimated_amount:
            total += item.custom_estimated_amount
    
    doc.custom_total_estimated_amount = total

@frappe.whitelist()
def get_approved_week_work_orders():
    """
    Lấy tất cả Week Work Order đã duyệt kèm BOM và quantity trong 1 lần 
    """
    wwo_list = frappe.get_all(
        'Week Work Order',
        filters={'workflow_state': 'Duyệt xong'},
        fields=['name'],
        order_by='creation desc'
    )
    
    result = []
    for wwo in wwo_list:
        items = frappe.get_all(
            'Week Work Order Item',  
            filters={
                'parent': wwo.name,
                'bom': ['!=', '']  
            },
            fields=['bom', 'planned_start_time', 'qty'],
            order_by='planned_start_time asc'
        )
        
        if items:
            # Lấy quantity từ BOM cho mỗi item
            for item in items:
                bom_doc = frappe.get_doc('BOM', item['bom'])
                item['bom_quantity'] = bom_doc.quantity or 1
            
            dates = [item['planned_start_time'] for item in items if item.get('planned_start_time')]
            planned_date = min(dates) if dates else None
            
            result.append({
                'wwo': wwo.name,
                'planned_start_time': planned_date,
                'items': items
            })
    
    return result

@frappe.whitelist()
def get_supplier_item_rate(item_code):
    """
    Lấy đơn giá và xuất xứ từ Supplier Item Rate cho mã mặt hàng
    """
    if not item_code:
        return {}
    
    # Lấy giá từ Supplier Item Rate
    supplier_item_rate = frappe.get_all(
        'Supplier Item Rate',
        filters={
            'item_code': item_code
        },
        fields=['rate', 'origin'],
        order_by='modified desc',
        limit=1
    )
    
    if supplier_item_rate:
        return {
            'rate': supplier_item_rate[0].get('rate', 0),
            'origin': supplier_item_rate[0].get('origin', '')
        }
    
    return {'rate': 0, 'origin': ''}
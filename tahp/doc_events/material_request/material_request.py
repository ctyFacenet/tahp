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

@frappe.whitelist()
def get_production_targets_with_boms(target_names=None):
    """
    Lấy danh sách Production Target kèm items và BOM của mỗi item
    target_names: Optional list of specific target names to fetch
    """
    import json
    
    # Parse target_names if provided as JSON string
    if target_names and isinstance(target_names, str):
        target_names = json.loads(target_names)
    
    # Build filters
    filters = {'docstatus': 1}
    if target_names:
        filters['name'] = ['in', target_names]
    
    # Lấy Production Target đã submit
    targets = frappe.get_all(
        'Production Target',
        filters=filters,
        fields=['name', 'from_date', 'to_date', 'reason'],
        order_by='from_date desc'
    )
    
    result = []
    for target in targets:
        # Lấy items của Production Target
        items = frappe.get_all(
            'Production Target Item',
            filters={'parent': target.name},
            fields=['item_code', 'item_name', 'qty', 'stock_uom']
        )
        
        # Lấy BOM cho mỗi item (BOM có item = mã thành phẩm)
        for item in items:
            # Query BOM có item (thành phẩm) = item_code này
            boms = frappe.db.sql("""
                SELECT name
                FROM `tabBOM`
                WHERE item = %(item_code)s
                    AND is_active = 1
                    AND docstatus = 1
                ORDER BY modified DESC
            """, {'item_code': item.item_code}, as_dict=True)
            
            item['boms'] = [b.name for b in boms]
            
            # Debug log
            if not item['boms']:
                frappe.logger().debug(f"Không tìm thấy BOM cho thành phẩm {item.item_code}")
        
        result.append({
            'name': target.name,
            'from_date': target.from_date,
            'to_date': target.to_date,
            'reason': target.reason,
            'items': items
        })
    
    return result

@frappe.whitelist()
def get_bom_items_batch(bom_list):
    """
    Lấy items của nhiều BOM cùng lúc để tối ưu performance
    bom_list: JSON string của list [{bom: 'BOM-001', qty: 300}, ...]
    """
    import json
    
    if isinstance(bom_list, str):
        bom_list = json.loads(bom_list)
    
    result = {}
    
    for bom_data in bom_list:
        bom_name = bom_data.get('bom')
        bom_qty = bom_data.get('qty', 1)
        
        if not bom_name:
            continue
            
        # Lấy BOM items
        bom_items = frappe.get_all(
            'BOM Item',
            filters={'parent': bom_name},
            fields=[
                'item_code', 'item_name', 'description', 
                'qty', 'stock_qty', 'uom', 'stock_uom', 
                'source_warehouse'
            ]
        )
        
        result[bom_name] = {
            'qty': bom_qty,
            'items': bom_items
        }
    
    return result

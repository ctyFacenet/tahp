# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
import hashlib
import colorsys
import json
from collections import Counter

def color_from_text(text):
    """Sinh màu rực rỡ từ text"""
    h = int(hashlib.md5(text.encode()).hexdigest(), 16)
    hue = (h % 360) / 360.0
    saturation = 0.85
    lightness = 0.65
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    return '#{0:02x}{1:02x}{2:02x}'.format(int(r * 255), int(g * 255), int(b * 255))


def normalize_dates(from_date, to_date):
    """Chuẩn hóa from_date và to_date"""
    min_date = frappe.utils.getdate("2025-01-01")
    today = frappe.utils.getdate(frappe.utils.today())

    from_date = from_date if from_date else None
    to_date = to_date if to_date else None

    if from_date:
        from_date = frappe.utils.getdate(from_date)
    if to_date:
        to_date = frappe.utils.getdate(to_date)

    if from_date and not to_date:
        to_date = today
    elif to_date and not from_date:
        from_date = min_date
    elif not from_date and not to_date:
        from_date = min_date
        to_date = today

    return from_date, to_date


def execute(filters=None):
    filters = filters or {}
    
    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except:
            filters = {}
    
    from_date, to_date = normalize_dates(filters.get("from_date"), filters.get("to_date"))
    
    columns = [
        {"label": "Nhà cung cấp", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", 'dropdown': False, 'sortable': False, "width": 220},
        {"label": "Loại mặt hàng", "fieldname": "item_category", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Giá trị đơn hàng", "fieldname": "order_value", "fieldtype": "Currency", 'dropdown': False, 'sortable': False, "width": 230},
        {"label": "Tỷ trọng chi phí", "fieldname": "cost_ratio", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Ngày đặt", "fieldname": "order_date", "fieldtype": "Date", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "% Đúng hạn", "fieldname": "on_time_percentage", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "% Chất lượng", "fieldname": "quality_percentage", "fieldtype": "Percent", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "Điểm đánh giá", "fieldname": "rating_score", "fieldtype": "Float", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "Xếp hạng", "fieldname": "ranking", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 140, "align": "center"},
        {"label": "Đánh giá sau sử dụng", "fieldname": "post_usage_review", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 300, "align": "left"},
    ]
    
    # TODO: Thay data mẫu bằng query thực từ database
    # Cấu trúc data với parent-child relationship
    raw_data = [
        # Công ty A - Parent
        {
            "supplier": "Công ty A",
            "item_category": "",
            "order_value": 75000000,
            "cost_ratio": 35.0,
            "order_date": "2025-09-03",
            "on_time_percentage": 89.3,
            "quality_percentage": 85.0,
            "rating_score": 4.2,
            "ranking": "Tốt",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00001",
            "item_category": "Nguyên liệu thô",
            "order_value": 10000000,
            "cost_ratio": 13.3,
            "order_date": "2025-09-04",
            "on_time_percentage": 70.0,
            "quality_percentage": 70.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Sản phẩm vỏi có vấn đề, chất lượng biến dạng",
            "indent": 1,
            "parent_supplier": "Công ty A"
        },
        {
            "supplier": "PO-2025-00002",
            "item_category": "Nguyên liệu thô",
            "order_value": 20000000,
            "cost_ratio": 26.7,
            "order_date": "2025-09-05",
            "on_time_percentage": 100.0,
            "quality_percentage": 90.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Sản phẩm đạt chất lượng, giao đúng hạn",
            "indent": 1,
            "parent_supplier": "Công ty A"
        },
        {
            "supplier": "PO-2025-00003",
            "item_category": "Nguyên liệu thô",
            "order_value": 15000000,
            "cost_ratio": 20.0,
            "order_date": "2025-09-10",
            "on_time_percentage": 95.0,
            "quality_percentage": 88.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng ổn định",
            "indent": 1,
            "parent_supplier": "Công ty A"
        },
        {
            "supplier": "PO-2025-00004",
            "item_category": "Nguyên liệu thô",
            "order_value": 30000000,
            "cost_ratio": 40.0,
            "order_date": "2025-09-15",
            "on_time_percentage": 92.0,
            "quality_percentage": 92.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Đơn hàng lớn, giao hàng tốt",
            "indent": 1,
            "parent_supplier": "Công ty A"
        },
        
        # Công ty B - Parent
        {
            "supplier": "Công ty B",
            "item_category": "",
            "order_value": 120000000,
            "cost_ratio": 45.0,
            "order_date": "2025-09-01",
            "on_time_percentage": 93.5,
            "quality_percentage": 91.0,
            "rating_score": 4.5,
            "ranking": "Xuất sắc",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00005",
            "item_category": "Phụ kiện",
            "order_value": 40000000,
            "cost_ratio": 33.3,
            "order_date": "2025-09-02",
            "on_time_percentage": 88.0,
            "quality_percentage": 85.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Giao hàng đúng hạn, chất lượng tốt",
            "indent": 1,
            "parent_supplier": "Công ty B"
        },
        {
            "supplier": "PO-2025-00006",
            "item_category": "Phụ kiện",
            "order_value": 35000000,
            "cost_ratio": 29.2,
            "order_date": "2025-09-08",
            "on_time_percentage": 95.0,
            "quality_percentage": 93.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng vượt mong đợi",
            "indent": 1,
            "parent_supplier": "Công ty B"
        },
        {
            "supplier": "PO-2025-00007",
            "item_category": "Phụ kiện",
            "order_value": 25000000,
            "cost_ratio": 20.8,
            "order_date": "2025-09-12",
            "on_time_percentage": 97.0,
            "quality_percentage": 95.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Đối tác tin cậy",
            "indent": 1,
            "parent_supplier": "Công ty B"
        },
        {
            "supplier": "PO-2025-00008",
            "item_category": "Phụ kiện",
            "order_value": 20000000,
            "cost_ratio": 16.7,
            "order_date": "2025-09-18",
            "on_time_percentage": 94.0,
            "quality_percentage": 91.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Sản phẩm đạt chuẩn",
            "indent": 1,
            "parent_supplier": "Công ty B"
        },
        
        # Công ty C - Parent
        {
            "supplier": "Công ty C",
            "item_category": "",
            "order_value": 55000000,
            "cost_ratio": 28.0,
            "order_date": "2025-09-05",
            "on_time_percentage": 82.0,
            "quality_percentage": 80.0,
            "rating_score": 3.8,
            "ranking": "Trung Bình",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00009",
            "item_category": "Vật liệu đóng gói",
            "order_value": 18000000,
            "cost_ratio": 32.7,
            "order_date": "2025-09-06",
            "on_time_percentage": 75.0,
            "quality_percentage": 78.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Giao hàng chậm 2 ngày",
            "indent": 1,
            "parent_supplier": "Công ty C"
        },
        {
            "supplier": "PO-2025-00010",
            "item_category": "Vật liệu đóng gói",
            "order_value": 22000000,
            "cost_ratio": 40.0,
            "order_date": "2025-09-11",
            "on_time_percentage": 85.0,
            "quality_percentage": 82.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Cải thiện về thời gian giao hàng",
            "indent": 1,
            "parent_supplier": "Công ty C"
        },
        {
            "supplier": "PO-2025-00011",
            "item_category": "Vật liệu đóng gói",
            "order_value": 15000000,
            "cost_ratio": 27.3,
            "order_date": "2025-09-16",
            "on_time_percentage": 86.0,
            "quality_percentage": 80.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng ổn định",
            "indent": 1,
            "parent_supplier": "Công ty C"
        },
        
        # Công ty D - Parent
        {
            "supplier": "Công ty D",
            "item_category": "",
            "order_value": 95000000,
            "cost_ratio": 38.0,
            "order_date": "2025-09-07",
            "on_time_percentage": 96.0,
            "quality_percentage": 94.0,
            "rating_score": 4.7,
            "ranking": "Xuất sắc",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00012",
            "item_category": "Linh kiện điện tử",
            "order_value": 28000000,
            "cost_ratio": 29.5,
            "order_date": "2025-09-08",
            "on_time_percentage": 98.0,
            "quality_percentage": 96.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng cao, giao hàng nhanh",
            "indent": 1,
            "parent_supplier": "Công ty D"
        },
        {
            "supplier": "PO-2025-00013",
            "item_category": "Linh kiện điện tử",
            "order_value": 32000000,
            "cost_ratio": 33.7,
            "order_date": "2025-09-13",
            "on_time_percentage": 97.0,
            "quality_percentage": 95.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Đối tác uy tín",
            "indent": 1,
            "parent_supplier": "Công ty D"
        },
        {
            "supplier": "PO-2025-00014",
            "item_category": "Linh kiện điện tử",
            "order_value": 35000000,
            "cost_ratio": 36.8,
            "order_date": "2025-09-19",
            "on_time_percentage": 93.0,
            "quality_percentage": 91.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Sản phẩm chất lượng cao",
            "indent": 1,
            "parent_supplier": "Công ty D"
        },
        
        # Công ty E - Parent
        {
            "supplier": "Công ty E",
            "item_category": "",
            "order_value": 42000000,
            "cost_ratio": 22.0,
            "order_date": "2025-09-10",
            "on_time_percentage": 88.0,
            "quality_percentage": 87.0,
            "rating_score": 4.1,
            "ranking": "Tốt",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00015",
            "item_category": "Nguyên liệu thô",
            "order_value": 12000000,
            "cost_ratio": 28.6,
            "order_date": "2025-09-11",
            "on_time_percentage": 85.0,
            "quality_percentage": 84.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Giao hàng đúng hạn",
            "indent": 1,
            "parent_supplier": "Công ty E"
        },
        {
            "supplier": "PO-2025-00016",
            "item_category": "Nguyên liệu thô",
            "order_value": 15000000,
            "cost_ratio": 35.7,
            "order_date": "2025-09-14",
            "on_time_percentage": 90.0,
            "quality_percentage": 88.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng tốt",
            "indent": 1,
            "parent_supplier": "Công ty E"
        },
        {
            "supplier": "PO-2025-00017",
            "item_category": "Nguyên liệu thô",
            "order_value": 15000000,
            "cost_ratio": 35.7,
            "order_date": "2025-09-20",
            "on_time_percentage": 89.0,
            "quality_percentage": 89.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Dịch vụ tốt",
            "indent": 1,
            "parent_supplier": "Công ty E"
        },
        
        # Công ty F - Parent
        {
            "supplier": "Công ty F",
            "item_category": "",
            "order_value": 68000000,
            "cost_ratio": 31.0,
            "order_date": "2025-09-12",
            "on_time_percentage": 91.0,
            "quality_percentage": 89.0,
            "rating_score": 4.3,
            "ranking": "Tốt",
            "post_usage_review": "",
            "indent": 0,
        },
        {
            "supplier": "PO-2025-00018",
            "item_category": "Phụ kiện",
            "order_value": 23000000,
            "cost_ratio": 33.8,
            "order_date": "2025-09-13",
            "on_time_percentage": 92.0,
            "quality_percentage": 90.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Sản phẩm tốt, giao đúng hạn",
            "indent": 1,
            "parent_supplier": "Công ty F"
        },
        {
            "supplier": "PO-2025-00019",
            "item_category": "Phụ kiện",
            "order_value": 25000000,
            "cost_ratio": 36.8,
            "order_date": "2025-09-17",
            "on_time_percentage": 93.0,
            "quality_percentage": 91.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Chất lượng ổn định",
            "indent": 1,
            "parent_supplier": "Công ty F"
        },
        {
            "supplier": "PO-2025-00020",
            "item_category": "Phụ kiện",
            "order_value": 20000000,
            "cost_ratio": 29.4,
            "order_date": "2025-09-21",
            "on_time_percentage": 88.0,
            "quality_percentage": 86.0,
            "rating_score": 0.0,
            "ranking": "",
            "post_usage_review": "Đơn hàng đạt yêu cầu",
            "indent": 1,
            "parent_supplier": "Công ty F"
        },
    ]
    
    data = raw_data
    
    # Lọc theo từ ngày - đến ngày
    if from_date or to_date:
        filtered_data = []
        for d in data:
            if d.get('indent', 0) > 0:
               
                filtered_data.append(d)
                continue
                
            order_date = frappe.utils.getdate(d.get('order_date'))
            if from_date and order_date < from_date:
                continue
            if to_date and order_date > to_date:
                continue
            filtered_data.append(d)
        
       
        parent_suppliers = {d['supplier'] for d in filtered_data if d.get('indent', 0) == 0}
        data = [d for d in filtered_data if d.get('indent', 0) == 0 or d.get('parent_supplier') in parent_suppliers]
    
    
    if filters.get("supplier"):
        filtered_data = []
        for d in data:
            if d.get('indent', 0) == 0 and d.get('supplier') == filters['supplier']:
                filtered_data.append(d)
            elif d.get('indent', 0) > 0 and d.get('parent_supplier') == filters['supplier']:
                filtered_data.append(d)
        data = filtered_data
    
    if filters.get("item_category"):
        filtered_data = []
        
        matching_children = [d for d in data if d.get('indent', 0) > 0 and d.get('item_category') == filters['item_category']]
        
        
        parent_suppliers_with_category = {child.get('parent_supplier') for child in matching_children}
        
        
        for d in data:
            if d.get('indent', 0) == 0 and d.get('supplier') in parent_suppliers_with_category:
                # Parent có child match
                filtered_data.append(d)
            elif d.get('indent', 0) > 0 and d.get('item_category') == filters['item_category']:
                # Child match
                filtered_data.append(d)
        data = filtered_data
    
   
    if filters.get("ranking"):
        filtered_data = []
        for d in data:
            if d.get('indent', 0) == 0 and d.get('ranking') == filters['ranking']:
                filtered_data.append(d)
            elif d.get('indent', 0) > 0:
                # Kiểm tra parent có match không
                parent_supplier = d.get('parent_supplier')
                if any(p.get('supplier') == parent_supplier and p.get('ranking') == filters['ranking'] 
                       for p in data if p.get('indent', 0) == 0):
                    filtered_data.append(d)
        data = filtered_data
    
    message = ""
    return columns, data, message




@frappe.whitelist()
def supplier_rating_data(filters=None):
    """Biểu đồ cột: Điểm đánh giá theo nhà cung cấp"""
    columns, data, _ = execute(filters or {})
    
    # Chỉ lấy parent rows (indent = 0)
    parent_data = [d for d in data if d.get('indent', 0) == 0]
    
    supplier_ratings = Counter()
    supplier_count = Counter()
    
    for d in parent_data:
        supplier = d.get('supplier', '')
        rating = d.get('rating_score', 0)
        
        if supplier and rating:
            supplier_ratings[supplier] += rating
            supplier_count[supplier] += 1
    
   
    avg_ratings = {}
    for supplier in supplier_ratings:
        if supplier_count[supplier] > 0:
            avg_ratings[supplier] = supplier_ratings[supplier] / supplier_count[supplier]
    
    labels = list(avg_ratings.keys())
    values = [round(avg_ratings[label], 2) for label in labels]
    colors = [color_from_text(label) for label in labels]
    
    return {
        'labels': labels,
        'values': values,
        'colors': colors,
    }


@frappe.whitelist()
def supplier_cost_data(filters=None):
    """Biểu đồ ngang: Top chi phí theo nhà cung cấp"""
    columns, data, _ = execute(filters or {})
    
    # Chỉ lấy parent rows (indent = 0)
    parent_data = [d for d in data if d.get('indent', 0) == 0]
    
    supplier_costs = Counter()
    for d in parent_data:
        supplier = d.get('supplier', '')
        order_value = d.get('order_value', 0)
        
        if supplier and order_value:
            supplier_costs[supplier] += order_value / 1000000  # Chuyển sang triệu
    
    labels = list(supplier_costs.keys())
    values = [round(supplier_costs[label], 2) for label in labels]
    colors = [color_from_text(label) for label in labels]
    
    return {
        'labels': labels,
        'values': values,
        'colors': colors,
    }




@frappe.whitelist()
def item_ontime_data(filters=None):
    """Biểu đồ cột: % Đúng hạn theo loại mặt hàng"""
    columns, data, _ = execute(filters or {})
    
    item_ontime = Counter()
    item_count = Counter()
    
    for d in data:
        item_category = d.get('item_category', '')
        on_time = d.get('on_time_percentage', 0)
        
        if item_category and on_time:
            item_ontime[item_category] += on_time
            item_count[item_category] += 1
    
    # Tính trung bình
    avg_ontime = {}
    for item_category in item_ontime:
        if item_count[item_category] > 0:
            avg_ontime[item_category] = item_ontime[item_category] / item_count[item_category]
    
    labels = list(avg_ontime.keys())
    values = [round(avg_ontime[label], 2) for label in labels]
    colors = [color_from_text(label) for label in labels]
    
    return {
        'labels': labels,
        'values': values,
        'colors': colors,
    }


@frappe.whitelist()
def item_quality_data(filters=None):
    """Biểu đồ ngang: % Chất lượng theo loại mặt hàng"""
    columns, data, _ = execute(filters or {})
    
    item_quality = Counter()
    item_count = Counter()
    
    for d in data:
        item_category = d.get('item_category', '')
        quality = d.get('quality_percentage', 0)
        
        if item_category and quality:
            item_quality[item_category] += quality
            item_count[item_category] += 1
    
    # Tính trung bình
    avg_quality = {}
    for item_category in item_quality:
        if item_count[item_category] > 0:
            avg_quality[item_category] = item_quality[item_category] / item_count[item_category]
    
    labels = list(avg_quality.keys())
    values = [round(avg_quality[label], 2) for label in labels]
    colors = [color_from_text(label) for label in labels]
    
    return {
        'labels': labels,
        'values': values,
        'colors': colors,
    }
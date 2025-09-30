# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt
"""
    Downtime Report Module 

    Mục đích:
    - Tính toán và tổng hợp dữ liệu thời gian dừng máy (downtime) từ Job Card và Work Order trong Frappe/ERPNext.
    - Trả về dữ liệu dạng bảng (columns, data) và biểu đồ (labels, values, colors) theo thiết bị, cụm máy, nhóm nguyên nhân, và nguyên nhân chi tiết.

    Hàm chính:
    1. color_from_text(text): Tạo màu duy nhất từ chuỗi text (sử dụng MD5 hash + HLS -> RGB)
    2. normalize_dates(from_date, to_date): Chuẩn hóa các ngày từ filter, đảm bảo from_date <= to_date
    3. execute(filters=None): Lấy dữ liệu downtime theo filters, trả về (columns, data, message)
    4. downtime_machine_group_data(filters=None): Tổng hợp thời gian downtime theo cụm máy
    5. downtime_equipment_name_data(filters=None): Tổng hợp top thiết bị có thời gian downtime nhiều nhất
    6. downtime_reason_group_data(filters=None): Tổng hợp thời gian downtime theo nhóm nguyên nhân
    7. downtime_reason_detail_data(filters=None): Tổng hợp top nguyên nhân gây downtime

    Filters có thể sử dụng:
    - from_date, to_date
    - reason_group, reason_detail
    - category, machine_group, equipment_name

    Trả về:
    - execute(): columns, data, message
    - Các hàm *_data(): dict với keys: labels, values, colors

    Ghi chú:
    - Thời gian downtime được tính theo giờ (3600 giây = 1 giờ)
    - Dữ liệu lấy từ Job Card và Work Order, lọc theo các field phù hợp
    - Màu cho biểu đồ được sinh từ tên thiết bị, nhóm máy hoặc nguyên nhân
    - Các hàm *_data() có thể dùng trực tiếp để vẽ chart trong Frappe/ERPNext
"""


from datetime import timedelta
import json
import frappe
import hashlib
from collections import Counter
import colorsys

def color_from_text(text):
    """Tạo màu từ chuỗi"""
    h = int(hashlib.md5(text.encode()).hexdigest(), 16)
    hue = (h % 360) / 360.0     
    saturation = 0.4            
    lightness = 0.75         
    r, g, b = colorsys.hls_to_rgb(hue, lightness, saturation)
    return '#{0:02x}{1:02x}{2:02x}'.format(int(r*255), int(g*255), int(b*255))


def normalize_dates(from_date, to_date):
    """Chuẩn hóa from_date và to_date"""
    min_date = frappe.utils.getdate("2025-01-01")
    today = frappe.utils.getdate(frappe.utils.today())

    # chuyển "" thành None
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
    
    # Nếu filters là string thì parse thành dict
    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except:
            filters = {}
    from_date, to_date = normalize_dates(filters.get("from_date"), filters.get("to_date"))
    
    # Kiểm tra và chuyển đổi ngày an toàn
    if from_date:
        from_date = frappe.utils.getdate(from_date)
        
            
    if to_date:
        to_date = frappe.utils.getdate(to_date)
        
            
    
    columns = [
        {"label": "Tên thiết bị", "fieldname": "equipment_name", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 200},
        {"label": "Cụm máy", "fieldname": "machine_group", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Hệ", "fieldname": "category", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "Mã ca", "fieldname": "shift_code", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Ngày", "fieldname": "date", "fieldtype": "Date", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Bắt đầu dừng", "fieldname": "start_time", "fieldtype": "Time", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Kết thúc dừng", "fieldname": "end_time", "fieldtype": "Time", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Tổng thời gian", "fieldname": "total_duration", "fieldtype": "Duration", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "Nhóm nguyên nhân", "fieldname": "reason_group", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Nguyên nhân", "fieldname": "reason_detail", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 200},
        {"label": "Người ghi nhận", "fieldname": "recorder", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 150},
        
    ]

    data = []
    job_cards = frappe.get_all(
        'Job Card',
        fields=['name', 'work_order']
    )

    for jc in job_cards:
        doc = frappe.get_doc('Job Card', jc.name)

        if jc.get('work_order'):
            doc_wo_order = frappe.get_doc('Work Order', jc['work_order'])
        else:
            continue

        for dt in doc.custom_downtime:
            if not dt.from_time or not dt.to_time or not dt.group_name:
                continue
            # Lọc theo filter
            try:
                if from_date and dt.from_time.date() < from_date:
                    continue
                if to_date and dt.from_time.date() > to_date:
                    continue
            except Exception as e:
                # frappe.log_error(f"Lỗi so sánh ngày trong downtime", str(e))
                continue
            parent = None
            if dt.workstation != "Tất cả":
                ws_doc = frappe.get_doc("Workstation", dt.workstation)
                parent = ws_doc.custom_parent if ws_doc.custom_parent else None
            # Lọc theo Nhóm nguyên nhân
            if filters.get("reason_group") and dt.group_name != filters["reason_group"]:
                continue
            # Lọc theo nguyên nhân
            if filters.get("reason_detail") and dt.reason != filters["reason_detail"]:
                continue
            # Lọc theo cụm máy
            if filters.get("machine_group") and parent != filters["machine_group"]:
                continue
        
            # Lọc theo thiết bị
            equipment_name = dt.workstation if dt.workstation != "Tất cả" else doc.workstation
            if filters.get("equipment_name") and equipment_name != filters["equipment_name"]:
                continue
            
            # Lọc theo hệ(category)
            if filters.get("category") and doc_wo_order.custom_category != filters["category"]:
                continue

          
            
            
            data.append({
                'equipment_name': equipment_name,
                'machine_group': parent,
                'shift_code': getattr(doc_wo_order, 'custom_shift', None),
                'date': dt.from_time.date() if dt.from_time else None,
                "start_time": dt.from_time.time(),
                "end_time": dt.to_time.time(),
                'total_duration': dt.duration,
                'reason_group': dt.group_name,
                'reason_detail': dt.reason,
                'recorder': doc.time_logs[0].employee if (doc.time_logs and len(doc.time_logs) > 0 and doc.time_logs[0].employee) else None,
                'category': doc_wo_order.custom_category,
            })

    
    
    
    
   
   
    message = ""
   
    return columns, data, message
# Thời gian downtime theo từng cụm máy
@frappe.whitelist()
def downtime_machine_group_data(filters=None):
    columns, data, _ = execute(filters or {})
    # Tính tổng thời gian downtime theo từng cụm máy (giờ)
    downtime_machine_group = Counter()
    for d in data:
        if d.get('machine_group') and d.get('total_duration'):
            
            downtime_machine_group[d['machine_group']] += d['total_duration']/3600

    labels1 = list(downtime_machine_group.keys())
    values1 = [round(downtime_machine_group[label],2) for label in labels1] #làm tròn 2 chữ số thập phân
    colors1 = [color_from_text(label) for label in labels1]
    return {
        'labels': labels1,
        'values': values1,
        'colors': colors1,
       
    }
    
  
    
# Top máy dừng nhiều nhất
@frappe.whitelist()
def downtime_equipment_name_data(filters=None):
    # Lấy data giống execute()
    columns, data, _ = execute(filters or {})

    downtime_equipment_name = Counter()
    for d in data:
        if isinstance(d, dict):
            if d.get('equipment_name') and d.get('total_duration'):
                downtime_equipment_name[d['equipment_name']] += d['total_duration']/3600

    labels2 = list(downtime_equipment_name.keys())
    values2 = [round(downtime_equipment_name[label],2) for label in labels2] 
    colors2 = [color_from_text(label) for label in labels2]

    return {
        "labels": labels2,
        "values": values2,
        "colors": colors2,
        
    }


# Thời gian dowtime theo nhóm nguyên nhân
@frappe.whitelist()
def downtime_reason_group_data(filters=None):
    columns, data, _ = execute(filters or {})
    downtime_reason_group = Counter()
    for d in data:
        if d.get('reason_group') and d.get('total_duration'):
            downtime_reason_group[d['reason_group']] += d['total_duration']/3600

    labels3 = list(downtime_reason_group.keys())
    values3 = [round(downtime_reason_group[label],2) for label in labels3] 
    colors3 = [color_from_text(label) for label in labels3]

    return {
        "labels": labels3,
        "values": values3,
        "colors": colors3,
       
    }
    
# Top nguyên nhân dowtime
@frappe.whitelist()
def downtime_reason_detail_data(filters=None):
    columns, data, _ = execute(filters or {})
    if not data:
        return {
            "labels": [],
            "values": [],
            "colors": [],
        }
    downtime_reason_detail = Counter()
    for d in data:
        if d.get('reason_detail') and d.get('total_duration'):
            downtime_reason_detail[d['reason_detail']] += d['total_duration']/3600

    labels4 = list(downtime_reason_detail.keys())
    values4 = [round(downtime_reason_detail[label],2) for label in labels4] 
    colors4 = [color_from_text(label) for label in labels4]

    return {
        "labels": labels4,
        "values": values4,
        "colors": colors4,
      
    }
# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

from datetime import timedelta
import json
import frappe
import hashlib
from collections import Counter
import colorsys

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
    
    if from_date:
        from_date = frappe.utils.getdate(from_date)
    if to_date:
        to_date = frappe.utils.getdate(to_date)
    
    columns = [
        {"label": "LSX công đoạn ", "fieldname": "job_card", "fieldtype": "Link", "options": "Job Card", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Tên thiết bị", "fieldname": "equipment_name", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 200},
        {"label": "Cụm máy", "fieldname": "machine_group", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Hệ", "fieldname": "category", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 150},
        {"label": "Ca", "fieldname": "shift_code", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 250},
        {"label": "Ngày", "fieldname": "date", "fieldtype": "Date", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Bắt đầu dừng", "fieldname": "start_time", "fieldtype": "Time", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Kết thúc dừng", "fieldname": "end_time", "fieldtype": "Time", 'dropdown': False, 'sortable': False, "width": 120},
        {"label": "Tổng thời gian", "fieldname": "total_duration", "fieldtype": "Duration", 'dropdown': False, 'sortable': False, "width": 250},
        {"label": "Nhóm nguyên nhân", "fieldname": "reason_group", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 180},
        {"label": "Nguyên nhân", "fieldname": "reason_detail", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 300},
        {"label": "Người ghi nhận", "fieldname": "recorder", "fieldtype": "Data", 'dropdown': False, 'sortable': False, "width": 150},
    ]

    data = []
    
    
    job_card_filters = {}
    if from_date or to_date:
        job_card_filters = {'name': ['!=', '']}
    
    job_cards = frappe.get_all(
        'Job Card',
        fields=['name', 'work_order', 'workstation'],
        filters=job_card_filters
    )

    workstation_cache = {}
    
    work_order_names = [jc.work_order for jc in job_cards if jc.get('work_order')]
    work_orders = {}
    if work_order_names:
        wo_list = frappe.get_all(
            'Work Order',
            fields=['name', 'custom_category', 'custom_shift'],
            filters={'name': ['in', work_order_names]}
        )
        work_orders = {wo.name: wo for wo in wo_list}

    job_card_names = [jc.name for jc in job_cards]
    
    downtime_data = frappe.db.sql("""
        SELECT 
            parent,
            workstation,
            from_time,
            to_time,
            duration,
            group_name,
            reason
        FROM `tabJob Card Downtime Item`
        WHERE parent IN %(job_cards)s
        AND from_time IS NOT NULL
        AND to_time IS NOT NULL
        AND group_name IS NOT NULL
        ORDER BY parent
    """, {'job_cards': job_card_names}, as_dict=True)
    
    time_logs = frappe.db.sql("""
        SELECT 
            parent,
            employee
        FROM `tabJob Card Time Log`
        WHERE parent IN %(job_cards)s
        AND idx = 1
    """, {'job_cards': job_card_names}, as_dict=True)
    
    time_log_map = {tl.parent: tl.employee for tl in time_logs}
    
    downtime_by_jc = {}
    for dt in downtime_data:
        if dt.parent not in downtime_by_jc:
            downtime_by_jc[dt.parent] = []
        downtime_by_jc[dt.parent].append(dt)

    for jc in job_cards:
        if not jc.get('work_order'):
            continue
            
        work_order = work_orders.get(jc.work_order)
        if not work_order:
            continue
        
        if filters.get("category") and work_order.custom_category != filters["category"]:
            continue
        
        downtime_list = downtime_by_jc.get(jc.name, [])
        
        for dt in downtime_list:
         
            try:
                dt_date = dt.from_time.date() if dt.from_time else None
                if not dt_date:
                    continue
                if from_date and dt_date < from_date:
                    continue
                if to_date and dt_date > to_date:
                    continue
            except:
                continue
            
           
            parent = None
            if dt.workstation != "Tất cả":
                if dt.workstation not in workstation_cache:
                    ws_data = frappe.db.get_value(
                        "Workstation", 
                        dt.workstation, 
                        "custom_parent"
                    )
                    workstation_cache[dt.workstation] = ws_data
                parent = workstation_cache[dt.workstation]
            
          
            if filters.get("reason_group") and dt.group_name != filters["reason_group"]:
                continue
            if filters.get("reason_detail") and dt.reason != filters["reason_detail"]:
                continue
            if filters.get("machine_group") and parent != filters["machine_group"]:
                continue
            
            equipment_name = dt.workstation if dt.workstation != "Tất cả" else jc.workstation
            if filters.get("equipment_name") and equipment_name != filters["equipment_name"]:
                continue
            
            data.append({
                'job_card': jc.name,
                'equipment_name': equipment_name,
                'machine_group': parent,
                'shift_code': work_order.custom_shift,
                'date': dt.from_time.date() if dt.from_time else None,
                "start_time": dt.from_time.time() if dt.from_time else None,
                "end_time": dt.to_time.time() if dt.to_time else None,
                'total_duration': dt.duration,
                'reason_group': dt.group_name,
                'reason_detail': dt.reason,
                'recorder': time_log_map.get(jc.name),
                'category': work_order.custom_category,
            })

    message = ""
    return columns, data, message


@frappe.whitelist()
def downtime_machine_group_data(filters=None):
    columns, data, _ = execute(filters or {})
    downtime_machine_group = Counter()
    for d in data:
        if d.get('machine_group') and d.get('total_duration'):
            downtime_machine_group[d['machine_group']] += d['total_duration']/3600

    labels1 = list(downtime_machine_group.keys())
    values1 = [round(downtime_machine_group[label], 2) for label in labels1]
    colors1 = [color_from_text(label) for label in labels1]
    return {
        'labels': labels1,
        'values': values1,
        'colors': colors1,
    }


@frappe.whitelist()
def downtime_equipment_name_data(filters=None):
    columns, data, _ = execute(filters or {})
    downtime_equipment_name = Counter()
    for d in data:
        if isinstance(d, dict):
            if d.get('equipment_name') and d.get('total_duration'):
                downtime_equipment_name[d['equipment_name']] += d['total_duration']/3600

    labels2 = list(downtime_equipment_name.keys())
    values2 = [round(downtime_equipment_name[label], 2) for label in labels2]
    colors2 = [color_from_text(label) for label in labels2]

    return {
        "labels": labels2,
        "values": values2,
        "colors": colors2,
    }


@frappe.whitelist()
def downtime_reason_group_data(filters=None):
    columns, data, _ = execute(filters or {})
    downtime_reason_group = Counter()
    for d in data:
        if d.get('reason_group') and d.get('total_duration'):
            downtime_reason_group[d['reason_group']] += d['total_duration']/3600

    labels3 = list(downtime_reason_group.keys())
    values3 = [round(downtime_reason_group[label], 2) for label in labels3]
    colors3 = [color_from_text(label) for label in labels3]

    return {
        "labels": labels3,
        "values": values3,
        "colors": colors3,
    }


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
    values4 = [round(downtime_reason_detail[label], 2) for label in labels4]
    colors4 = [color_from_text(label) for label in labels4]

    return {
        "labels": labels4,
        "values": values4,
        "colors": colors4,
    }
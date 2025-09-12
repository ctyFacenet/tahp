# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe


def execute(filters=None):
	columns = [
		# {"label": "Mã thiết bị", "fieldname": "equipment_code", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Tên thiết bị", "fieldname": "equipment_name", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Cụm máy", "fieldname": "machine_group", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Mã ca", "fieldname": "shift_code", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Ngày", "fieldname": "date", "fieldtype": "Date", 'dropdown':False,'sortable':False},
        {"label": "Thời gian bắt đầu dừng", "fieldname": "start_time", "fieldtype": "Time", 'dropdown':False,'sortable':False},
        {"label": "Thời gian kết thúc dừng", "fieldname": "end_time", "fieldtype": "Time", 'dropdown':False,'sortable':False},
        {"label": "Tổng thời gian", "fieldname": "total_duration", "fieldtype": "Duration", 'dropdown':False,'sortable':False},
        {"label": "Nguyên nhân", "fieldname": "reason_group", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Lí do", "fieldname": "reason_detail", "fieldtype": "Data", 'dropdown':False,'sortable':False},
        {"label": "Người ghi nhận", "fieldname": "recorder", "fieldtype": "Data", 'dropdown':False,'sortable':False},
	]
	data = []
	job_cards = frappe.get_all(
		'Job Card',
		fields =[ 'name', 'work_order']
  
	)
	
	for jc in job_cards:
		doc = frappe.get_doc('Job Card', jc.name)
		print(jc['work_order'])
		if jc.get('work_order'):
			doc_wo_order = frappe.get_doc('Work Order', jc['work_order'])
		else:
			continue
  
		for dt in doc.custom_downtime: 
			if not dt.from_time or not dt.to_time or not dt.group_name:
				continue
			parent = None
			if dt.workstation != "Tất cả":
				ws_doc = frappe.get_doc("Workstation", dt.workstation)
				parent = ws_doc.custom_parent if ws_doc.custom_parent else None
			data.append({
				'equipment_name': dt.workstation if dt.workstation != "Tất cả" else doc.workstation,
				'machine_group': parent,
				'shift_code': getattr(doc_wo_order, 'custom_shift', None),
				'date': dt.from_time.date() if dt.from_time else None,
       			"start_time": dt.from_time.time(),
                "end_time": dt.to_time.time(),
                'total_duration': dt.duration,
                'reason_group': dt.group_name,
                'reason_detail': dt.reason,
                'recorder': doc.time_logs[0].employee if doc.time_logs and doc.time_logs[0].employee else None


                
                
            
				
			})

	return columns, data, [{
		"value": "Chi tiết theo thiết bị",
		"indicator": "blue",   # màu xanh
		"label": "",
		"datatype": "Data"
	}], None


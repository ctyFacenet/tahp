# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt



import frappe



def get_columns():
    return [
        {
            "label": "Tên học sinh",
            "fieldname": "student_name",
            "fieldtype": "Data",
            "width": 200
        },
        {
            "label": "Lớp",
            "fieldname": "class_name",
            "fieldtype": "Data",
            "width": 150
        },
        {
            "label": "Ngày nhập hoc",
            "fieldname": "registration_date",
            "fieldtype": "Date",
            "width": 200
        },
        {
            "label": "Trạng thái",
            "fieldname": "graduation_status",
            "fieldtype": "Data",
            "width": 200
        },
        {
            "label": "Tuổi",
            "fieldname": "age",
            "fieldtype": "Int",
            "width": 80
        },
        
        {
            "label": "gpa",
            "fieldname": "gpa",
            "fieldtype": "Float",
            "width": 80,
            "precision": 2
        }
	]
    
def get_data(filters):
	data = frappe.db.get_list('Student Overview',
		filters={
			'gpa': ['<', 4]
		},
		fields=['student_name', 'age','class_name', 'registration_date', 'graduation_status', 'gpa'],
		order_by='gpa desc',
		#start=10,
        #page_length=20,
		as_list= False #true return List
	)
	return data

def execute(filters=None):
	columns = get_columns()
	data = get_data(filters)
	return columns, data
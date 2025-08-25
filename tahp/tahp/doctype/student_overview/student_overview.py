# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class StudentOverview(Document):
    
	def before_save(self):
		validate_grade_and_update_gpa(self)
		
	def after_save(self):
		check_gpa(self)

def validate_grade_and_update_gpa(doc):
	total_grade = 0
	total_credits = 0
	for item in doc.subject:
		if item.grade:
			if item.grade >10 or item.grade < 1:
				frappe.throw(f'Diem cua mon {item.subject} phai o trong khoan tu 1-10')
		total_grade += (item.grade * item.credit)
		total_credits += item.credit
	print(total_credits)
	print(total_grade)


	# cập nhật GPA
	if total_credits > 0:
		doc.gpa = total_grade / total_credits
	else:
		doc.gpa = 0
  
  
def check_gpa(doc):
    if doc.gpa < 4:
        frappe.send_notification(
        title="Cảnh báo GPA thấp",
        message=f"Điểm GPA của sinh viên {doc.student_name} dưới 4.0. Vui lòng kiểm tra và đăng ký học lại.",
        email_content=f"Sinh viên {doc.student_name} có điểm GPA là {doc.gpa}, dưới mức tối thiểu. Vui lòng kiểm tra lại học phần của sinh viên.",
        doctype="Student Overview",
        name=doc.name,
        sender="Hệ thống",
        sender_email="admin@gmail.com",
        recipients=["administrator@your-erpnexthost.com"]
    )
			

		
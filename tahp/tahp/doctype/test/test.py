# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe

class Test(Document):
	def validate(self):
		# Add validation logic here if needed
		frappe.msgprint("Validation logic can be added here.")
		print('Somthing')

	def before_save(self):
		# This function is called before the document is saved
		frappe.msgprint("Before save logic can be added here.")
		print('Before save logic executed')


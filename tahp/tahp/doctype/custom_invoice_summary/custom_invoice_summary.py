# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class CustomInvoiceSummary(Document):
	def autoname(self):
		code = "UNK"
		if self.type_posting == "Phiếu nhập kho":
			code = "NK"
		elif self.type_posting == "Phiếu xuất kho":
			code = "XK"

		today = frappe.utils.now_datetime()
		year = today.year
		month = f"{today.month:02d}"

		latest_entry = frappe.db.get_all(
			"Custom Invoice Summary",
			filters={
				"type_posting": self.type_posting,
				"name": ["like", f"{code}.{year}.{month}.%"]
			},
			fields=["name"],
			order_by="name desc",
			limit=1
		)

		next_index = 1
		if latest_entry:
			last_code = latest_entry[0]["name"]
			try:
				last_number = int(last_code.split(".")[3])
				next_index = last_number + 1
			except (IndexError, ValueError):
				pass

		self.name = f"{code}.{year}.{month}.{next_index:04d}"
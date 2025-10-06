# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import getdate, now_datetime
from collections import defaultdict
from frappe.model.document import Document


class CustomInvoice(Document):
	
	def on_submit(self):
		result = []
		for item in self.items:
			item_code = item.item_code
			seds = frappe.get_all(
				"Stock Entry Detail",
				filters={"docstatus": 1, "is_finished_item": 0, "item_code": item_code},
				fields=["item_code", "qty", "t_warehouse", "s_warehouse", "name",
						"custom_approved_qty", "creation", "parent"],
				order_by="creation asc"
			)
			valid_seds = []
			for sed in seds:
				if sed.qty > sed.custom_approved_qty and item_code != "RM000000":
					valid_seds.append(sed)
			
			seds_by_date = defaultdict(list)
			for sed in valid_seds:
				date_key = getdate(sed.creation)
				seds_by_date[date_key].append(sed)

			in_qty = item.qty
			out_qty = item.qty
			for date_key, sed_group in seds_by_date.items():
				t_group = []
				s_group = []

				if in_qty <= 0 or out_qty <= 0: break

				for sed in sed_group:
					if sed.t_warehouse and not sed.s_warehouse: t_group.append(sed)
					elif sed.s_warehouse and not sed.t_warehouse: s_group.append(sed)

				for t_item in t_group:
					if in_qty > 0:
						available_qty = t_item.qty - t_item.custom_approved_qty
						used_qty = min(available_qty, in_qty)
						result.append({
							"stock_entry": t_item.parent,
							"item_code": t_item.item_code,
							"in_qty": used_qty,
							"note": self.supplier,
							"posting_date": date_key
						})
						sed_doc = frappe.get_doc("Stock Entry Detail", t_item.name)
						sed_doc.custom_approved_qty += used_qty
						sed_doc.save()
						in_qty -= used_qty
						if in_qty <= 0: break

				for s_item in s_group:
					if out_qty > 0:
						available_qty = s_item.qty - s_item.custom_approved_qty
						used_qty = min(available_qty, out_qty)
						result.append({
							"stock_entry": s_item.parent,
							"item_code": s_item.item_code,
							"out_qty": used_qty,
							"note": "",
							"posting_date": date_key
						})
						sed_doc = frappe.get_doc("Stock Entry Detail", s_item.name)
						sed_doc.custom_approved_qty += used_qty
						sed_doc.save()
						out_qty -= used_qty
						if out_qty <= 0: break
		
		for res in result:
			new_doc = frappe.new_doc("Custom Invoice Allocation")
			new_doc.stock_entry = res.get("stock_entry", None)
			new_doc.approved_date = now_datetime()
			new_doc.item_code = res.get("item_code", None)
			new_doc.in_qty = res.get("in_qty", None)
			new_doc.out_qty = res.get("out_qty", None)
			new_doc.note = res.get("note", None)
			new_doc.posting_date = res.get("posting_date", None)
			new_doc.save(ignore_permissions=True)
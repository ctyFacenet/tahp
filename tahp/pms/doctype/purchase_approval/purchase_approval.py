# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import today, getdate, formatdate
from frappe.model.naming import make_autoname
from frappe.model.document import Document
# from tahp.tahp.doctype.custom_planner.custom_planner import wwo_notify


class PurchaseApproval(Document):
	def autoname(self):
		d = getdate(today())

		dd = formatdate(d, "dd")
		mm = formatdate(d, "mm")
		yy = formatdate(d, "yy")

		series_key = f"TDMH{dd}{mm}{yy}."
		serial = make_autoname(series_key + "###")[-3:]
		self.name = f"TDMH.{dd}.{mm}.{yy}.{serial}"

	def after_insert(self):
		if self.quotation_comparison:
			comparison = frappe.get_doc("Quotation Comparison", self.quotation_comparison)
			comparison.recommend_supplier = self.supplier
			comparison.recommend_reason = self.recommend_reason
			comparison.save(ignore_permissions=True)
			comparison.update_supplier_item_rate()

	def on_submit(self):
		doc = frappe.new_doc("Purchase Order")
		doc.supplier = self.supplier
		doc.custom_employee = self.employee
		doc.custom_quotation_comparison = self.quotation_comparison
		doc.custom_purchase_approval = self.name
		doc.custom_payment_method = self.payment_method
		doc.custom_payment_note = self.payment_note
		doc.custom_my_address = self.delivery_address
		doc.custom_delivery_note = self.delivery_note
		doc.custom_delivery_amount_note = self.delivery_amount_note
		doc.custom_discount_note = self.discount_note
		doc.custom_special_offer = self.special_offer
		doc.custom_warranty = self.warranty
		doc.custom_after_sale_service = self.after_sale_service
		doc.custom_total_row = self.total_row
		doc.discount_amount = self.discount_amount
		doc.custom_delivery_amount = self.delivery_amount
		doc.custom_vat = self.vat
		doc.custom_vat_amount = self.vat_amount
		doc.custom_total_amount = self.total_amount
		doc.custom_detail = []
		doc.base_grand_total = 0
		doc.base_rounded_total = 0
		doc.rounded_total = 0
		delivery_dates = []
		for item in self.items:
			doc.append("custom_detail", {
				"item_code": item.item_code,
				"item_name": item.item_name,
				"stock_uom": item.stock_uom,
				"qty": item.actual_qty,
				"origin": item.origin,
				"rate": item.rate,
				"tax": item.tax,
				"total": item.total,
				"delivery_date": item.delivery_date if item.delivery_date else frappe.utils.now_datetime(),
				"note": item.note
			})
			if item.delivery_date:
				delivery_dates.append(item.delivery_date)
			doc.append("items", {
				"item_code": item.item_code,
				"qty": item.actual_qty,
			})
		
		if delivery_dates:
			doc.custom_required_date = min(delivery_dates)
		doc.save(ignore_permissions=True)
		frappe.msgprint(
			msg=f"Đơn đặt hàng {doc.name} đã được tạo thành công!",
			indicator="green",
		)
		return doc.name
# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

import frappe
from frappe.utils import today, getdate, formatdate, flt
from frappe.model.naming import make_autoname
from frappe.model.document import Document
from tahp.doc_events.purchase_order.purchase_order import get_or_create_shipping_account, get_vat_account, get_total_vat_account, get_total_discount_account

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

@frappe.whitelist()
def get_rate(item_code, supplier, brand=None):
	if not item_code or not supplier:
		return {
			"latest_rate": None,
			"avg_rate": None,
			"brand": None
		}

	filters = {
		"item_code": item_code,
		"supplier": supplier
	}

	if brand:
		filters["origin"] = brand

	rates = frappe.db.get_all(
		"Supplier Item Rate",
		filters=filters,
		fields=["rate", "creation", "origin"],
		order_by="creation desc"
	)

	if not rates:
		return {
			"latest_rate": None,
			"avg_rate": None,
			"brand": None
		}

	latest_rate = rates[0].rate

	valid_rates = [r.rate for r in rates if r.rate is not None]
	avg_rate = sum(valid_rates) / len(valid_rates) if valid_rates else None

	return {
		"latest_rate": latest_rate,
		"avg_rate": avg_rate,
		"brand": rates[0].origin
	}

def normalize_rate(rate):
	rate = flt(rate)
	return int(rate) if rate.is_integer() else round(rate, 2)

def get_item_tax_template(rate, company):
	title = normalize_rate(rate)

	result = frappe.db.get_value(
		"Item Tax Template",
		{
			"title": title,
			"company": company
		},
		"name"
	)
	return result

@frappe.whitelist()
def generate_purchase_order(docname):
	doc = frappe.get_doc("Purchase Approval", docname)
	company = frappe.defaults.get_user_default("Company")
	vat_account = get_vat_account(company)
	total_vat_account = get_total_vat_account(company)
	total_discount_account = get_total_discount_account(company)
	supplier = frappe.get_doc("Supplier", doc.supplier)

	taxes = set()

	for item in doc.items:
		if item.tax and flt(item.tax) > 0:
			rate = flt(item.tax)
			rate = normalize_rate(rate)
			taxes.add(rate)

	for tax in taxes:
		template_title = f"{tax}%"

		if not frappe.db.exists(
			"Item Tax Template",
			{"title": template_title, "company": company}
		):
			tax_template = frappe.new_doc("Item Tax Template")
			tax_template.title = template_title
			tax_template.company = company
			tax_template.append("taxes", {
				"tax_type": vat_account,
				"tax_rate": tax
			})
			tax_template.insert(ignore_permissions=True)

	shipping_account = None
	if doc.delivery_amount and doc.delivery_amount > 0:
		shipping_account = get_or_create_shipping_account(company)

	purchase_doc = frappe.new_doc("Purchase Order")

	purchase_doc.supplier = supplier.name
	purchase_doc.supplier_contact = supplier.supplier_primary_contact

	# ===== Items =====
	delivery_dates = []
	for row in doc.items:
		purchase_doc.append("items", {
			"item_code": row.item_code,
			"required_by": row.delivery_date,
			"qty": row.actual_qty,
			"item_name": row.item_name,
			"stock_uom": row.stock_uom,
			"item_tax_template": get_item_tax_template(row.tax, company),
			"rate": row.rate,
			"brand": row.brand,
		})
		delivery_dates.append(row.delivery_date)

	if taxes:
		purchase_doc.append("taxes", {
			"charge_type": "On Net Total",
			"account_head": vat_account,
			"description": "total",
		})

	if shipping_account:
		purchase_doc.append("taxes", {
			"charge_type": "Actual",
			"account_head": shipping_account,
			"tax_amount": doc.delivery_amount,
			"description": "shipping",
		})

	if doc.discount_amount:
		purchase_doc.append("taxes", {
			"charge_type": "Actual",      
			"account_head": total_discount_account,
			"tax_amount": doc.discount_amount,
			"description": "discount",
			"add_deduct_tax": "Deduct",
		})

	purchase_doc.custom_employee = doc.employee
	purchase_doc.custom_quotation_comparison = doc.quotation_comparison
	purchase_doc.custom_purchase_approval = doc.name
	purchase_doc.schedule_date = min(delivery_dates)
	purchase_doc.custom_payment_method = doc.payment_method
	purchase_doc.custom_payment_note = doc.payment_note
	purchase_doc.custom_delivery_address = doc.delivery_address
	purchase_doc.custom_delivery_note = doc.delivery_note
	purchase_doc.custom_delivery_amount_note = doc.delivery_amount_note
	purchase_doc.custom_discount_note = doc.discount_note
	purchase_doc.custom_special_offer = doc.special_offer
	purchase_doc.custom_warranty = doc.warranty
	purchase_doc.custom_after_sale_service = doc.after_sale_service
	purchase_doc.save(ignore_permissions=True)

	if doc.vat:
		purchase_doc.append("taxes", {
			"charge_type": "On Previous Row Total",
			"account_head": total_vat_account,
			"description": "grand_total",
			"rate": doc.vat,
			"row_id": len(purchase_doc.taxes),
			"tax_amount": 0,
		})

	purchase_doc.save(ignore_permissions=True)
	return purchase_doc.name

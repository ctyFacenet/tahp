import frappe
from frappe.utils import flt
import json

import frappe
from frappe.utils import flt
import json

@frappe.whitelist()
def update_payment_info(docname, payment_rows):
    if isinstance(payment_rows, str):
        payment_rows = json.loads(payment_rows)

    doc = frappe.get_doc("Purchase Order", docname)

    total_amount = flt(doc.custom_total_amount)
    new_children = []
    total_billed_percent = 0

    for row in payment_rows:
        percent = flt(row.get("percent", 0))

        total = flt(total_amount * (percent / 100))

        child = {
            "from_time": row.get("from_time"),
            "payment_type": row.get("payment_type"),
            "percent": percent,
            "total": total,
            "status": row.get("status")
        }

        new_children.append(child)

        if row.get("status") == "Đã thanh toán":
            total_billed_percent += percent

    doc.set("custom_payment", [])
    for c in new_children:
        doc.append("custom_payment", c)
    doc.db_set("per_billed", min(flt(total_billed_percent), 100))
    doc.save(ignore_permissions=True)
    return {
        "status": "success",
        "message": "Cập nhật thông tin thanh toán thành công",
        "per_billed": doc.per_billed
    }

def get_vat_account():
    accounts = frappe.db.get_all(
        "Account",
        filters={
            "is_group": 0,
            "disabled": 0,
            "name": ["like", "%VAT%"],
        },
        fields=["name"],
        limit=1
    )

    if accounts:
        return accounts[0].name
    
def get_or_create_shipping_account(company):
    account_name = "Shipping Charges"

    account = frappe.db.get_value(
        "Account",
        {
            "company": company,
            "account_name": account_name
        },
        "name"
    )

    if account:
        return account

    parent_account = frappe.db.get_all(
        "Account",
        {
            "company": company,
            "is_group": 1,
            "root_type": "Expense"
        },
    )

    if not parent_account:
        frappe.throw("No Expense parent account found")

    acc = frappe.get_doc({
        "doctype": "Account",
        "account_name": account_name,
        "company": company,
        "parent_account": parent_account[0].name,
        "root_type": "Expense",
        "account_type": "Chargeable",
        "is_group": 0
    })
    acc.insert(ignore_permissions=True)
    return acc.name


@frappe.whitelist()
def generate_purchase_order(docname):
    doc = frappe.get_doc("Purchase Approval", docname)
    vat_account = get_vat_account()
    company = frappe.defaults.get_user_default("Company")
    result_taxes = []
    for item in doc.items:
        if item.tax:
            rate = flt(item.tax)
            if rate > 0:
                rate = int(rate) if rate.is_integer() else flt(round(rate, 2))
                template_name = f"{rate}%"
                if not frappe.db.exists("Item Tax Template", template_name):
                    tax_template = frappe.get_doc({
                        "doctype": "Item Tax Template",
                        "title": template_name,
                        "name": template_name,
                        "company": company,
                        "taxes": [
                            {
                                "tax_type": vat_account,
                                "tax_rate": rate
                            }
                        ]
                    })
                    tax_template.insert(ignore_permissions=True)
                result_taxes.append(tax_template.name)

    if doc.delivery_amount and doc.delivery_amount > 0:
        shipping_account = get_or_create_shipping_account(company)

    return {
        "tax": result_taxes,
        "shpping_account": shipping_account
    }    
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

def get_total_vat_account(company):
    vat_account_name = frappe.db.get_all(
        "Account",
        {
            "company": company,
            "is_group": 0,
            "disabled": 0,
            "account_type": "Tax",
            "account_name": ["like", "%VAT%"],
        },
    )
    if vat_account_name:
        return vat_account_name[0].name
    
def get_total_vat_account(company):
    vat_account_name = frappe.db.get_all(
        "Account",
        {
            "company": company,
            "is_group": 0,
            "disabled": 0,
            "account_type": "Tax",
            "account_name": ["like", "%VAT%"],
        },
    )
    if vat_account_name:
        return vat_account_name[0].name
    
def get_total_discount_account(company):
    acc_name = frappe.db.get_value(
        "Account",
        {
            "company": company,
            "account_name": "Purchase Discount",
        },
        "name"
    )

    if acc_name:
        return acc_name

    # Root Income (system account)
    parent_account = frappe.db.get_value(
        "Account",
        {
            "company": company,
            "account_name": "Income",
            "is_group": 1,
        },
        "name"
    )

    if not parent_account:
        frappe.throw("Không tìm thấy root Income account")

    acc = frappe.get_doc({
        "doctype": "Account",
        "account_name": "Purchase Discount",
        "company": company,
        "parent_account": parent_account,
        "root_type": "Income",
        "account_type": "Indirect Income",
        "is_group": 1,   # GROUP
    })

    acc.insert(ignore_permissions=True)
    return acc.name


def get_vat_account(company):
    vat_item = frappe.db.get_all(
        "Account",
        {
            "company": company,
            "account_name": "VAT Item",
            "is_group": 0,
            "disabled": 0,
        },
    )

    if vat_item:
        return vat_item[0].name
    
    vat_account_name = frappe.db.get_all(
        "Account",
        filters={
            "company": company,
            "is_group": 0,
            "disabled": 0,
            "account_type": "Tax",
            "account_name": ["like", "%VAT%"],
        },
        limit=1
    )

    if vat_account_name:
        vat_account = frappe.get_doc("Account", vat_account_name[0].name)
        new_account = frappe.get_doc({
            "doctype": "Account",
            "account_name": "VAT Item",
            "company": company,
            "parent_account": vat_account.parent_account,
            "root_type": vat_account.root_type,
            "account_type": vat_account.account_type,
            "is_group": 0,
        })
        new_account.insert(ignore_permissions=True)
        frappe.db.commit()
        return new_account.name
    
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
def get_purchase_receipts(purchase_order):
    prs = frappe.get_all(
        "Purchase Receipt",
        filters={"purchase_order": purchase_order},
        fields=["name", "posting_date", "status"]
    )

    result = []
    for pr in prs:
        doc = frappe.get_doc("Purchase Receipt", pr.name)
        result.append({
            "name": doc.name,
            "items": [
                {
                    "item_code": i.item_code,
                    "item_name": i.item_name,
                    "qty": i.received_qty,
                    "received_qty": i.received_qty,
                    "rejected_qty": i.rejected_qty,
                    "uom": i.uom
                }
                for i in doc.items
            ],
            "status": pr.status
        })

    return result
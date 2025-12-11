from frappe.model.document import Document
from frappe.model.naming import make_autoname
from frappe.utils import today, getdate, formatdate
import frappe
import json

class QuotationComparison(Document):
    def autoname(self):
        d = getdate(today())

        dd = formatdate(d, "dd")
        mm = formatdate(d, "mm")
        yy = formatdate(d, "yy")

        series_key = f"SSBG{dd}{mm}{yy}."
        serial = make_autoname(series_key + "###")[-3:]
        self.name = f"SSBG.{dd}.{mm}.{yy}.{serial}"

    def on_update(self):
        if self.items and not self.qa_master:
            for item in self.items:
                records = frappe.db.get_all("Quotation Comparison QA Group", {"item_code": item.item_code}, pluck="specification")
                specs = list(set(records))
                for rec in specs:
                    self.append("qa_master", {"item_code": item.item_code, "specification": rec})

    def update_supplier_item_rate(self):
        for item in self.mapping:
            available_item = frappe.db.get_all("Supplier Item Rate", filters={"item_code": item.item_code, "supplier": item.supplier, "tax": item.tax, "origin": item.origin, "rate": item.rate})
            if available_item:
                continue
            else:
                new_doc = frappe.new_doc("Supplier Item Rate")
                new_doc.item_code = item.item_code
                new_doc.supplier = item.supplier
                new_doc.tax = item.tax
                new_doc.origin = item.origin
                new_doc.rate = item.rate
                new_doc.save(ignore_permissions=True)

        for item in self.material_request:
            new_doc = frappe.get_doc("Material Request", item.material_request)
            new_doc.custom_current_status = "Đã tạo trình duyệt mua hàng"
            new_doc.save(ignore_permissions=True)

@frappe.whitelist()
def get_latest_rate(supplier):
    records = frappe.db.get_all(
        "Supplier Item Rate",
        filters={"supplier": supplier},
        fields=["name", "rate", "item_code", "creation", "tax", "origin"],
        order_by="creation desc"
    )

    latest_by_item = {}
    for rec in records:
        item = rec["item_code"]
        if item not in latest_by_item:
            latest_by_item[item] = rec
        else:
            if rec["creation"] > latest_by_item[item]["creation"]:
                latest_by_item[item] = rec
    return latest_by_item

@frappe.whitelist()
def get_average_rate(supplier, item_code, origin):
    records = frappe.db.get_all(
        "Supplier Item Rate",
        filters={"supplier": supplier, "item_code": item_code, "origin": origin},
        fields=["rate"]
    )
    if not records: return 0
    total = sum(rec.rate for rec in records)
    result = total / len(records)
    return result


@frappe.whitelist()
def save_qa_group(item_code, specification):
    record = frappe.new_doc("Quotation Comparison QA Group")
    record.item_code = item_code
    record.specification = specification
    record.save()

@frappe.whitelist()
def remove_approval(name):
    doc = frappe.get_doc("Quotation Comparison", name)
    doc.recommend_supplier = None
    doc.recommend_reason = None
    doc.save(ignore_permissions=True)
    frappe.db.delete(
        "Purchase Approval",
        filters={"quotation_comparison": name}
    )

@frappe.whitelist()
def get_material_request():
    records = frappe.db.get_all(
        "Material Request",
        filters={
            "workflow_state": "Duyệt xong",
            "custom_current_status": ["in", ["", None]],
            "docstatus": "1",
        },
        fields=["name", "custom_request_type"],
        order_by="custom_request_type asc, name asc"
    )

    grouped = {}
    for r in records:
        key = r.custom_request_type or "Khác"
        grouped.setdefault(key, []).append({"name": r.name})

    return [
        { "request_type": req_type, "items": items }
        for req_type, items in grouped.items()
    ]

@frappe.whitelist()
def add_request(names, comparison):
    if isinstance(names, str): names = json.loads(names)
    item_totals = {}
    item_dates = {}
    comparison_doc = frappe.get_doc("Quotation Comparison", comparison)
    comparison_doc.items = []
    comparison_doc.supplier = []
    comparison_doc.specification = []
    comparison_doc.mapping = []
    comparison_doc.qa_master = []
    comparison_doc.recommend_supplier = None
    comparison_doc.recommend_reason = None
    if comparison_doc.material_request:
        for mr in comparison_doc.material_request:
            mr = frappe.get_doc("Material Request", mr.material_request)
            if mr.workflow_state == "Duyệt xong":
                mr.custom_current_status = ""
                mr.save()
        comparison_doc.material_request = []
    
    for mr_name in names:
        mr = frappe.get_doc("Material Request", mr_name)
        mr.custom_current_status = "Đã tạo báo giá"
        mr.save()
        comparison_doc.append("material_request", {"material_request": mr_name})

        for row in mr.items:
            code = row.item_code
            qty = row.qty or 0

            if code:
                item_totals[code] = item_totals.get(code, 0) + qty

                if getattr(row, "custom_required_date", None):
                    existing_date = item_dates.get(code)
                    if not existing_date or row.custom_required_date < existing_date:
                        item_dates[code] = row.custom_required_date

    for code, total_qty in item_totals.items():
        delivery_date = item_dates.get(code)
        comparison_doc.append("items", {
            "item_code": code,
            "qty": total_qty,
            "delivery_date": delivery_date
        })

    if comparison_doc.items and not comparison_doc.qa_master:
        for item in comparison_doc.items:
            records = frappe.db.get_all("Quotation Comparison QA Group", {"item_code": item.item_code}, pluck="specification")
            specs = list(set(records))
            for rec in specs:
                comparison_doc.append("qa_master", {"item_code": item.item_code, "specification": rec})
    
    comparison_doc.save(ignore_permissions=True)      


            

            
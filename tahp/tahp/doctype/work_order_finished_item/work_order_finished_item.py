# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document
import frappe
from frappe.utils import now_datetime
from frappe.model.mapper import get_mapped_doc


class WorkOrderFinishedItem(Document):

    def on_update_after_submit(self):
        if self.item_code_new and self.item_code_new != self.item_code:
            frappe.db.set_value("Work Order", self.work_order, "produced_qty", 0)
            self.db_set("posting_date", now_datetime())
            item_doc = frappe.get_doc("Item", self.item_code_new)
            self.db_set("item_name", item_doc.item_name)
            self.db_set("type_posting", "Thành phẩm sau QC")

from erpnext.manufacturing.doctype.work_order.work_order import WorkOrder as ERPWorkOrder, StockOverProductionError
from frappe.query_builder.functions import Sum
from frappe.utils import get_link_to_form, flt, today
from frappe import _
import frappe

class WorkOrder(ERPWorkOrder):
	def autoname(self):
		dt = self.planned_start_date if self.planned_start_date else today()
		date_str = frappe.utils.formatdate(dt, "dd.MM.yy")
		prefix = f"WO.{date_str}"
		count = frappe.db.count("Work Order", filters={"name": ["like", f"{prefix}.%"]})
		seq = str(count + 1).zfill(3)
		self.name = f"{prefix}.{seq}"

	def update_status(self, status=None):
		"""Update status of work order if unknown"""
		if status != "Stopped" and status != "Closed":
			status = self.get_status(status)

		if status != self.status:
			self.db_set("status", status)

		self.update_required_items()

		return status

	def get_status(self, status=None):
		"""Return the status based on stock entries against this work order"""
		if not status:
			status = self.status

		if self.docstatus == 0:
			status = "Draft"
		elif self.docstatus == 1:
			if status != "Stopped":
				status = "Not Started"
				if flt(self.material_transferred_for_manufacturing) > 0:
					status = "In Process"

				precision = frappe.get_precision("Work Order", "produced_qty")
				total_qty = flt(self.produced_qty, precision) + flt(self.process_loss_qty, precision)
				if flt(total_qty, precision):
					status = "Completed"
		else:
			status = "Cancelled"

		return status
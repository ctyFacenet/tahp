from erpnext.manufacturing.doctype.work_order.work_order import WorkOrder as ERPWorkOrder, StockOverProductionError
from frappe.query_builder.functions import Sum
from frappe.utils import get_link_to_form, flt, today
from frappe import _
import frappe

class WorkOrder(ERPWorkOrder):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from erpnext.manufacturing.doctype.work_order_item.work_order_item import WorkOrderItem
		from erpnext.manufacturing.doctype.work_order_operation.work_order_operation import WorkOrderOperation
		from frappe.types import DF

		actual_end_date: DF.Datetime | None
		actual_operating_cost: DF.Currency
		actual_start_date: DF.Datetime | None
		additional_operating_cost: DF.Currency
		allow_alternative_item: DF.Check
		amended_from: DF.Link | None
		batch_size: DF.Float
		bom_no: DF.Link
		company: DF.Link
		corrective_operation_cost: DF.Currency
		description: DF.SmallText | None
		disassembled_qty: DF.Float
		expected_delivery_date: DF.Date | None
		fg_warehouse: DF.Link
		from_wip_warehouse: DF.Check
		has_batch_no: DF.Check
		has_serial_no: DF.Check
		image: DF.AttachImage | None
		item_name: DF.Data | None
		lead_time: DF.Float
		material_request: DF.Link | None
		material_request_item: DF.Data | None
		material_transferred_for_manufacturing: DF.Float
		naming_series: DF.Literal["MFG-WO-.YYYY.-"]
		operations: DF.Table[WorkOrderOperation]
		planned_end_date: DF.Datetime | None
		planned_operating_cost: DF.Currency
		planned_start_date: DF.Datetime
		process_loss_qty: DF.Float
		produced_qty: DF.Float
		product_bundle_item: DF.Link | None
		production_item: DF.Link
		production_plan: DF.Link | None
		production_plan_item: DF.Data | None
		production_plan_sub_assembly_item: DF.Data | None
		project: DF.Link | None
		qty: DF.Float
		required_items: DF.Table[WorkOrderItem]
		sales_order: DF.Link | None
		sales_order_item: DF.Data | None
		scrap_warehouse: DF.Link | None
		skip_transfer: DF.Check
		source_warehouse: DF.Link | None
		status: DF.Literal["", "Draft", "Submitted", "Not Started", "In Process", "Completed", "Stopped", "Closed", "Cancelled"]
		stock_uom: DF.Link | None
		total_operating_cost: DF.Currency
		transfer_material_against: DF.Literal["", "Work Order", "Job Card"]
		update_consumed_material_cost_in_project: DF.Check
		use_multi_level_bom: DF.Check
		wip_warehouse: DF.Link | None
	# end: auto-generated types
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
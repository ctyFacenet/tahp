import frappe
from erpnext.manufacturing.doctype.job_card.job_card import JobCard as ERPJobCard
from frappe.utils import get_datetime, time_diff_in_hours, flt

class JobCard(ERPJobCard):
	def update_status_in_workstation(self, status):
		if not self.workstation:
			return
		ws_doc = frappe.get_doc('Workstation', self.workstation)
		if ws_doc.status in ["Problem", "Maintenence"]:
			return
		frappe.db.set_value("Workstation", self.workstation, "status", status)

	def validate_time_logs(self):
		self.total_time_in_mins = 0.0
		self.total_completed_qty = 0.0

		if self.get("time_logs"):
			for d in self.get("time_logs"):
				if d.to_time and get_datetime(d.from_time) > get_datetime(d.to_time):
					frappe.throw(("Row {0}: From time must be less than to time").format(d.idx))

				if d.from_time and d.to_time:
					d.time_in_mins = time_diff_in_hours(d.to_time, d.from_time) * 60
					self.total_time_in_mins += d.time_in_mins

				if d.completed_qty and not self.sub_operations:
					self.total_completed_qty += d.completed_qty

			self.total_completed_qty = flt(self.total_completed_qty, self.precision("total_completed_qty"))

		for row in self.sub_operations:
			self.total_completed_qty += row.completed_qty

	def validate_produced_quantity(self, for_quantity, process_loss_qty, wo):
		if self.docstatus < 2:
			return
		return
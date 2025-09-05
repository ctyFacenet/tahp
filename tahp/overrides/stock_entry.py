from erpnext.stock.doctype.stock_entry.stock_entry import StockEntry as ERPStockEntry
from erpnext.stock.doctype.stock_entry.stock_entry import OperationsNotCompleteError
from frappe.utils import get_link_to_form, flt
import frappe

class StockEntry(ERPStockEntry):

	def check_if_operations_completed(self):
		"""Check if Time Sheets are completed against before manufacturing to capture operating costs."""
		return True
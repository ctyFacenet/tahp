# Copyright (c) 2025, FaceNet and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class Shift(Document):
    def autoname(self):
        if self.category:
            self.name = f"{self.shift_name} - {self.category}"
        else:
            self.name = self.shift_name
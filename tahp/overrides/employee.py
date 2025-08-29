from erpnext.setup.doctype.employee.employee import Employee as ERPEmployee
from frappe.permissions import ( add_user_permission, has_permission, remove_user_permission)
import frappe

class Employee(ERPEmployee):
    def autoname(self):
        if self.employee_number:
            self.name = self.employee_number
        self.employee = self.name
    
    def set_employee_name(self):
        self.employee_name = " ".join(
            filter(lambda x: x, [self.last_name, self.middle_name, self.first_name])
        )

    def update_user_permissions(self):
        if not self.has_value_changed("user_id") and not self.has_value_changed("create_user_permission"):
            return

        if not has_permission("User Permission", ptype="write", raise_exception=False):
            return

        # Employee permission
        employee_permission_exists = frappe.db.exists(
            "User Permission", {"allow": "Employee", "for_value": self.name, "user": self.user_id}
        )

        if employee_permission_exists and not self.create_user_permission:
            remove_user_permission("Employee", self.name, self.user_id)
        elif not employee_permission_exists and self.create_user_permission:
            add_user_permission("Employee", self.name, self.user_id)

        # Company permission
        company_permission_exists = frappe.db.exists(
            "User Permission", {"allow": "Company", "for_value": self.company, "user": self.user_id}
        )

        if company_permission_exists and not self.create_user_permission:
            remove_user_permission("Company", self.company, self.user_id)
        elif not company_permission_exists and self.create_user_permission:
            add_user_permission("Company", self.company, self.user_id)

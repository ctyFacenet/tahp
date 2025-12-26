import frappe
from frappe import _
from erpnext.setup.doctype.department.department import Department

class CustomDepartment(Department):
    def after_insert(self):
        self.create_cost_center()
        
    def create_cost_center(self):
        """
        Create cost center with rules:
        - Fill department_name with cost_center_name
        - Fill parent cost center with the cost center has name similar to the company 
        """
        try:
            # Find parent cost center
            parent_cost_center = self.find_parent_cost_center()

            if not parent_cost_center:
                frappe.throw(
                    _("Can't find Cost Center '{0}'").format(self.company)
                )
            
            # Check if cost center exist ?
            existing = frappe.db.exists("Cost Center", {
                "cost_center_name": self.department_name,
                "company": self.company
            })

            if existing:
                frappe.msgprint(
                    _("Cost Center '{0}' exist").format(existing),
                    indicator="orange",
                    alert=True
                )
                return
            
            # Creaete new cost center
            cost_center = frappe.get_doc({
                "doctype": "Cost Center",
                "cost_center_name": self.department_name,
                "parent_cost_center": parent_cost_center,
                "company": self.company,
                "is_group": 0,
                "disabled": 0
            })

            cost_center.insert(ignore_permissions=True)
            frappe.db.commit()

            # Print noti message
            frappe.msgprint(
                _("Cost Center <b>{0}</b> is created with parent <b>{1}</b>").format(
                    cost_center.name, 
                    parent_cost_center
                ),
                indicator="green",
                alert=True
            )

        except Exception as e:
            frappe.log_error(
                message=frappe.get_traceback(), 
                title=f"Error: Create Cost Center for Department {self.name}"
            )
            frappe.throw(_("Can't create Cost Center: {0}").format(str(e)))
            

    def find_parent_cost_center(self):
        """
        Ex: Company = "TAHP" -> cost center name contain TAHP
        """

        cost_centers = frappe.get_all(
            "Cost Center",
            filters={
                "company": self.company,
                # Parent cost center must be group
                "is_group": 1,  
                "disabled": 0
            },
            fields=["name", "cost_center_name"],
            order_by="creation asc"
        )

        company_lower = self.company.lower()

        for cc in cost_centers:
            if company_lower in cc.cost_center_name.lower():
                return cc.name
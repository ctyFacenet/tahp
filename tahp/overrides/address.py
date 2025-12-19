from erpnext.accounts.custom.address import ERPNextAddress

class Address(ERPNextAddress):
    def autoname(self):
        self.name = self.address_title
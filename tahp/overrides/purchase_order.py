from erpnext.buying.doctype.purchase_order.purchase_order import PurchaseOrder as ERPNextPurchaseOrder

class PurchaseOrder(ERPNextPurchaseOrder):
    @property
    def custom_total_row(self):
        if self.taxes:
            for tax in self.taxes:
                if tax.description == "total":
                    return tax.total
        return self.total
                
    @property
    def custom_discounted(self):
        if self.taxes:
            for tax in self.taxes:
                if tax.description == "discount":
                    return tax.tax_amount
                
    @property
    def custom_delivery_amount(self):
        if self.taxes:
            for tax in self.taxes:
                if tax.description == "shipping":
                    return tax.tax_amount
                
    @property
    def custom_vat(self):
        if self.taxes:
            for tax in self.taxes:
                if tax.description == "grand_total":
                    return tax.rate

    @property
    def custom_vat_amount(self):
        if self.taxes:
            for tax in self.taxes:
                if tax.description == "grand_total":
                    return tax.tax_amount

    @property
    def custom_total_amount(self):
        if self.taxes:
            total = 0
            for tax in self.taxes:
                if tax.description:
                    total = tax.total
            return total
        return self.grand_total              
frappe.ui.form.on("Work Order Finished Item", {
    refresh: function(frm) {
        if (!frm.doc.item_code) return;

        frappe.db.get_value("Item", frm.doc.item_code, "variant_of")
            .then(r => {
                let variant_of = r.message.variant_of;
                let template = variant_of || frm.doc.item_code;
                if (template) {
                    frm.set_query("item_code_new", function() {
                        return {
                            filters: {
                                variant_of: template
                            }
                        };
                    });
                } else {
                    frm.set_query("item_code_new", null);
                }
            });
    }
});

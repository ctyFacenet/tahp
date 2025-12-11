// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Quotation Comparison", {
    refresh: async function(frm) {
        frm.set_intro("")
        const $wrapper = $(frm.fields_dict.wrapper.wrapper);
        $wrapper.empty();
        const component = new tahp.ui.QuotationComparisonComponent({wrapper: $wrapper, frm: frm})

        if (frm.doc.recommend_supplier) {
            frm.add_custom_button("Rút trình duyệt mua hàng", async () => {
                frappe.confirm(
                    "Bạn có chắc muốn rút trình duyệt mua hàng không?",
                    async () => {
                        // Nếu đồng ý
                        await frappe.xcall("tahp.pms.doctype.quotation_comparison.quotation_comparison.remove_approval", {
                            name: frm.doc.name
                        });
                    },
                    () => {}
                );
            });
        }
    },
});

// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Purchase Approval", {
	refresh(frm) {
        frm.set_intro("")
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button("Tạo đơn đặt hàng", async () => {
                let res = await frappe.xcall("tahp.pms.doctype.purchase_approval.purchase_approval.generate_purchase_order", {"docname": frm.doc.name})
                frappe.set_route("Form", "Purchase Order", res)
            })
        }
        change_quantity(frm)
	},

    before_save(frm) {
    },

    after_workflow_action: async function(frm) {
        if (frm.doc.workflow_state === "Đợi GĐ duyệt") {
            await frappe.call({
                method: "tahp.tahp.doctype.custom_planner.custom_planner.wwo_notify",
                args: {
                    role: "Giám đốc",
                    subject: `Kinh doanh thương mại đã tạo trình duyệt mua hàng mới. Mã: ${frm.doc.name}`,
                    document_type: "Purchase Approval",
                    document_name: frm.doc.name
                }
            });
            await frappe.call({
                method: "tahp.tahp.doctype.custom_planner.custom_planner.wwo_notify",
                args: {
                    role: "Accounts Manager",
                    subject: `Kinh doanh thương mại đã tạo trình duyệt mua hàng mới. Mã: ${frm.doc.name}`,
                    document_type: "Purchase Approval",
                    document_name: frm.doc.name
                }
            });
        }
    },

    discount_amount: function(frm) {
        change_quantity(frm)
    },

    vat: function(frm) {
        change_quantity(frm)
    },

    delivery_amount: function(frm) {
        change_quantity(frm)
    },
});

frappe.ui.form.on("Purchase Approval Item", {
    item_code: async function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code || !frm.doc.supplier) return;
        if (row.brand) frappe.model.set_value(cdt, cdn, "brand", null);
        frappe.model.set_value(cdt, cdn, "rate", 0);
        frappe.model.set_value(cdt, cdn, "average_rate", 0);

        const res = await frappe.xcall(
            "tahp.pms.doctype.purchase_approval.purchase_approval.get_rate",
            {
                item_code: row.item_code,
                supplier: frm.doc.supplier,
                brand: row.brand || null
            }
        );

        if (!res) return;

        if (res.latest_rate != null) {
            frappe.model.set_value(cdt, cdn, "rate", res.latest_rate);
        }

        if (res.avg_rate != null) {
            frappe.model.set_value(cdt, cdn, "average_rate", res.avg_rate);
        }

        if (!row.brand && res.brand) {
            frappe.model.set_value(cdt, cdn, "brand", res.brand);
        }
        change_quantity(frm)
    },

    total: function(frm, cdt, cdn) {
        change_quantity(frm)
    },

    tax: function(frm, cdt, cdn) {
        change_quantity(frm)
    },

    rate: function(frm, cdt, cdn) {
        change_quantity(frm)
    },

    actual_qty: function(frm, cdt, cdn) {
        change_quantity(frm)
    },
});

function change_quantity(frm) {
    let total_row = 0
    frm.doc.items.forEach(row => {
        const qty = row.actual_qty || 0;
        const rate = row.rate || 0;
        const tax = row.tax || 0;
        const row_total = qty * rate * (1 + tax / 100);
        total_row = total_row + row_total
        frappe.model.set_value(row.doctype, row.name, "total", row_total)
    })
    frm.set_value("total_row", total_row)
    if (frm.doc.discount_amount) total_row = total_row - (frm.doc.discount_amount || 0)
    if (frm.doc.delivery_amount) total_row = total_row + (frm.doc.delivery_amount || 0)
    if (frm.doc.vat) {
        let vat_amount = (total_row / 100) * (frm.doc.vat || 0)
        total_row = total_row + vat_amount
        frm.set_value("vat_amount", vat_amount)
    }
    frm.set_value("total_amount", total_row)
}


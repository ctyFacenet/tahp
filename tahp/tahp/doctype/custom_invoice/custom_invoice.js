// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Custom Invoice", {
	refresh(frm) {
        frm.set_intro("");
        frm.fields_dict.items.grid.get_field("item_code").get_query = function(doc, cdt, cdn) {
            return {
                filters: {
                    has_variants: 0,
                    disabled: 0
                }
            };
        };        
	},
});

frappe.ui.form.on("Custom Invoice Item", {
    items_add(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (frm.doc.items.length > 1) {
            let last_row = frm.doc.items[frm.doc.items.length - 2];
            if (last_row.tax_rate) row.tax_rate = last_row.tax_rate;
            frm.refresh_field("items");
        }
    },
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn]
        if (!row.qty) row.qty = 1
        if (!row.rate) row.rate = 0
        calculate_amounts(frm, cdt, cdn);
    },
    rate(frm, cdt, cdn) {
        calculate_amounts(frm, cdt, cdn);
    },
    tax_rate(frm, cdt, cdn) {
        calculate_amounts(frm, cdt, cdn);
    },
    qty(frm, cdt, cdn) {
        calculate_amounts(frm, cdt, cdn);
    }
})

function calculate_amounts(frm, cdt, cdn) {
    let row = locals[cdt][cdn]
    if (row.qty && row.rate) {
        row.amount_before_tax = row.qty * row.rate;
    }
    if (row.tax_rate && row.amount_before_tax) {
        row.amount_after_tax = row.amount_before_tax * (1 + row.tax_rate / 100);
    } else if (row.amount_before_tax) {
        row.amount_after_tax = row.amount_before_tax;
    }

    let total_before_tax = 0;
    let total_tax_amount = 0;
    let total_after_tax = 0;
    (frm.doc.items || []).forEach(row => {
        const before = flt(row.amount_before_tax);
        const after = flt(row.amount_after_tax);
        const tax = after - before;

        total_before_tax += before;
        total_tax_amount += tax;
        total_after_tax += after;
    });
    frm.set_value("total_before_tax", total_before_tax);
    frm.set_value("total_tax_amount", total_tax_amount);
    frm.set_value("total_after_tax", total_after_tax);
}

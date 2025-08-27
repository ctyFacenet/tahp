frappe.ui.form.on('Work Order', {
    refresh: async function(frm) {
        await toggle_qc_tracking(frm);
        frm.set_intro("");
    },
    custom_is_qc_tracked: async function(frm) {
        await toggle_qc_tracking(frm);
    },
    production_item: async function(frm) {
    }
});

frappe.ui.form.on('Work Order Operation', {
    operation: async function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!frm.doc.bom_no || !row.operation) return;
        let bom = await frappe.db.get_doc('BOM', frm.doc.bom_no);
        let bom_op = (bom.operations || []).find(op => op.operation === row.operation);
        if (bom_op) {
            frappe.model.set_value(cdt, cdn, 'workstation', bom_op.workstation);
            frappe.model.set_value(cdt, cdn, 'sequence_id', bom_op.idx); // idx chính là thứ tự
        }
    }
})

async function toggle_qc_tracking(frm) {
    if (!frm.doc.custom_is_qc_tracked) {
        frm.fields_dict.operations.grid.update_docfield_property(
            'custom_is_qc_tracked',
            'read_only',
            1
        );

        (frm.doc.operations || []).forEach(row => {
            frappe.model.set_value(row.doctype, row.name, 'custom_is_qc_tracked', 0);
        });

        frm.refresh_field("operations");
        return;
    }

    for (let row of frm.doc.operations || []) {
        let trackers = await frappe.db.get_list('Operation Tracker', {
            filters: {
                operation: row.operation,
                docstatus: 1
            },
            fields: ["name"],
            order_by: "creation desc",
            limit: 1
        });

        if (trackers.length > 0) {
            frappe.model.set_value(row.doctype, row.name, 'custom_is_qc_tracked', 1);
            frm.fields_dict.operations.grid.update_docfield_property(
                'custom_is_qc_tracked',
                'read_only',
                0
            );
        } else {
            frappe.model.set_value(row.doctype, row.name, 'custom_is_qc_tracked', 0);
            frm.fields_dict.operations.grid.update_docfield_property(
                'custom_is_qc_tracked',
                'read_only',
                1
            );
        }
    }
    frm.refresh_field("operations");
}

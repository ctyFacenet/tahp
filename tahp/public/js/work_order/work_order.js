frappe.ui.form.on('Work Order', {
    refresh: async function(frm) {
        frm.set_intro("");
        await toggle_qc_tracking(frm);
        await finish_button(frm);
    },
    custom_is_qc_tracked: async function(frm) {
        await toggle_qc_tracking(frm);
    },
    production_item: async function(frm) {
        await autofill_items(frm);
    },
});

frappe.ui.form.on('Work Order Operation', {
    operation: async function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        // if (!frm.doc.bom_no || !row.operation) return;
        // let bom = await frappe.db.get_doc('BOM', frm.doc.bom_no);
        // let bom_op = (bom.operations || []).find(op => op.operation === row.operation);
        // if (bom_op) {
        //     frappe.model.set_value(cdt, cdn, 'workstation', bom_op.workstation);
        //     frappe.model.set_value(cdt, cdn, 'sequence_id', bom_op.idx);
        // }

        if (!row.operation) return;
        let operation_doc = await frappe.db.get_doc("Operation", row.operation)
        if (operation_doc) {
            frappe.model.set_value(cdt, cdn, 'workstation', operation_doc.workstation);
            frappe.model.set_value(cdt, cdn, 'sequence_id', 1);
            if (operation_doc.custom_team && operation_doc.custom_team.length === 1) {
                frappe.model.set_value(cdt, cdn, 'custom_employee', operation_doc.custom_team[0].employee);
            }
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

async function finish_button(frm) {
    if (frm.is_new() || frm.doc.docstatus != 1) return;
    frm.remove_custom_button("Finish");
    const response = await frappe.call({method: "tahp.doc_events.work_order.before_submit.check_status", args: {work_order: frm.doc.name}})
    if (response.message) {
        frm.add_custom_button(__('Hoàn thành'), async function () {

        }).addClass('btn-primary')
    }
}

async function autofill_items(frm) {
    setTimeout(async () => {
        console.log(frm.doc.operations)
        for (let row of frm.doc.operations) {
            let op_doc = await frappe.db.get_doc("Operation", row.operation);
            if (op_doc.custom_team && op_doc.custom_team.length === 1) {
                frappe.model.set_value(row.doctype, row.name, 'custom_employee', op_doc.custom_team[0].employee);
            }
        }
        frm.refresh_field("operations");
    }, 100);
}
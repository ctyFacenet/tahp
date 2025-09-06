frappe.ui.form.on('Work Order', {
    refresh: async function(frm) {
        await toggle_qc_tracking(frm);
    },
    custom_is_qc_tracked: async function(frm) {
        await toggle_qc_tracking(frm);
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


// call api
frappe.ui.form.on("Work Order", {
    refresh: function(frm) {
        let $wrapper = frm.$wrapper.find('[data-fieldname="custom_warn"]')
            $wrapper.removeClass("w-100 alert alert-warning")
            $wrapper.empty()
        frm.set_intro("");
        if (!frm.is_new() && frm.doc.docstatus === 0) show_shift_handover(frm)
    }
});

function show_shift_handover(frm) {
    console.log('hi1')
    if (frm.doc.custom_plan && frm.doc.custom_plan_code) {
        frappe.call({
                method: "tahp.doc_events.work_order.work_order_api.check_shift_handover",  
            args: {
                work_order: frm.doc.name,
                custom_plan: frm.doc.custom_plan,
                custom_plan_code: frm.doc.custom_plan_code
            },
            callback: function(r) {
                if (r.message && r.message.warning) {
                    // frm.dashboard.add_comment(
                    //     r.message.warning,
                    //     "orange",
                    //     true
                    // );
                    

            let $wrapper = frm.$wrapper.find('[data-fieldname="custom_warn"]')
                $wrapper.addClass("w-100 alert alert-warning")
                $wrapper.empty()
                $wrapper.html(r.message.warning)
            }
                console.log('e')
            }
        });
    }
}
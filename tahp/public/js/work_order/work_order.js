frappe.ui.form.on('Work Order', {
    refresh: async function(frm) {
        frm.set_intro("");
        await finish_button(frm);
        frm.remove_custom_button('Close', 'Status');
        frm.remove_custom_button('Stop', 'Status');
        if (frm.doc.status == "In Process") {
            let job_cards = await frappe.db.get_list("Job Card", {
                filters: { work_order: frm.doc.name, docstatus: ["!=", 2] },
                fields: ["name"]
            });
            if (job_cards.length == frm.doc.operations.length) {
                frm.remove_custom_button("Create Job Card");
            }
        }
    },
    onload: async function(frm) {
        await autofill_items(frm);
    },
    bom_no: async function(frm) {
        await autofill_items(frm);
    }
});

frappe.ui.form.on('Work Order Operation', {
    operation: async function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.operation) return;
        let operation_doc = await frappe.db.get_doc("Operation", row.operation)
        if (operation_doc) {
            frappe.model.set_value(cdt, cdn, 'workstation', operation_doc.workstation);
            frappe.model.set_value(cdt, cdn, 'sequence_id', 1);
            if (operation_doc.custom_team && operation_doc.custom_team.length > 0) {
                frappe.model.set_value(cdt, cdn, 'custom_employee', operation_doc.custom_team[0].employee);
            }
        }
    }
})

async function finish_button(frm) {
    if (frm.is_new() || frm.doc.docstatus != 1 || frm.doc.status == "Completed" ) return;
    frm.remove_custom_button("Finish");
    const response = await frappe.call({method: "tahp.doc_events.work_order.before_submit.check_status", args: {work_order: frm.doc.name}})
    if (response.message) {
        frm.add_custom_button(__('Hoàn thành'), async function () {
            if (typeof response.message === "string") frappe.set_route("Form", "Stock Entry", response.message)
            else {
                const stock_entry = await frappe.xcall("erpnext.manufacturing.doctype.work_order.work_order.make_stock_entry", {
                    work_order_id: frm.doc.name,
                    purpose: "Manufacture",
                    qty: frm.doc.qty
                });
                console.log(stock_entry)
                frappe.model.sync(stock_entry);
                frappe.set_route("Form", stock_entry.doctype, stock_entry.name);
            }
        }).addClass('btn-primary')
    }
}

async function autofill_items(frm) {
    setTimeout(async () => {
        for (let row of frm.doc.operations) {
            let op_doc = await frappe.db.get_doc("Operation", row.operation);
            if (op_doc.custom_team && op_doc.custom_team.length > 0) {
                frappe.model.set_value(row.doctype, row.name, 'custom_employee', op_doc.custom_team[0].employee);
            }
        }
        frm.refresh_field("operations");
    }, 100);
}

// Huy Section
frappe.ui.form.on("Work Order", {
    refresh: async function(frm) {
        frm.set_intro("");
        if (!frm.is_new() && frm.doc.docstatus === 0) show_shift_handover(frm)
    }
});

function show_shift_handover(frm) {
    if (frm.doc.custom_plan && frm.doc.custom_plan_code) {
        frappe.call({ method: "tahp.doc_events.work_order.work_order_api.check_shift_handover",  
            args: { work_order: frm.doc.name, custom_plan: frm.doc.custom_plan, custom_plan_code: frm.doc.custom_plan_code },
            callback: function(r) {
                if (r.message && r.message.warning) { frm.set_intro(""); frm.set_intro(r.message.warning, "orange")}
            }
        });
    }
}
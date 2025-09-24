frappe.ui.form.on("Quality Inspection Reading", {
    reading_1: function(frm, cdt, cdn) {
        console.log("hello world");
        const row = locals[cdt][cdn];

        // Lấy giá trị reading và công thức từ tài liệu chính
        const reading_value = row.reading_1;
        const formula = frm.doc.acceptance_formula;

        if (!reading_value || !formula) {
            frappe.model.set_value(cdt, cdn, "status", "Rejected");
            return;
        }

        frappe.call({
            method: "tahp.doc_events.quality-inpection.before_submit.check_qc_reading",
            args: {
                reading_value: reading_value,
                formula: formula
            },
            callback: function(r) {
                if (r.message) {
                    frappe.model.set_value(cdt, cdn, "status", r.message);
                }
            }
        });
    }
});
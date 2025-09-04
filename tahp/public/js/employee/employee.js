frappe.ui.form.on('Employee', {
    onload(frm) {
        if (frm.is_new() && !frm.doc.employee_number) {
            frm.doc.employee_number = 'TA-'
        }
    }
});
frappe.ui.form.on('Routing', {
    refresh: function(frm) {
        console.log('hello');
    },
    custom_time_is_tracked: function(frm) {
        frm.fields_dict.operations.grid.update_docfield_property('time_in_mins', 'read_only', !frm.doc.custom_time_is_tracked);
    }
});

frappe.ui.form.on('BOM Operation', {
    operation(frm, cdt, cdn) {
        if (!frm.doc.custom_time_is_tracked) {
            console.log('hi')
            let row = locals[cdt][cdn];
            row.time_in_mins = 0.000001;
            frm.refresh_field('operations');
        }
    }
});
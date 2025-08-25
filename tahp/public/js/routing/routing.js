frappe.ui.form.on('Routing', {
    refresh: function(frm) {
        console.log('hello');
    },
    custom_time_is_tracked: function(frm) {
        frm.fields_dict.operations.grid.update_docfield_property('time_in_mins', 'read_only', !frm.doc.custom_time_is_tracked);
    }
});
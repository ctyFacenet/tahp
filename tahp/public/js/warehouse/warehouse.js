frappe.ui.form.on('Warehouse', {
    refresh: function(frm) {
        if (frm.doc.is_group) frm.set_df_property('parent_warehouse', 'read_only', 1);
    },
    is_group: function(frm) {
        frm.set_df_property('parent_warehouse', 'read_only', frm.doc.is_group);
    }
});
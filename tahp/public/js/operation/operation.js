frappe.ui.form.on('Operation', {
    refresh: function(frm) {
        frm.fields_dict.custom_subtasks.grid.get_field('workstation').get_query = function(doc, cdt, cdn) {
            const child = locals[cdt][cdn];
            if (!frm.doc.custom_is_parent) return {};
            return {
                filters: [
                    ['Workstation', 'custom_parent', '=', doc.workstation],
                ]
            };
        };

        frm.fields_dict.custom_configs.grid.get_field('workstation').get_query = function(doc, cdt, cdn) {
            const child = locals[cdt][cdn];
            if (!frm.doc.custom_is_parent) return {};
            return {
                filters: [
                    ['Workstation', 'custom_parent', '=', doc.workstation],
                ]
            };
        };
        allow_workstation(frm);
    },

    workstation: async function(frm) {
        allow_workstation(frm);
    }
});

function allow_workstation(frm) {
        const read_only = frm.doc.custom_is_parent ? false : !frm.doc.custom_is_parent;
        console.log(read_only)
        frm.fields_dict.custom_configs.grid.update_docfield_property('workstation', 'read_only', read_only);
        frm.fields_dict.custom_subtasks.grid.update_docfield_property('workstation', 'read_only', read_only);
}
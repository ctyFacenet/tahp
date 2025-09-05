frappe.ui.form.on('Downtime Reason', {
    refresh(frm) {
        update_group(frm);
    }
});

frappe.ui.form.on('Downtime Reason Item', {
    group_name(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let group = (frm.doc.group || []).find(g => g.group_name === row.group_name);
        if (group) {
            frappe.model.set_value(cdt, cdn, "group_instance", group.name);
        } else {
            frappe.model.set_value(cdt, cdn, "group_instance", "");
        }
    }
});

frappe.ui.form.on('Downtime Reason Group', {
    group_name(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        (frm.doc.items || []).forEach(item => {
            if (item.group_instance === row.name) {
                frappe.model.set_value(item.doctype, item.name, "group_name", row.group_name);
            }
        });
        
        if (row.group_name) {
            let duplicates = (frm.doc.group || []).filter(g =>
                g.group_name === row.group_name && g.name !== row.name
            );

            if (duplicates.length > 0) {
                frappe.msgprint({
                    title: __("Trùng tên nhóm"),
                    message: __("Đã có sẵn nhóm '{0}' trong danh sách", [row.group_name]),
                    indicator: "red"
                });
                frappe.model.set_value(cdt, cdn, "group_name", "");
            }
        }

        update_group(frm);
    },

    group_add(frm) {
        update_group(frm);
    },

    group_remove(frm, cdt, cdn) {
        update_group(frm);
    },

    group_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        let code = row.group_code ? row.group_code.trim() : "";

        if (!code) return;

        let duplicates = (frm.doc.group || []).filter(g =>
            g.name !== row.name && g.group_code === code
        );

        if (duplicates.length > 0) {
            frappe.msgprint({
                title: __("Trùng mã nhóm"),
                message: __("Mã '{0}' đã tồn tại trong nhóm.", [code]),
                indicator: "red"
            });
            frappe.model.set_value(cdt, cdn, "group_code", "");
        }
    },
});

function update_group(frm) {
    let groups = (frm.doc.group || [])
        .map(r => r.group_name)
        .filter(c => c);

    frm.fields_dict.items.grid.update_docfield_property(
        "group_name",
        "options",
        ["\n"].concat(groups)
    );

    (frm.doc.items || []).forEach(item => {
        let group = (frm.doc.group || []).find(g => g.group_name === item.group_name);

        if (group) {
            frappe.model.set_value(item.doctype, item.name, "group_instance", group.name);
        } else {
            frappe.model.set_value(item.doctype, item.name, "group_instance", "");
            frappe.model.set_value(item.doctype, item.name, "group_name", "");
        }
    });
}
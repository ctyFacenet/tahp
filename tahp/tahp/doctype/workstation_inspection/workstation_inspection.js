// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Workstation Inspection", {
    onload(frm) {
        clean_table(frm)
    },
    refresh(frm) {
        frm.fields_dict.workstations.df.only_select = 1;
        frm.fields_dict.workstations.get_query = function(doc) {
            return {
                query: "tahp.tahp.doctype.workstation_inspection.workstation_inspection.workstation_query"
            }
        }
        frm.trigger("workstations");
        clean_table(frm)
    },
    workstations: async function (frm) {
        const selected = frm.doc.workstations || [];
        const existing = frm.doc.items.map(d => d.workstation);
        for (const ws of selected) {
            if (existing.includes(ws.workstation)) continue;
            const ws_doc = await frappe.db.get_doc("Workstation", ws.workstation);
            let status = null
            if (!ws_doc.custom_is_parent) status = ws_doc.status == "Problem" ? "Hỏng": "Bình thường"
            frm.add_child("items", { workstation: ws_doc.name, heading: 1, status: status});
            if (ws_doc.custom_is_parent) {
                const children = await frappe.db.get_list("Workstation", {
                    fields: ["name", "status"],
                    filters: { custom_parent: ws.workstation }
                });
                for (const ch of children) {
                    frm.add_child("items", { workstation: ch.name, status: ch.status == "Problem" ? "Hỏng": "Bình thường"});
                }
            }
        }

        for (let i = frm.doc.items.length - 1; i >= 0; i--) {
            const row = frm.doc.items[i];
            const ws_name = row.workstation.replace(/<b>|<\/b>/g, "");
            const is_heading = row.heading;

            if (is_heading && !selected.some(s => s.workstation === ws_name)) {
                // Xóa luôn heading + children cho tới heading kế tiếp
                frm.doc.items.splice(i, 1);
                while (i < frm.doc.items.length && !frm.doc.items[i].heading) {
                    frm.doc.items.splice(i, 1);
                }
            }
        }
        frm.refresh_field('items')
        clean_table(frm)
    },
});

function clean_table(frm, field) {
    frm.set_df_property('items', 'in_place_edit', true);
    frm.set_df_property('items', 'cannot_add_rows', true);
    field = frm.fields_dict.items
    const $wrapper = field.$wrapper;

    $wrapper.find('.grid-body .data-row.row').each(function() {
        const $lastCol = $(this).find('.grid-static-col').last();
        $lastCol.removeClass(function(index, className) {
            return (className.match(/col-xs-\d+/g) || []).join(' ');
        });
    });

    const rows = frm.fields_dict.items.grid.grid_rows;

    for (let i = 0; i < rows.length; i++) {
        const ws = rows[i];
        const is_heading = ws.doc.heading;

        // Bold cho heading
        const ws_field_idx = ws.docfields.findIndex(f => f.fieldname === 'workstation');
        if (ws_field_idx !== -1) {
            ws.docfields[ws_field_idx].bold = is_heading ? 1 : 0;
        }

        // Read-only cho status: chỉ read-only nếu là heading và có con ngay sau
        const status_field_idx = ws.docfields.findIndex(f => f.fieldname === 'status');
        if (status_field_idx !== -1) {
            const next_row = i + 1 < rows.length ? rows[i + 1] : null;
            const next_is_not_heading = next_row ? !next_row.doc.heading : false;
            ws.docfields[status_field_idx].read_only = is_heading && next_is_not_heading ? 1 : 0;
        }

        ws.grid.refresh();
    }

    $wrapper.find('.row-check').hide();
    $wrapper.find('.row-index').hide();
    $wrapper.find('.grid-heading-row .data-row.row .grid-static-col').last().remove();
}

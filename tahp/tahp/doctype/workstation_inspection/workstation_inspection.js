// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Workstation Inspection", {
    onload(frm) {
        clean_table(frm)
    },
    refresh(frm) {
        frm.fields_dict.workstations.get_query = function(doc) {
            return {
                query: "tahp.tahp.doctype.workstation_inspection.workstation_inspection.workstation_query"
            }
        }
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
    }
});

frappe.ui.form.on("Workstation Inspection Item", {
    items_add(frm, cdt, cdn) {
        clean_table(frm)
    },
    items_remove(frm, cdt, cdn) {
        clean_table(frm)
    }
});


function clean_table(frm, field) {
    frm.set_df_property('items', 'in_place_edit', true);
    field = frm.fields_dict.items
    const $wrapper = field.$wrapper;
    $wrapper.find('.row-check').hide();
    $wrapper.find('.row-index').hide();
    $wrapper.find('.grid-heading-row .data-row.row .grid-static-col').last().remove();

    $wrapper.find('.grid-body .data-row.row').each(function() {
        const $lastCol = $(this).find('.grid-static-col').last();
        $lastCol.removeClass(function(index, className) {
            return (className.match(/col-xs-\d+/g) || []).join(' ');
        });
    });

    for (let ws of frm.fields_dict.items.grid.grid_rows) {
        const is_heading = ws.doc.heading;
        if (is_heading) {
            ws.wrapper.find(".grid-static-col[data-fieldname='workstation'] .field-area input, .grid-static-col[data-fieldname='workstation'] .static-area")
                .addClass("bold");
        } else {
            ws.wrapper.find(".grid-static-col[data-fieldname='workstation'] .field-area input, .grid-static-col[data-fieldname='workstation'] .static-area")
                .removeClass("bold");
        }
    }
}

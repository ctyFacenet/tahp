frappe.ui.form.on('BOM', {
    custom_qc_template: async function (frm) {
        await fill_params(frm, "custom_qc_template", "custom_params");
    },
    custom_qc_template_out: async function (frm) {
        await fill_params(frm, "custom_qc_template_out", "custom_params_out");
    },

    refresh: async function(frm) {
        frm.set_intro("");
        frm.fields_dict.items.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_sub_items.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_params.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_params_out.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.operations.grid.wrapper.find('.btn-open-row').hide();
        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(d => {
                control_operation(frm, d.doctype, d.name);
            });
        }
    },

    with_operations: function(frm) {
        frm.set_df_property("fg_based_operating_cost", "hidden", 1);
    },

    custom_category: async function(frm) {
        let selected_cat = frm.doc.custom_category;
        if (!selected_cat) return;

        let doc = await frappe.db.get_doc("Manufacturing Category", frm.doc.custom_category)
        frm.set_value('custom_qc_template', doc.qc_template)
        frm.set_value('custom_qc_template_out', doc.qc_template_out)
    },

    custom_update_category: function(frm) {
        frm.events.update_category(frm);
    },

    update_category: async function(frm) {
        let d = new frappe.ui.Dialog({
            title: `Cập nhật Hệ sản xuất: ${frm.doc.custom_category}`,
            fields: [
                {
                    label: "Mẫu QC đầu vào",
                    fieldname: "qc_template",
                    fieldtype: "Link",
                    options: "Quality Inspection Template"
                },
                {
                    label: "Mẫu QC đầu ra",
                    fieldname: "qc_template_out",
                    fieldtype: "Link",
                    options: "Quality Inspection Template"
                }
            ],
            primary_action_label: "Xác nhận",
            primary_action(values) {
                if (!frm.doc.custom_qc_template) frm.set_value("custom_qc_template", values.qc_template)
                if (!frm.doc.custom_qc_template_out) frm.set_value("custom_qc_template_out", values.qc_template_out);
                frappe.db.set_value("Manufacturing Category",frm.doc.custom_category,{qc_template: values.qc_template, qc_template_out: values.qc_template_out})
                d.hide();
            }
        });

        doc = await frappe.db.get_doc("Manufacturing Category", frm.doc.custom_category)
        d.set_values({
            qc_template: doc.qc_template,
            qc_template_out: doc.qc_template_out
        });

        d.show();        
    },
});

frappe.ui.form.on('BOM Item', {
    item_code: async function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (!row.item_code) {
            frappe.model.set_value(cdt, cdn, "source_warehouse", null);
            return;
        }
        if (row.source_warehouse) return;
        let { message } = await frappe.db.get_value("Item", row.item_code, "item_group");
        if (!message || !message.item_group) return;

        let item_group = message.item_group;
        let group_doc = await frappe.db.get_doc("Item Group", item_group);
        if (group_doc.item_group_defaults && group_doc.item_group_defaults.length > 0) {
            let warehouse = group_doc.item_group_defaults[0].default_warehouse;
            frappe.model.set_value(cdt, cdn, "source_warehouse", warehouse);
        }
    },
    items_add(frm, cdt, cdn) {
        frm.fields_dict.items.grid.wrapper.find('.btn-open-row').hide();
        control_operation(frm, cdt, cdn)
    },
})

function control_operation(frm, cdt, cdn) {
    const row = locals[cdt][cdn];
    const rowWrapper = $(`[data-idx="${row.idx}"]`);
    const approvedField = rowWrapper.find(`[data-fieldname="custom_action"]`);

    // Parse JSON trong custom_operations
    let selectedOps = [];
    try {
        selectedOps = row.custom_operations ? JSON.parse(row.custom_operations) : [];
    } catch (e) {
        selectedOps = [];
    }

    let btnLabel = selectedOps.length > 0
        ? `Đã chọn ${selectedOps.length} công đoạn`
        : "Chọn công đoạn";

    // Render button
    approvedField.html(`
        <button class="btn btn-op btn-sm w-100" value="${row.idx}">
            ${btnLabel}
        </button>
    `);

    approvedField.css({
        'pointer-events': 'none !important',
        'padding': 'var(--grid-padding) !important'
    });
    approvedField.find('.btn').css('pointer-events', 'auto');

    // Click handler mở dialog
    approvedField.find('.btn-op').off('click').on('click', function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (frm.doc.docstatus === 0) {
            let dialog = new frappe.ui.Dialog({
                title: 'Chọn công đoạn muốn theo dõi SL',
                fields: [
                    {
                        fieldname: 'operations',
                        label: 'Công đoạn',
                        fieldtype: 'MultiSelectPills',
                        options: frm.doc.operations.map(r => r.operation),
                        default: selectedOps   // đọc từ JSON
                    }
                ],
                primary_action_label: 'Xác nhận',
                primary_action(values) {
                    // Lưu lại JSON string
                    row.custom_operations = JSON.stringify(values.operations || []);
                    frm.refresh_field("items");

                    // Đánh dấu form dirty
                    frm.dirty();

                    // Cập nhật lại UI button
                    control_operation(frm, cdt, cdn);

                    dialog.hide();
                }
            });

            dialog.show();
        } else {
            let dialog = new frappe.ui.Dialog({
                title: 'Danh sách công đoạn đã chọn',
                fields: [
                    {
                        fieldname: 'ops_html',
                        fieldtype: 'HTML',
                        options: selectedOps.length > 0
                            ? `<ul style="padding-left:16px; margin:0;font-size:15px;">${selectedOps.map(op => `<li>${op}</li>`).join("")}</ul>`
                            : '<p><i>Không có công đoạn nào</i></p>'
                    }
                ]
            });
            dialog.show();            
        }

    });

    // Cho child row tự dãn dòng
    frm.fields_dict["items"].grid.wrapper.find('.grid-row').each(function () {
        const row = $(this);
        row.css({
            "height": "auto",
            "white-space": "normal"
        });
        row.find("div").css({
            "height": "auto",
            "white-space": "normal"
        });
    });
}


frappe.ui.form.on('BOM Sub Items', {
    custom_sub_items_add(frm, cdt, cdn) {
        frm.fields_dict.custom_sub_items.grid.wrapper.find('.btn-open-row').hide();
    }    
})

frappe.ui.form.on('Item Quality Inspection Parameter', {
    custom_params_add(frm, cdt, cdn) {
        frm.fields_dict.custom_params.grid.wrapper.find('.btn-open-row').hide();
    },
    custom_params_out_add(frm, cdt, cdn) {
        frm.fields_dict.custom_params_out.grid.wrapper.find('.btn-open-row').hide();
    },    
})

frappe.ui.form.on('BOM Operation', {
    operations_add(frm, cdt, cdn) {
        frm.fields_dict.operations.grid.wrapper.find('.btn-open-row').hide();
    },
    operation(frm, cdt, cdn) {
        if (frm.doc.doctype !== "BOM") return;
    }
})

async function fill_params(frm, template_field, table_field) {
    frm.clear_table(table_field);
    let template_name = frm.doc[template_field];
    if (template_name) {
        let template = await frappe.db.get_doc('Quality Inspection Template', template_name);

        (template.item_quality_inspection_parameter || []).forEach(param => {
            let row = frm.add_child(table_field);
            row.specification   = param.specification;
            row.min_value       = param.min_value;
            row.max_value       = param.max_value;
            row.custom_advance  = param.custom_advance;
        });
    }

    frm.refresh_field(table_field);
    frm.refresh_field(template_field);
}

erpnext.bom.calculate_total = function (doc) {
    if (cur_frm && cur_frm.doctype !== 'BOM') return;
	var total_cost = flt(doc.operating_cost) + flt(doc.raw_material_cost) - flt(doc.scrap_material_cost);
	var base_total_cost =
		flt(doc.base_operating_cost) + flt(doc.base_raw_material_cost) - flt(doc.base_scrap_material_cost);

	cur_frm.set_value("total_cost", total_cost);
	cur_frm.set_value("base_total_cost", base_total_cost);
};
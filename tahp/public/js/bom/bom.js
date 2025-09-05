frappe.ui.form.on('BOM', {
    custom_qc_template: async function (frm) {
        await fill_params(frm, "custom_qc_template", "custom_params");
    },
    custom_qc_template_out: async function (frm) {
        await fill_params(frm, "custom_qc_template_out", "custom_params_out");
    },

    refresh: async function(frm) {
        console.log('refresh')
        frm.set_df_property('custom_category_materials', 'read_only', 1);
        frm.fields_dict.items.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_sub_items.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_params.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.custom_params_out.grid.wrapper.find('.btn-open-row').hide();
        frm.fields_dict.operations.grid.wrapper.find('.btn-open-row').hide();


        if (frm.doc.docstatus === 0 && !frm.doc.custom_category) {
            const doc = await frappe.call('tahp.tahp.doctype.manufacturing_category.manufacturing_category.get');
            let categories = (doc.message.items || []).map(r => r.category).filter(c => c);
            frm.set_df_property('custom_category', 'options', ["\n"].concat(categories));

            if (frm.doc.custom_category) {
                let row = (doc.message.items || []).find(r => r.category === frm.doc.custom_category);

                if (row) {
                    frm.set_df_property('custom_category_materials', 'read_only', 0);
                    frm.set_value('custom_category_materials', row.materials || '');
                    frm.refresh_field('custom_category_materials');

                    frm.set_value('custom_qc_template', row.qc_template || null);
                    frm.set_value('custom_qc_template_out', row.qc_template_out || null);

                    // Fill lại bảng QC
                    await fill_params(frm, "custom_qc_template", "custom_params");
                    await fill_params(frm, "custom_qc_template_out", "custom_params_out");
                }
            }
        }
    },

    with_operations: function(frm) {
        frm.set_df_property("fg_based_operating_cost", "hidden", 1);
    },

    custom_category: async function(frm) {
        let selected_cat = frm.doc.custom_category;

        // Reset bảng và field trước khi làm gì khác
        frm.set_value('custom_category_materials', '');
        frm.set_df_property('custom_category_materials', 'read_only', 1);

        if (!selected_cat) return;

        // Lấy danh sách category từ server
        const doc = await frappe.call('tahp.tahp.doctype.manufacturing_category.manufacturing_category.get');
        let row = (doc.message.items || []).find(r => r.category === selected_cat);

        if (row) {
            frm.set_df_property('custom_category_materials', 'read_only', 0);
            frm.set_value('custom_category_materials', row.materials || '');
            frm.refresh_field('custom_category_materials');
            
            frm.set_value('custom_qc_template', row.qc_template || null);
            frm.set_value('custom_qc_template_out', row.qc_template_out || null);

        }
    },

    custom_update_category: function(frm) {
        frappe.set_route("Form", "Manufacturing Category", "Manufacturing Category");
    }
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
    }
})

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
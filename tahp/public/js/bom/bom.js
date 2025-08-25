frappe.ui.form.on('BOM', {
    async custom_qc_template(frm) {
        if (!frm.doc.custom_qc_template) {
            frm.clear_table("custom_params");
            frm.refresh_field("custom_params");
            return;
        }

        let template = await frappe.db.get_doc('Quality Inspection Template', frm.doc.custom_qc_template);
        frm.clear_table("custom_params");

        (template.item_quality_inspection_parameter || []).forEach(param => {
            let row = frm.add_child("custom_params");
            row.specification       = param.specification;
            row.custom_left         = param.custom_left;
            row.custom_left_value   = param.custom_left_value;
            row.custom_right        = param.custom_right;
            row.custom_right_value  = param.custom_right_value;
            row.custom_unit         = param.custom_unit;
        });

        frm.refresh_field("custom_params");
    },

    custom_is_templated_filtered: function(frm) {
        frm.set_query("custom_qc_template", () => {
            if (frm.doc.custom_is_templated_filtered) {
                return {
                    filters: {
                        custom_is_for_bom: 1
                    }
                };
            }
            return {};
        });
    },

    refresh: function(frm) {
        frm.set_df_property("routing", "only_select", 1);
    },

    with_operations: function(frm) {
        frm.set_df_property("fg_based_operating_cost", "hidden", 1);
    }
});
frappe.custom_utils_dynamic_filters = function(report, filters, callback) {
    let field_values = {};

    for (let filter of filters) {
        const field = report.page.add_field({
            fieldname: filter.fieldname,
            label: filter.label,
            fieldtype: filter.fieldtype,
            options: filter.options || null,
            default: filter.default || null,
            change: function() {
                const value = field.get_value();
                if (field_values[filter.fieldname] !== value) {
                    field_values[filter.fieldname] = value;
                    report.refresh();
                }
            }
        });

        if (filter.fieldtype === 'Link') {
            field_values[filter.fieldname] = filter.default || '';
        }
    }

    report.filters = Object.values(report.page.fields_dict);
    frappe.query_report.load();
};
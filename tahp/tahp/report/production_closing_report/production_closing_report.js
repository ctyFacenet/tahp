// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Production Closing Report"] = {
    "filters": [
        {
            "fieldname": "from_date",
            "label": __("Từ ngày"),
            "fieldtype": "Date"
        },
        {
            "fieldname": "to_date",
            "label": __("Đến ngày"),
            "fieldtype": "Date"            
        },
        {
            "fieldname": "ca",
            "label": __("Ca"),
            "fieldtype": "Link",
            "options": "Shift",
        }
    ],

    onload: function(report) {
        if (!report.get_filter_value("from_date") && !report.get_filter_value("to_date")) {
            report.refresh();
        }

        const refresh_report_on_change = () => {
            report.refresh();
        };

        report.page.fields_dict.from_date.$input.on('change', refresh_report_on_change);
        report.page.fields_dict.to_date.$input.on('change', refresh_report_on_change);
    }
};

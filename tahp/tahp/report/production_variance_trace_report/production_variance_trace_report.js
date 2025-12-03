// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Production Variance Trace Report"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": __("Từ ngày"),
			"fieldtype": "Date",
			"on_change": function() {
				frappe.query_reports["Production Variance Trace Report"].handle_date_change();
			}
		},
		{
			"fieldname": "to_date",
			"label": __("Đến ngày"),
			"fieldtype": "Date",
			"on_change": function() {
				frappe.query_reports["Production Variance Trace Report"].handle_date_change();
			}
		},
	],

	"onload": function(report) {
		// Track previous filter values for detecting clears
		let previous_values = {
			from_date: report.get_filter_value("from_date"),
			to_date: report.get_filter_value("to_date")
		};

		// Handle filter clearing
		const on_date_cleared_handler = (fieldname) => {
			const new_value = report.page.fields_dict[fieldname]?.get_value();
			const old_value = previous_values[fieldname];

			// Refresh if field was cleared
			if (old_value && !new_value) {
				report.refresh();
			}

			previous_values[fieldname] = new_value;
		};

		// Attach handlers to filter inputs
		if (report.page.fields_dict.from_date?.$input) {
			report.page.fields_dict.from_date.$input.on('change', () => on_date_cleared_handler("from_date"));
		}
		if (report.page.fields_dict.to_date?.$input) {
			report.page.fields_dict.to_date.$input.on('change', () => on_date_cleared_handler("to_date"));
		}
	},

	"handle_date_change": function() {
		// Refresh report when date filter changes
		frappe.query_report.refresh();
	},

	"formatter": function(value, row, column, data, default_formatter) {
		// For HTML columns, return value as-is (don't escape)
		if (column.fieldname == "work_order" && value) {
			return `<strong>${value}</strong>`;
		}

		// For Data columns with HTML content
		if (column.fieldtype === "Data" && value && typeof value === 'string' && value.includes('<')) {
			return value;
		}
		return default_formatter(value, row, column, data);
	}
};

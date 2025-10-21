// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Custom Invoice Allocation Report"] = {
	"filters": [
		{
			"fieldname": "from_date",
			"label": "Từ ngày",
			"fieldtype": "Date"
		},
		{
			"fieldname": "to_date",
			"label": "Đến ngày",
			"fieldtype": "Date"
		},
		{
			"fieldname": "item_code",
			"label": "Mã mặt hàng",
			"fieldtype": "Link",
			"options": "Item"
		},
		{
			"fieldname": "stock_entry",
			"label": "Mã phiếu kho",
			"fieldtype": "Link",
			"options": "Stock Entry"
		},
	],

	formatter: function (value, row, column, data, default_formatter) {
		let formatted_value = default_formatter(value, row, column, data);
		let color = "";
		let url = "";
		let is_link = false;

		const numeric_fields = ["in_qty", "out_qty", "custom_approved_qty"];
		if (numeric_fields.includes(column.fieldname) && value === 0) {
			return "";
		}

		// Xác định màu dựa trên approved qty
		if (data) {
			const approved = data.custom_approved_qty || 0;

			if (approved === 0) {
				color = "red";
			} else if (approved < data.in_qty || approved < data.out_qty) {
				color = "#d6a100"; // vàng dịu, dễ nhìn
			} else if (approved == data.in_qty || approved == data.out_qty) {
				color = "green";
			}
		}

		// Nếu là cột stock_entry
		if (column.fieldname === "stock_entry" && value) {
			url = `/app/stock-entry/${value}`;
			is_link = true;
		}

		// Nếu là cột item_code
		if (column.fieldname === "item_code" && value) {
			url = `/app/item/${value}`;
			is_link = true;
		}

		// Áp dụng format cuối
		if (is_link) {
			formatted_value = `
				<a href="${url}" style="
					font-weight:bold;
					color:${color || '#007bff'};
					text-decoration: underline;
					text-underline-offset: 2px;
				">${value}</a>
			`;
		} else if (color) {
			formatted_value = `
				<span style="font-weight:bold; color:${color};">
					${formatted_value}
				</span>
			`;
		}

		return formatted_value;
	}



};

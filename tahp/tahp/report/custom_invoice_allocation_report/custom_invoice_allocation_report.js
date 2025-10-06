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
		}
	],
	formatter: function (value, row, column, data, default_formatter) {
		let formatted_value = default_formatter(value, row, column, data);

		// Nếu giá trị là số lượng và bằng 0 thì trả về chuỗi rỗng
		if (["in_qty", "out_qty", "custom_approved_qty"].includes(column.fieldname) && value === 0) {
			formatted_value = "";
		}

		// Nếu dòng có custom_approved_qty > 0 → in đậm toàn bộ dòng
		if (data.custom_approved_qty && data.custom_approved_qty > 0) {
			formatted_value = `<span style="font-weight: bold;">${formatted_value}</span>`;
		}

		return formatted_value;
	}
};

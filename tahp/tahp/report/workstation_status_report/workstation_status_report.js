// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Workstation Status Report"] = {
	"filters": [
		{
			"fieldname": "category",
			"label": "Hệ sản xuất",
			"fieldtype": "Link",
			"options": "Manufacturing Category",
		}
	],
	"onload": async function(report) {
		let ws = report.get_filter("category");
		if (ws.value) report.refresh();
		report.charts = [
			{
				content: html,
				html: true,
				options: {
					render: ()=> {
						execute_summary(report)
					}
				}
			}
		]
		execute_summary(report);
	},

	formatter: function (value, row, column, data, default_formatter) {
		value = default_formatter(value, row, column, data);

		if (column.fieldname === "status") {
			let base_style = `
				padding-inline: 10px;
				border-radius: 15px;
				display: inline-block;
				width: 100%;
				height: 100%;
				text-align: center;
				display: flex;
				align-items: center;
				justify-content: center;
			`;

			if (data.status === "Đang chạy") {
				// Thiết bị con
				value = `<span style="${base_style} background-color: #53ff7bff;">${value}</span>`;
			} else if (data.status && data.status.endsWith("Đang chạy")) {
				// Cụm cha (có % Đang chạy)
				value = `<span style="${base_style} color:#28a745; font-weight: bold;">${value}</span>`;
			} else if (data.status === "Tạm dừng") {
				value = `<span style="${base_style} background-color: #ffeeba;">${value}</span>`;
			} else if (["Bảo trì", "Sự cố"].includes(data.status)) {
				value = `<span style="${base_style} background-color: #ff8a8aff;">${value}</span>`;
			} else if (["Đang tắt"].includes(data.status)) {
				value = `<span style="${base_style} background-color: #cacacaff;">${value}</span>`;
			}
		}

		if (column.fieldname === "workstation" && row[0].indent === 0) {
			let base_style = `
				font-weight: bold;
				padding: 2px 8px;
			`;
			value = `<span style="${base_style}">${value}</span>`;
		}

		return value;
	},
	
    get_datatable_options(options) {
        return { ...options, headerBackground: "rgba(205, 222, 238, 1)"};
    }
};

async function execute_summary(report) {
	let filters = {};
	report.filters.forEach(d => {
		filters[d.fieldname] = d.value;
	});
	let response = await frappe.call({
		method: "tahp.tahp.report.workstation_status_report.workstation_status_report.execute_summary",
		args: {filters: filters}
	});
	if (response.message) {
		columns = response.message[0]
		data = response.message[1]

		let html = '<table class="table table-bordered" style="width:100%; border-collapse: collapse;">';
		
		// header
		html += '<thead><tr>';
		columns.forEach(col => {
			html += `<th style="padding:5px; border:1px solid #ddd;">${col.label}</th>`;
		});
		html += '</tr></thead>';

		// body
		html += '<tbody>';
		data.forEach(row => {
			html += '<tr>';
			columns.forEach(col => {
				html += `<td style="padding:5px; border:1px solid #ddd;">${row[col.fieldname] || ""}</td>`;
			});
			html += '</tr>';
		});
		html += '</tbody></table>';
	}
}

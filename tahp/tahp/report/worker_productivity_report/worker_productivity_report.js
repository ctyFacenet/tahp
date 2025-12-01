// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Worker Productivity Report"] = {
	"filters": [
		{
			fieldname: "month",
			fieldtype: "Select",
			label: "Tháng",
			default: "Tất cả",
			options: (() => {
				let opts = ["Tất cả"];
				for (let i = 1; i <= 12; i++) {
					opts.push(`Tháng ${i}`);
				}
				return opts;
			})()
		},
		{
			fieldname: "year",
			fieldtype: "Select",
			label: "Năm",
			default: new Date().getFullYear(),
			options: (() => {
				const currentYear = new Date().getFullYear();
				let opts = [];
				for (let y = 2025; y <= currentYear; y++) {
					opts.push(String(y));
				}
				return opts;
			})()
		},
		{
			fieldname: "view_mode",
			fieldtype: "Select",
			label: "Kiểu xem",
			options: ["Xem theo ngày", "Xem theo LSX Ca"],
			default: "Xem theo LSX Ca"
		}
	],

	onload: function(report) {
		console.log(report)
	},

	formatter: function (value, row, column, data, default_formatter) {
		let formatted = default_formatter(value, row, column, data);

		if (column.fieldname === "total_productivity" || column.fieldname === "employee" || column.fieldname.includes("hidden")) {
			return formatted;
		}

		let hidden_key;
		if (column.fieldname.startsWith("wo_")) {
			const index = column.fieldname.split("_")[1];
			hidden_key = `hidden_wo_${index}`;
		} else if (column.fieldname.startsWith("day_")) {
			const day = column.fieldname.replace("day_", "");
			hidden_key = `hidden_day_${day}`;
		}

		let jc_list = data[hidden_key];

		if (!jc_list || jc_list.trim() === "") {
			return formatted;
		}

		try {
			jc_list = JSON.parse(jc_list.replace(/'/g, '"'));
			if (!Array.isArray(jc_list) || jc_list.length === 0) {
				return formatted;
			}
		} catch (e) {
			return formatted;
		}

		const filter = encodeURIComponent(JSON.stringify(["in", jc_list]));
		const url = `/app/job-card?name=${filter}`;

		return `<a href="${url}" target="_blank">${formatted}</a>`;
	},

    get_datatable_options(options) {
        return { ...options, freezeIndex: 2};
    },
};

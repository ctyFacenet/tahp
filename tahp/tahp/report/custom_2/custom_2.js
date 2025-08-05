// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Custom 2"] = {
	"filters": [

	],
	onload: function(report) {
		console.log("Dữ liệu report:", report.data);
	}
};

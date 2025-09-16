// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Báo cáo chốt sản lượng"] = {
    "filters": [
        {
            "fieldname": "year",
            "label": __("Năm"),
            "fieldtype": "Data",
            "default": frappe.datetime.now_date().split('-')[0],
            "reqd": 1
        },
        {
            "fieldname": "month",
            "label": __("Tháng"),
            "fieldtype": "Select",
            "options": "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n11\n12", // Dropdown
            "default": frappe.datetime.now_date().split('-')[1] // Mặc định là tháng hiện tại
        },
        {
            "fieldname": "ca",
            "label": __("Ca"),
            "fieldtype": "Link",
            "options": "Shift",
        }
    ]
};

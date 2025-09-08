// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Báo cáo chốt sản lượng"] = {
    "filters": [
        {
            "fieldname": "thang_chot_san_luong",
            "label": __("Tháng chốt sản lượng"),
            "fieldtype": "Data",
        },
        {
            "fieldname": "bo_phan_thuc_hien",
            "label": __("Bộ phận thực hiện"),
            "fieldtype": "Link",
            "options": "Department",
        },
        {
            "fieldname": "khoang_thoi_gian",
            "label": __("Khoảng thời gian"),
            "fieldtype": "Select",
            "options": "Ca\nNgày\nTuần\nTháng",
            "default": "Ca", // Default value
        },
        {
            "fieldname": "ma_ca",
            "label": __("Mã ca"),
            "fieldtype": "Link",
            "options": "Shift", // Assuming you have a DocType for shifts
        }
    ]
};

frappe.listview_settings["Work Order Finished Item"] = {
    hide_name_column: true,
    add_fields: ["type_posting"],
    get_indicator(doc) {
        if (doc.type_posting === "Nguyên liệu tiêu hao") {
            return ["Tiêu hao", "red", "type_posting,=,Nguyên liệu tiêu hao"];
        }
        if (doc.type_posting === "Thành phẩm") {
            return ["Thành phẩm", "green"];
        }
        if (doc.type_posting === "Phụ phẩm") {
            return ["Thành phẩm", "orange"];
        }
        if (doc.type_posting === "Thành phẩm sau QC") {
            return ["TP sau QC", "green"];
        }
    }
};

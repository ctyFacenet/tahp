frappe.listview_settings['Student Overview'] = {
    add_fields: ['graduation_status'],
    filters: [],
    hide_name_column: true,

    get_indicator(doc) {
        if (doc.graduation_status === "Đủ điều kiện tốt nghiệp") {
            return [__("Đủ điều kiện tốt nghiệp"), "green", "graduation_status,=,Đủ điều kiện tốt nghiệp"];
        } else {
            return [__("Đang học tập"), "red", "graduation_status,=,Đang học tập"];
        }
    },

    formatters: {
        student_name(val) {
            return val.bold();
        }
    }
};

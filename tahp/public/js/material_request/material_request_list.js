frappe.listview_settings['Material Request'] = {

    has_indicator_for_draft: true,
    hide_name_column: true,

    add_fields: [
        "workflow_state",
        "custom_request_code",
        "custom_request_type",
        "custom_priority",
        "custom_department",
        "custom_request_reason",
        "custom_current_status",
        "custom_total_estimated_amount"
    ],

    get_indicator: function (doc) {
        if (doc.custom_current_status) {

            if (doc.custom_current_status === "Đã tạo báo giá") {
                return ["Đã tạo báo giá", "orange", "custom_current_status,=,Đã tạo báo giá"];

            } else if (doc.custom_current_status === "Đã tạo trình duyệt mua hàng") {
                return ["Đã tạo trình duyệt mua hàng", "green", "custom_current_status,=,Đã tạo trình duyệt mua hàng"];

            } else if (doc.custom_current_status === "Đã tạo đơn hàng") {
                return ["Đã tạo đơn hàng", "blue", "custom_current_status,=,Đã tạo đơn hàng"];

            } else if (doc.custom_current_status === "Đã nhận hàng") {
                return ["Đã nhận hàng", "purple", "custom_current_status,=,Đã nhận hàng"];
            }
        }
    },

    formatters: {

        custom_request_code: function (value) {
            return value || "";
        },

        custom_request_type: function (value) {
            if (value === "Nguyên liệu sản xuất") {
                return `<span class="indicator-pill green" style="font-size: 11px;">${value}</span>`;
            } else if (value === "Vật tư bảo trì") {
                return `<span class="indicator-pill orange" style="font-size: 11px;">${value}</span>`;
            } else if (value === "Vật tư - Khác") {
                return `<span class="indicator-pill gray" style="font-size: 11px;">${value}</span>`;
            } else if (value === "Sửa chữa") {
                return `<span class="indicator-pill purple" style="font-size: 11px;">${value}</span>`;
            }
            return value || "";
        },

        custom_priority: function (value) {
            if (value === "Rất khẩn cấp") {
                return `<span class="indicator-pill red" style="font-size: 11px;">Rất khẩn cấp</span>`;
            } else if (value === "Khẩn cấp") {
                return `<span class="indicator-pill orange" style="font-size: 11px;">Khẩn cấp</span>`;
            } else if (value === "Bình thường") {
                return `<span class="indicator-pill gray" style="font-size: 11px;">Bình thường</span>`;
            }
            return value || "";
        },

        custom_department: function (value) {
            return value || "";
        },

        custom_request_reason: function (value) {
            return value || "";
        },

        custom_total_estimated_amount: function (value) {
            if (value) {
                return `<span style="font-weight: 600; color: #2490ef;">${format_currency(value, frappe.defaults.get_default("currency") || "VND")}</span>`;
            }
            return "";
        }
    }
};

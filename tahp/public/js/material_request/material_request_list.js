frappe.listview_settings['Material Request'] = {
    has_indicator_for_draft: true,
    add_fields: ["workflow_state", "custom_request_code", "custom_request_type", "custom_priority", "custom_department", "custom_request_reason"],
    
    get_indicator: function (doc) {
        const state = doc.workflow_state || "Nháp";
        
        if (doc.docstatus === 0) {
            if (doc.workflow_state === "Nháp" || !doc.workflow_state) {
                return ["Nháp", "gray", `workflow_state,=,Nháp`];
            } else if (doc.workflow_state === "Đợi KHSX duyệt") {
                return ["Đợi KHSX duyệt", "orange", `workflow_state,=,Đợi KHSX duyệt`];
            } else if (doc.workflow_state === "Đợi TPBT duyệt") {
                return ["Đợi TPBT duyệt", "yellow", `workflow_state,=,Đợi TPBT duyệt`];
            } else if (doc.workflow_state === "Đợi thủ kho duyệt") {
                return ["Đợi thủ kho duyệt", "purple", `workflow_state,=,Đợi thủ kho duyệt`];
            } else if (doc.workflow_state === "Chờ GĐ duyệt") {
                return ["Chờ GĐ duyệt", "blue", `workflow_state,=,Chờ GĐ duyệt`];
            }
        } else if (doc.docstatus === 1) {
            if (doc.workflow_state === "Duyệt xong") {
                return ["Duyệt xong", "green", `workflow_state,=,Duyệt xong`];
            } else if (doc.workflow_state === "Đã tạo đơn hàng") {
                return ["Đã tạo đơn hàng", "green", `workflow_state,=,Đã tạo đơn hàng`];
            }
        } else if (doc.docstatus === 2) {
            return ["Đã hủy bỏ", "red", `docstatus,=,2`];
        }
        
    
        return [state, "gray", `workflow_state,=,${state}`];
    },
    
    formatters: {
        custom_request_code: function(value) {
            return value || "";
        },
        custom_request_type: function(value) {
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
        custom_priority: function(value) {
            if (value === "Rất khẩn cấp") {
                return `<span class="indicator-pill red" style="font-size: 11px;">Rất Khẩn cấp</span>`;
            } else if (value === "Khẩn cấp") {
                return `<span class="indicator-pill orange" style="font-size: 11px;">Khẩn cấp</span>`;
            } else if (value === "Bình thường") {
                return `<span class="indicator-pill gray" style="font-size: 11px;">Bình thường</span>`;
            }
            return value || "";
        },
        custom_department: function(value) {
            return value || "";
        },
        custom_request_reason: function(value) {
            return value || "";
        }
    }
};
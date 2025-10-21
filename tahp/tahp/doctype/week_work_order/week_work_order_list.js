frappe.listview_settings['Week Work Order'] = {
    hide_name_column: true,
    has_indicator_for_draft: true,
    add_fields: ["workflow_state", "wo_status"],
    get_indicator: function (doc) {
        const state = doc.workflow_state || "Không xác định";
        const status = doc.wo_status || "";

        // Bản đồ màu cho workflow
        const color_map = {
            "Nháp": "red",
            "Đợi PTCN Duyệt": "orange",
            "Đã được PTCN duyệt": "yellow",
            "Đợi GĐ duyệt": "purple",
            "Duyệt xong": "green",
            "Đã hủy bỏ": "darkgrey"
        };

        // Nếu đã duyệt xong thì hiển thị theo trạng thái thực tế (status)
        if (state === "Duyệt xong") {
            if (status === "In Process") {
                return [__("Đang sản xuất"), "orange", "wo_status,=,In Process"];
            }
            if (status === "Completed") {
                return [__("Hoàn tất sản xuất"), "green", "wo_status,=,Completed"];
            }
        }

        // Còn lại hiển thị theo workflow_state
        const color = color_map[state] || "gray";
        return [__(state), color, `workflow_state,=,${state}`];
    }
};

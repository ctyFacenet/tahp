frappe.listview_settings['Week Work Order'] = {
    hide_name_column: true,
    has_indicator_for_draft: true,
    has_indicator_for_cancelled: true,
    add_fields: ["workflow_state", "wo_status", "docstatus"],
    get_indicator: function (doc) {
        const state = doc.workflow_state || "Không xác định";
        const status = doc.wo_status || "";


        // Bản đồ màu cho workflow
        const color_map = {
            "Nháp": "red",
            "Đợi PTCN Duyệt": "orange",
            "Đã được PTCN duyệt": "orange",
            "Đợi GĐ duyệt": "purple",
            "Duyệt xong": "yellow",
            "Đã hủy bỏ": "gray"
        };

        // Nếu đã duyệt xong thì hiển thị theo trạng thái thực tế (status)
        if (state === "Duyệt xong") {
            if (status === "In Process") {
                return [__("Đang sản xuất"), "blue", "wo_status,=,In Process"];
            }
            if (status === "Completed") {
                return [__("Hoàn tất sản xuất"), "green", "wo_status,=,Completed"];
            }
            if (status === "Stopped") {
                return [__("Đã bị dừng"), "gray", "wo_status,=,Stopped"]
            }
        }

        // Còn lại hiển thị theo workflow_state
        const color = color_map[state] || "gray";
        return [__(state), color, `workflow_state,=,${state}`];
    },
    refresh: function(listview){
        document.querySelectorAll('.list-row .level-right').forEach(function(col){
            col.style.flex = '1';
        })

        listview.page.add_inner_button(
            __("Màn hình lập kế hoạch mới"),
            function() {
                frappe.set_route("List", "Custom Planner");
            }
        )
    }
};

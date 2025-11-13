frappe.listview_settings['Work Order'] = {
    has_indicator_for_draft: true,
    add_fields: ["workflow_state", "status"],
    get_indicator: function (doc) {
        const state = doc.workflow_state || "Nháp";
        const status = doc.tatus || "Nháp";

        if (doc.docstatus === 0) {
            if (doc.workflow_state === "Draft") return ["Nháp", "red", `workflow_state,=,Draft`]
            else if (doc.workflow_state === "Đợi Quản đốc duyệt") return ["Đợi Quản đốc duyệt", "orange", `workflow_state,=,Đợi Quản đốc duyệt`]
            else if (doc.workflow_state === "Duyệt xong") return ["Duyệt xong", "yellow", `workflow_state,=,Duyệt xong`] 
            else if (doc.workflow_state === "Đã bị dừng") return ["Đã bị dừng", "red", `workflow_state,=,Đã bị dừng`]
        } else if (doc.docstatus === 1) {
            if (doc.status === "In Process") return ["Đang sản xuất", "purple", `status,=,In Process`]
            else if (doc.status === "Completed") return ["Hoàn thành", "green", `status,=,Completed`]
        } else {
            return ["Đã hủy bỏ", "red", `docstatus,=,2`]
        }
    },
    refresh: function(listview){
        document.querySelectorAll('.list-row .level-right').forEach(function(col){
            col.style.flex = '1';
        })
    }
};

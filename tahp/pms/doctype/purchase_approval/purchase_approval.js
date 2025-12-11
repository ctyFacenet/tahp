// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.ui.form.on("Purchase Approval", {
	refresh(frm) {
        frm.set_intro("")
        const $wrapper = $(frm.fields_dict.wrapper.wrapper);
        $wrapper.empty();
        const component = new tahp.ui.ReuseableTableComponent({
            wrapper: $wrapper, 
            frm: frm, 
            childTableName: "items", 
            totalFieldName: "total", 
            showIndex: true
        })
	},

    before_save(frm) {
        const items = frm.doc.items || [];

        const missingItems = items
            .filter(row => !row.delivery_date || row.delivery_date.trim() === "")
            .map(row => row.item_name || row.item_code);

        if (missingItems.length > 0) {
            frappe.throw(`
                Tại mặt hàng <strong>${missingItems.join(", ")}</strong>, chưa điền Ngày giao hàng yêu cầu.
            `);
        }
    },

    after_workflow_action: async function(frm) {
        if (frm.doc.workflow_state === "Đợi GĐ duyệt") {
            await frappe.call({
                method: "tahp.tahp.doctype.custom_planner.custom_planner.wwo_notify",
                args: {
                    role: "Giám đốc",
                    subject: `Kinh doanh thương mại đã tạo trình duyệt mua hàng mới. Mã: ${frm.doc.name}`,
                    document_type: "Purchase Approval",
                    document_name: frm.doc.name
                }
            });
            await frappe.call({
                method: "tahp.tahp.doctype.custom_planner.custom_planner.wwo_notify",
                args: {
                    role: "Accounts Manager",
                    subject: `Kinh doanh thương mại đã tạo trình duyệt mua hàng mới. Mã: ${frm.doc.name}`,
                    document_type: "Purchase Approval",
                    document_name: frm.doc.name
                }
            });
        }
    }
});
